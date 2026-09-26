import { randomUUID } from "crypto";

import { connectToDB } from "@/lib/mongoose";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";

export type BloomWebsiteOrderAdjustmentInput = {
  reason?: unknown;
  customer?: {
    firstName?: unknown;
    lastName?: unknown;
    email?: unknown;
    phone?: unknown;
  };
  recipient?: {
    firstName?: unknown;
    lastName?: unknown;
    phone?: unknown;
    company?: unknown;
    deliveryInstructions?: unknown;
  };
  fulfillment?: {
    requestedDate?: unknown;
    window?: {
      type?: unknown;
      from?: unknown;
      to?: unknown;
    };
    deliveryAddress?: {
      address1?: unknown;
      address2?: unknown;
      city?: unknown;
      state?: unknown;
      postalCode?: unknown;
      country?: unknown;
    };
  };
  cardMessage?: unknown;
  floristInternalNote?: unknown;
};

type HistoryChange = {
  field: string;
  label: string;
  beforeValue: unknown;
  afterValue: unknown;
};

export class BloomWebsiteOrderAdjustmentError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 409) {
    super(message);
    this.name = "BloomWebsiteOrderAdjustmentError";
    this.code = code;
    this.status = status;
  }
}

function clean(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanOptional(value: unknown, maxLength: number) {
  if (value === undefined) return undefined;
  return clean(value, maxLength);
}

function valueAt(value: unknown) {
  return value === undefined ? null : value;
}

function addChange(
  changes: HistoryChange[],
  field: string,
  label: string,
  beforeValue: unknown,
  afterValue: unknown,
) {
  const before = valueAt(beforeValue);
  const after = valueAt(afterValue);

  if (JSON.stringify(before) === JSON.stringify(after)) return false;

  changes.push({
    field,
    label,
    beforeValue: before,
    afterValue: after,
  });

  return true;
}

function isValidLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeEmail(value: unknown) {
  const email = clean(value, 320).toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BloomWebsiteOrderAdjustmentError(
      "INVALID_CUSTOMER_EMAIL",
      "Enter a valid customer email address.",
      400,
    );
  }

  return email;
}

