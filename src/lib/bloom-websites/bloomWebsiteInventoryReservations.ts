// src/lib/bloom-websites/bloomWebsiteInventoryReservations.ts

import mongoose, { Types } from "mongoose";

import type { ValidatedBloomWebsiteCart } from "@/lib/bloom-websites/validateBloomWebsiteCart";
import { connectToDB } from "@/lib/mongoose";

import BloomWebsiteAddon from "@/models/BloomWebsiteAddon";
import BloomWebsiteCheckoutAttempt from "@/models/BloomWebsiteCheckoutAttempt";
import BloomWebsiteInventoryReservation from "@/models/BloomWebsiteInventoryReservation";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";

const DEFAULT_RESERVATION_MINUTES = 15;
const TERMINAL_RETENTION_DAYS = 30;

type ReservationKind = "product" | "addon";

type RequestedInventoryLine = {
  kind: ReservationKind;
  itemId: string;
  quantity: number;
  name: string;
  sku: string;
};

export type BloomWebsiteInventoryReservationResult = {
  reservationId: string;
  status: "active" | "committed";
  trackedLineCount: number;
  expiresAt: Date;
  existing: boolean;
};

type LeanInventoryDocument = {
  _id: unknown;
  name?: string;
  sku?: string;
  isActive?: boolean;
  soldOut?: boolean;
  inventory?: {
    trackInventory?: boolean;
    quantity?: number;
  };
};

export class BloomWebsiteInventoryReservationError extends Error {
  code: string;
  itemId?: string;
  itemKind?: ReservationKind;

  constructor(
    code: string,
    message: string,
    details?: {
      itemId?: string;
      itemKind?: ReservationKind;
    },
  ) {
    super(message);
    this.name = "BloomWebsiteInventoryReservationError";
    this.code = code;
    this.itemId = details?.itemId;
    this.itemKind = details?.itemKind;
  }
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function objectIdString(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    return value.toString();
  }

  return "";
}

function aggregateRequestedInventory(
  cart: ValidatedBloomWebsiteCart,
): RequestedInventoryLine[] {
  const products = new Map<string, RequestedInventoryLine>();
  const addons = new Map<string, RequestedInventoryLine>();

  for (const item of cart.items) {
    const existingProduct = products.get(item.productId);

    if (existingProduct) {
      existingProduct.quantity += item.quantity;
    } else {
      products.set(item.productId, {
        kind: "product",
        itemId: item.productId,
        quantity: item.quantity,
        name: item.name,
        sku: item.sku,
      });
    }

    for (const addon of item.addons) {
      const existingAddon = addons.get(addon.id);

      if (existingAddon) {
        existingAddon.quantity += addon.quantity;
      } else {
        addons.set(addon.id, {
          kind: "addon",
          itemId: addon.id,
          quantity: addon.quantity,
          name: addon.name,
          sku: addon.sku,
        });
      }
    }
  }

  return [...products.values(), ...addons.values()];
}