export async function updateBloomWebsiteOrderDetails({
  orderId,
  shopId,
  actorLabel,
  input,
}: {
  orderId: string;
  shopId: string;
  actorLabel?: string;
  input: BloomWebsiteOrderAdjustmentInput;
}) {
  await connectToDB();

  const order = await BloomWebsiteOrder.findOne({
    _id: orderId,
    shop: shopId,
  });

  if (!order) {
    throw new BloomWebsiteOrderAdjustmentError(
      "ORDER_NOT_FOUND",
      "BloomWebsite order could not be found.",
      404,
    );
  }

  if (["fulfilled", "canceled"].includes(order.status)) {
    throw new BloomWebsiteOrderAdjustmentError(
      "ORDER_LOCKED",
      "Fulfilled or canceled orders are locked from operational edits.",
      409,
    );
  }

  const runtimeInput = input as Record<string, any>;
  const blockedTopLevelFields = [
    "items",
    "itemCount",
    "totals",
    "tax",
    "payment",
    "refunds",
    "totalRefundedCents",
    "status",
    "cancellation",
  ];

  if (blockedTopLevelFields.some((field) => Object.prototype.hasOwnProperty.call(runtimeInput, field))) {
    throw new BloomWebsiteOrderAdjustmentError(
      "IMMUTABLE_ORDER_FIELD",
      "Paid financial, product, payment, refund, and status fields cannot be rewritten through order adjustments.",
      400,
    );
  }

  const runtimeFulfillment = runtimeInput.fulfillment;
  if (
    runtimeFulfillment &&
    typeof runtimeFulfillment === "object" &&
    (Object.prototype.hasOwnProperty.call(runtimeFulfillment, "type") ||
      Object.prototype.hasOwnProperty.call(runtimeFulfillment, "deliveryFeeCents") ||
      Object.prototype.hasOwnProperty.call(runtimeFulfillment, "pickupLocation"))
  ) {
    throw new BloomWebsiteOrderAdjustmentError(
      "IMMUTABLE_FULFILLMENT_FINANCIAL_FIELD",
      "Fulfillment type, paid delivery charge, and pickup-location snapshot cannot be rewritten through order adjustments.",
      400,
    );
  }

  const reason = clean(input.reason, 1000);
  if (!reason) {
    throw new BloomWebsiteOrderAdjustmentError(
      "ADJUSTMENT_REASON_REQUIRED",
      "Enter a reason for this order change so the history remains useful.",
      400,
    );
  }

  const changes: HistoryChange[] = [];
  let financialReviewRequired = false;

  if (input.customer) {
    const firstName = cleanOptional(input.customer.firstName, 120);
    const lastName = cleanOptional(input.customer.lastName, 120);
    const phone = cleanOptional(input.customer.phone, 50);

    if (firstName !== undefined) {
      if (!firstName) {
        throw new BloomWebsiteOrderAdjustmentError(
          "CUSTOMER_FIRST_NAME_REQUIRED",
          "Customer first name cannot be blank.",
          400,
        );
      }
      if (addChange(changes, "customer.firstName", "Customer first name", order.customer.firstName, firstName)) {
        order.customer.firstName = firstName;
      }
    }

    if (lastName !== undefined) {
      if (!lastName) {
        throw new BloomWebsiteOrderAdjustmentError(
          "CUSTOMER_LAST_NAME_REQUIRED",
          "Customer last name cannot be blank.",
          400,
        );
      }
      if (addChange(changes, "customer.lastName", "Customer last name", order.customer.lastName, lastName)) {
        order.customer.lastName = lastName;
      }
    }

    if (input.customer.email !== undefined) {
      const email = normalizeEmail(input.customer.email);
      if (addChange(changes, "customer.email", "Customer email", order.customer.email, email)) {
        order.customer.email = email;
      }
    }

    if (phone !== undefined && addChange(changes, "customer.phone", "Customer phone", order.customer.phone, phone)) {
      order.customer.phone = phone;
    }
  }

  if (input.recipient) {
    const recipientFields = [
      ["firstName", "Recipient first name", 120],
      ["lastName", "Recipient last name", 120],
      ["phone", "Recipient phone", 50],
      ["company", "Recipient business / company", 160],
      ["deliveryInstructions", "Fulfillment instructions", 1000],
    ] as const;

    for (const [field, label, maxLength] of recipientFields) {
      const next = cleanOptional(input.recipient[field], maxLength);
      if (next === undefined) continue;

      if (
        addChange(
          changes,
          `recipient.${field}`,
          label,
          order.recipient?.[field],
          next,
        )
      ) {
        order.recipient[field] = next;
      }
    }
  }

  if (input.fulfillment?.requestedDate !== undefined) {
    const requestedDate = clean(input.fulfillment.requestedDate, 10);
    if (!isValidLocalDate(requestedDate)) {
      throw new BloomWebsiteOrderAdjustmentError(
        "INVALID_FULFILLMENT_DATE",
        "Fulfillment date must be a valid YYYY-MM-DD date.",
        400,
      );
    }

    if (
      addChange(
        changes,
        "fulfillment.requestedDate",
        "Fulfillment date",
        order.fulfillment.requestedDate,
        requestedDate,
      )
    ) {
      order.fulfillment.requestedDate = requestedDate;
    }
  }

  if (input.fulfillment?.window) {
    const allowedWindowTypes = new Set([
      "anytime",
      "morning",
      "afternoon",
      "custom",
    ]);

    const nextType =
      input.fulfillment.window.type === undefined
        ? String(order.fulfillment.window?.type || "anytime")
        : clean(input.fulfillment.window.type, 20);

    if (!allowedWindowTypes.has(nextType)) {
      throw new BloomWebsiteOrderAdjustmentError(
        "INVALID_FULFILLMENT_WINDOW",
        "Fulfillment window is invalid.",
        400,
      );
    }

    const nextFrom =
      nextType === "custom"
        ? clean(input.fulfillment.window.from, 40)
        : "";
    const nextTo =
      nextType === "custom"
        ? clean(input.fulfillment.window.to, 40)
        : "";

    if (nextType === "custom" && (!nextFrom || !nextTo)) {
      throw new BloomWebsiteOrderAdjustmentError(
        "CUSTOM_FULFILLMENT_WINDOW_REQUIRED",
        "Custom fulfillment windows require both a from and to value.",
        400,
      );
    }

    if (
      addChange(
        changes,
        "fulfillment.window.type",
        "Fulfillment window",
        order.fulfillment.window?.type || "anytime",
        nextType,
      )
    ) {
      order.fulfillment.window.type = nextType;
    }

    if (
      addChange(
        changes,
        "fulfillment.window.from",
        "Fulfillment window from",
        order.fulfillment.window?.from || "",
        nextFrom,
      )
    ) {
      order.fulfillment.window.from = nextFrom;
    }

    if (
      addChange(
        changes,
        "fulfillment.window.to",
        "Fulfillment window to",
        order.fulfillment.window?.to || "",
        nextTo,
      )
    ) {
      order.fulfillment.window.to = nextTo;
    }
  }

  if (input.fulfillment?.deliveryAddress !== undefined) {
    if (order.fulfillment.type !== "delivery") {
      throw new BloomWebsiteOrderAdjustmentError(
        "DELIVERY_ADDRESS_NOT_APPLICABLE",
        "Pickup orders do not have an editable delivery address.",
        400,
      );
    }

    const addressFields = [
      ["address1", "Delivery address line 1", 240],
      ["address2", "Delivery address line 2", 240],
      ["city", "Delivery city", 160],
      ["state", "Delivery state", 120],
      ["postalCode", "Delivery postal code", 40],
      ["country", "Delivery country", 2],
    ] as const;

    for (const [field, label, maxLength] of addressFields) {
      if (input.fulfillment.deliveryAddress[field] === undefined) continue;

      let next = clean(input.fulfillment.deliveryAddress[field], maxLength);
      if (field === "country") next = (next || "US").toUpperCase();

      const before = order.fulfillment.deliveryAddress?.[field] || "";
      if (
        addChange(
          changes,
          `fulfillment.deliveryAddress.${field}`,
          label,
          before,
          next,
        )
      ) {
        order.fulfillment.deliveryAddress[field] = next;
        order.recipient.address[field] = next;
        financialReviewRequired = true;
      }
    }
  }

  if (input.cardMessage !== undefined) {
    const cardMessage = clean(input.cardMessage, 1000);
    if (addChange(changes, "cardMessage", "Card message", order.cardMessage, cardMessage)) {
      order.cardMessage = cardMessage;
    }
  }

  if (input.floristInternalNote !== undefined) {
    const floristInternalNote = clean(input.floristInternalNote, 5000);
    if (
      addChange(
        changes,
        "floristInternalNote",
        "Florist internal note",
        order.floristInternalNote,
        floristInternalNote,
      )
    ) {
      order.floristInternalNote = floristInternalNote;
    }
  }

  if (changes.length === 0) {
    throw new BloomWebsiteOrderAdjustmentError(
      "NO_ORDER_CHANGES",
      "No order details changed.",
      400,
    );
  }

  const now = new Date();
  order.historyEvents = order.historyEvents || [];
  order.historyEvents.push({
    eventId: `BWH_${randomUUID()}`,
    kind: "order_adjusted",
    source: "portal",
    actor: {
      type: "florist",
      id: shopId,
      label: clean(actorLabel, 320) || "Florist account",
    },
    summary: `${changes.length} order ${changes.length === 1 ? "detail" : "details"} updated`,
    reason,
    referenceType: "adjustment",
    referenceId: `ADJ_${randomUUID()}`,
    changes,
    financialReviewRequired,
    occurredAt: now,
  } as any);

  try {
    await order.save();
  } catch (error: any) {
    if (error?.name === "VersionError") {
      throw new BloomWebsiteOrderAdjustmentError(
        "ORDER_CHANGED_CONCURRENTLY",
        "This order changed while you were editing it. Refresh and try again so no newer change is overwritten.",
        409,
      );
    }
    throw error;
  }

  return {
    order,
    changes,
    financialReviewRequired,
  };
}