function terminalCleanupDate(now = new Date()) {
  return new Date(
    now.getTime() + TERMINAL_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

async function loadTrackedLines({
  requestedLines,
  websiteId,
  shopId,
  session,
}: {
  requestedLines: RequestedInventoryLine[];
  websiteId: string;
  shopId: string;
  session: mongoose.ClientSession;
}) {
  const productLines = requestedLines.filter(
    (line) => line.kind === "product",
  );
  const addonLines = requestedLines.filter((line) => line.kind === "addon");

  const productIds = productLines.map((line) => line.itemId);
  const addonIds = addonLines.map((line) => line.itemId);

  const products = productIds.length
    ? ((await BloomWebsiteProduct.find({
        _id: { $in: productIds },
        website: websiteId,
        shop: shopId,
      })
        .select("_id name sku isActive soldOut inventory")
        .session(session)
        .lean()) as unknown as LeanInventoryDocument[])
    : [];

  const addons = addonIds.length
    ? ((await BloomWebsiteAddon.find({
        _id: { $in: addonIds },
        website: websiteId,
        shop: shopId,
      })
        .select("_id name sku isActive soldOut inventory")
        .session(session)
        .lean()) as unknown as LeanInventoryDocument[])
    : [];

  const productMap = new Map(
    products.map((document) => [objectIdString(document._id), document]),
  );
  const addonMap = new Map(
    addons.map((document) => [objectIdString(document._id), document]),
  );

  const tracked: RequestedInventoryLine[] = [];

  for (const line of requestedLines) {
    const document =
      line.kind === "product"
        ? productMap.get(line.itemId)
        : addonMap.get(line.itemId);

    if (!document) {
      throw new BloomWebsiteInventoryReservationError(
        "INVENTORY_ITEM_NOT_FOUND",
        `${line.name || "An item"} is no longer available.`,
        {
          itemId: line.itemId,
          itemKind: line.kind,
        },
      );
    }

    if (document.isActive === false || document.soldOut === true) {
      throw new BloomWebsiteInventoryReservationError(
        "INVENTORY_ITEM_UNAVAILABLE",
        `${cleanString(document.name) || line.name || "An item"} is no longer available.`,
        {
          itemId: line.itemId,
          itemKind: line.kind,
        },
      );
    }

    if (document.inventory?.trackInventory === true) {
      tracked.push({
        ...line,
        name: cleanString(document.name) || line.name,
        sku: cleanString(document.sku) || line.sku,
      });
    }
  }

  return tracked;
}

async function decrementTrackedLine({
  line,
  websiteId,
  shopId,
  session,
}: {
  line: RequestedInventoryLine;
  websiteId: string;
  shopId: string;
  session: mongoose.ClientSession;
}) {
  const filter = {
    _id: line.itemId,
    website: websiteId,
    shop: shopId,
    isActive: { $ne: false },
    soldOut: { $ne: true },
    "inventory.trackInventory": true,
    "inventory.quantity": { $gte: line.quantity },
  };

  const update = {
    $inc: {
      "inventory.quantity": -line.quantity,
    },
  };

  const result =
    line.kind === "product"
      ? await BloomWebsiteProduct.findOneAndUpdate(filter, update, {
          new: true,
          session,
        })
          .select("_id")
          .lean()
      : await BloomWebsiteAddon.findOneAndUpdate(filter, update, {
          new: true,
          session,
        })
          .select("_id")
          .lean();

  if (!result) {
    throw new BloomWebsiteInventoryReservationError(
      "INSUFFICIENT_INVENTORY",
      `${line.name || "An item"} no longer has enough inventory for this order.`,
      {
        itemId: line.itemId,
        itemKind: line.kind,
      },
    );
  }
}

async function incrementReservationLine({
  line,
  websiteId,
  shopId,
  session,
}: {
  line: {
    kind: ReservationKind;
    item: unknown;
    quantity: number;
  };
  websiteId: string;
  shopId: string;
  session: mongoose.ClientSession;
}) {
  const filter = {
    _id: line.item,
    website: websiteId,
    shop: shopId,
  };

  const update = {
    $inc: {
      "inventory.quantity": line.quantity,
    },
  };

  if (line.kind === "product") {
    await BloomWebsiteProduct.updateOne(filter, update, { session });
  } else {
    await BloomWebsiteAddon.updateOne(filter, update, { session });
  }
}

export async function reserveBloomWebsiteInventory({
  checkoutAttemptId,
  cart,
  reservationMinutes = DEFAULT_RESERVATION_MINUTES,
}: {
  checkoutAttemptId: string;
  cart: ValidatedBloomWebsiteCart;
  reservationMinutes?: number;
}): Promise<BloomWebsiteInventoryReservationResult> {
  await connectToDB();

  if (!Types.ObjectId.isValid(checkoutAttemptId)) {
    throw new BloomWebsiteInventoryReservationError(
      "CHECKOUT_ATTEMPT_INVALID",
      "Checkout attempt could not be found.",
    );
  }

  const minutes = Math.max(
    1,
    Math.min(60, Math.round(Number(reservationMinutes) || 0)),
  );

  const session = await mongoose.startSession();

  try {
    let response: BloomWebsiteInventoryReservationResult | null = null;

    await session.withTransaction(async () => {
      const attempt = await BloomWebsiteCheckoutAttempt.findOne({
        _id: checkoutAttemptId,
        website: cart.websiteId,
        shop: cart.shopId,
      }).session(session);

      if (!attempt) {
        throw new BloomWebsiteInventoryReservationError(
          "CHECKOUT_ATTEMPT_NOT_FOUND",
          "Checkout attempt could not be found.",
        );
      }

      if (
        attempt.status !== "validated" &&
        attempt.status !== "payment_processing" &&
        attempt.status !== "payment_succeeded"
      ) {
        throw new BloomWebsiteInventoryReservationError(
          "CHECKOUT_ATTEMPT_NOT_READY",
          "Checkout must be validated before inventory can be reserved.",
        );
      }

      const existing = await BloomWebsiteInventoryReservation.findOne({
        checkoutAttempt: attempt._id,
      }).session(session);

      if (existing) {
        if (existing.status === "released") {
          throw new BloomWebsiteInventoryReservationError(
            "INVENTORY_RESERVATION_RELEASED",
            "This checkout's inventory reservation has already been released.",
          );
        }

        response = {
          reservationId: String(existing._id),
          status: existing.status,
          trackedLineCount: existing.lines.length,
          expiresAt: existing.expiresAt,
          existing: true,
        };

        return;
      }

      const requestedLines = aggregateRequestedInventory(cart);
      const trackedLines = await loadTrackedLines({
        requestedLines,
        websiteId: cart.websiteId,
        shopId: cart.shopId,
        session,
      });

      for (const line of trackedLines) {
        await decrementTrackedLine({
          line,
          websiteId: cart.websiteId,
          shopId: cart.shopId,
          session,
        });
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + minutes * 60 * 1000);

      const [reservation] = await BloomWebsiteInventoryReservation.create(
        [
          {
            shop: cart.shopId,
            website: cart.websiteId,
            checkoutAttempt: attempt._id,
            attemptId: attempt.attemptId,
            status: "active",
            lines: trackedLines.map((line) => ({
              kind: line.kind,
              item: line.itemId,
              name: line.name,
              sku: line.sku,
              quantity: line.quantity,
            })),
            reservedAt: now,
            expiresAt,
          },
        ],
        { session },
      );

      await BloomWebsiteCheckoutAttempt.updateOne(
        {
          _id: attempt._id,
        },
        {
          $set: {
            "inventory.status": "reserved",
            "inventory.reservation": reservation._id,
            "inventory.reservedAt": now,
            "inventory.committedAt": null,
            "inventory.releasedAt": null,
          },
        },
        { session },
      );

      response = {
        reservationId: String(reservation._id),
        status: "active",
        trackedLineCount: trackedLines.length,
        expiresAt,
        existing: false,
      };
    });

    if (!response) {
      throw new BloomWebsiteInventoryReservationError(
        "INVENTORY_RESERVATION_FAILED",
        "Inventory could not be reserved.",
      );
    }

    return response as BloomWebsiteInventoryReservationResult;
  } finally {
    await session.endSession();
  }
}

export async function releaseBloomWebsiteInventory({
  reservationId,
  reason,
}: {
  reservationId: string;
  reason: string;
}) {
  await connectToDB();

  if (!Types.ObjectId.isValid(reservationId)) {
    return {
      released: false,
      alreadyTerminal: false,
    };
  }

  const session = await mongoose.startSession();

  try {
    let released = false;
    let alreadyTerminal = false;

    await session.withTransaction(async () => {
      const reservation = await BloomWebsiteInventoryReservation.findById(
        reservationId,
      ).session(session);

      if (!reservation) {
        return;
      }

      if (reservation.status !== "active") {
        alreadyTerminal = true;
        return;
      }

      const websiteId = String(reservation.website);
      const shopId = String(reservation.shop);

      for (const line of reservation.lines) {
        await incrementReservationLine({
          line: {
            kind: line.kind as ReservationKind,
            item: line.item,
            quantity: line.quantity,
          },
          websiteId,
          shopId,
          session,
        });
      }

      const now = new Date();

      reservation.status = "released";
      reservation.releasedAt = now;
      reservation.releaseReason = cleanString(reason).slice(0, 500);
      reservation.cleanupAt = terminalCleanupDate(now);
      await reservation.save({ session });

      await BloomWebsiteCheckoutAttempt.updateOne(
        {
          _id: reservation.checkoutAttempt,
        },
        {
          $set: {
            "inventory.status": "released",
            "inventory.releasedAt": now,
          },
        },
        { session },
      );

      released = true;
    });

    return {
      released,
      alreadyTerminal,
    };
  } finally {
    await session.endSession();
  }
}

export async function commitBloomWebsiteInventory({
  reservationId,
}: {
  reservationId: string;
}) {
  await connectToDB();

  if (!Types.ObjectId.isValid(reservationId)) {
    throw new BloomWebsiteInventoryReservationError(
      "INVENTORY_RESERVATION_INVALID",
      "Inventory reservation could not be found.",
    );
  }

  const session = await mongoose.startSession();

  try {
    let committed = false;
    let alreadyCommitted = false;

    await session.withTransaction(async () => {
      const reservation = await BloomWebsiteInventoryReservation.findById(
        reservationId,
      ).session(session);

      if (!reservation) {
        throw new BloomWebsiteInventoryReservationError(
          "INVENTORY_RESERVATION_NOT_FOUND",
          "Inventory reservation could not be found.",
        );
      }

      if (reservation.status === "committed") {
        alreadyCommitted = true;
        return;
      }

      if (reservation.status !== "active") {
        throw new BloomWebsiteInventoryReservationError(
          "INVENTORY_RESERVATION_NOT_ACTIVE",
          "Inventory reservation is no longer active.",
        );
      }

      const now = new Date();

      reservation.status = "committed";
      reservation.committedAt = now;
      reservation.cleanupAt = terminalCleanupDate(now);
      await reservation.save({ session });

      await BloomWebsiteCheckoutAttempt.updateOne(
        {
          _id: reservation.checkoutAttempt,
        },
        {
          $set: {
            "inventory.status": "committed",
            "inventory.committedAt": now,
          },
        },
        { session },
      );

      committed = true;
    });

    return {
      committed,
      alreadyCommitted,
    };
  } finally {
    await session.endSession();
  }
}

export async function releaseExpiredBloomWebsiteInventoryReservations({
  limit = 25,
}: {
  limit?: number;
} = {}) {
  await connectToDB();

  const safeLimit = Math.max(1, Math.min(100, Math.round(limit)));

  const expired = (await BloomWebsiteInventoryReservation.find({
    status: "active",
    expiresAt: {
      $lte: new Date(),
    },
  })
    .sort({ expiresAt: 1 })
    .limit(safeLimit)
    .select("_id")
    .lean()) as Array<{ _id: unknown }>;

  let releasedCount = 0;

  for (const reservation of expired) {
    const result = await releaseBloomWebsiteInventory({
      reservationId: objectIdString(reservation._id),
      reason: "Checkout inventory reservation expired before completion.",
    });

    if (result.released) {
      releasedCount += 1;
    }
  }

  return {
    checkedCount: expired.length,
    releasedCount,
  };
}
