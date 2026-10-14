import { randomUUID } from "crypto";

import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";
import {
  getBloomWebsiteOrderStatusLabel,
  shouldNotifyBloomWebsiteStatus,
  type BloomWebsiteOrderStatus,
} from "./fulfillment-status";
import {
  sendBloomWebsiteDeliveryConfirmation,
  sendBloomWebsiteStatusNotification,
} from "./sendBloomWebsiteOrderNotifications";

export type { BloomWebsiteOrderStatus } from "./fulfillment-status";

export type BloomWebsiteFulfillmentEventSource =
  | "portal"
  | "pos"
  | "api"
  | "system";

export class BloomWebsiteOrderStatusError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 409) {
    super(message);
    this.name = "BloomWebsiteOrderStatusError";
    this.code = code;
    this.status = status;
  }
}

/*
 * Transitions intentionally allow skipping operational steps. BloomWebsite
 * must support shops that work every milestone as well as shops whose POS or
 * team only records a few key moments. Delivery Attempted is retryable so a
 * florist can make another delivery run without creating a new order.
 */
const transitions: Record<
  BloomWebsiteOrderStatus,
  BloomWebsiteOrderStatus[]
> = {
  placed: [
    "in_preparation",
    "preparation_complete",
    "ready_for_pickup",
    "out_for_delivery",
    "delivery_attempted",
    "fulfilled",
    "canceled",
  ],
  confirmed: [
    "in_preparation",
    "preparation_complete",
    "ready_for_pickup",
    "out_for_delivery",
    "delivery_attempted",
    "fulfilled",
    "canceled",
  ],
  in_preparation: [
    "preparation_complete",
    "ready_for_pickup",
    "out_for_delivery",
    "delivery_attempted",
    "fulfilled",
    "canceled",
  ],
  preparation_complete: [
    "ready_for_pickup",
    "out_for_delivery",
    "delivery_attempted",
    "fulfilled",
    "canceled",
  ],
  ready_for_pickup: ["fulfilled", "canceled"],
  out_for_delivery: ["delivery_attempted", "fulfilled", "canceled"],
  delivery_attempted: ["out_for_delivery", "fulfilled", "canceled"],
  fulfilled: [],
  canceled: [],
};

function normalizeNote(value: string, maxLength: number) {
  const note = String(value || "").trim();
  if (note.length > maxLength) {
    throw new BloomWebsiteOrderStatusError(
      "NOTE_TOO_LONG",
      `Order note must be ${maxLength.toLocaleString("en-US")} characters or fewer.`,
      400,
    );
  }
  return note;
}

export async function updateBloomWebsiteOrderStatus({
  orderId,
  shopId,
  nextStatus,
  cancellationReason = "",
  internalNote = "",
  customerNote = "",
  notifyCustomer,
  source = "portal",
  actorId = "",
  actorLabel = "",
}: {
  orderId: string;
  shopId: string;
  nextStatus: BloomWebsiteOrderStatus;
  cancellationReason?: string;
  internalNote?: string;
  customerNote?: string;
  notifyCustomer?: boolean;
  source?: BloomWebsiteFulfillmentEventSource;
  actorId?: string;
  actorLabel?: string;
}) {
  await connectToDB();

  const order = await BloomWebsiteOrder.findOne({
    _id: orderId,
    shop: shopId,
  });

  if (!order) {
    throw new BloomWebsiteOrderStatusError(
      "ORDER_NOT_FOUND",
      "BloomWebsite order could not be found.",
      404,
    );
  }

  const currentStatus = order.status as BloomWebsiteOrderStatus;

  if (currentStatus === nextStatus) {
    return order;
  }

  if (!transitions[currentStatus]?.includes(nextStatus)) {
    throw new BloomWebsiteOrderStatusError(
      "INVALID_STATUS_TRANSITION",
      `Order cannot move from ${currentStatus} to ${nextStatus}.`,
      400,
    );
  }

  if (
    nextStatus === "ready_for_pickup" &&
    order.fulfillment.type !== "pickup"
  ) {
    throw new BloomWebsiteOrderStatusError(
      "FULFILLMENT_STATUS_MISMATCH",
      "Only pickup orders can be marked ready for pickup.",
      400,
    );
  }

  if (
    ["out_for_delivery", "delivery_attempted"].includes(nextStatus) &&
    order.fulfillment.type !== "delivery"
  ) {
    throw new BloomWebsiteOrderStatusError(
      "FULFILLMENT_STATUS_MISMATCH",
      "Only delivery orders can use delivery-progress statuses.",
      400,
    );
  }

  const resolvedInternalNote = normalizeNote(internalNote, 5000);
  const resolvedCustomerNote = normalizeNote(customerNote, 2000);
  const resolvedCancellationReason =
    nextStatus === "canceled"
      ? normalizeNote(
          cancellationReason || customerNote || "Order canceled by florist.",
          1000,
        ) || "Order canceled by florist."
      : "";

  if (nextStatus === "canceled") {
    const fullyRefunded =
      order.payment.status === "refunded" ||
      order.totalRefundedCents >= order.totals.totalCents;

    if (!fullyRefunded && order.payment.status === "paid") {
      throw new BloomWebsiteOrderStatusError(
        "REFUND_REQUIRED_BEFORE_CANCEL",
        "Refund the paid order before canceling it.",
      );
    }

    order.cancellation = {
      canceledAt: new Date(),
      canceledBy: "florist",
      reason: resolvedCancellationReason,
    } as any;
  }

  const website = await BloomWebsite.findById(order.website)
    .select(
      "orderPolicy.statusNotifications orderPolicy.sendDeliveryConfirmation",
    )
    .lean<any>();

  const resolvedNotifyCustomer =
    typeof notifyCustomer === "boolean"
      ? notifyCustomer
      : shouldNotifyBloomWebsiteStatus(
          website?.orderPolicy?.statusNotifications,
          nextStatus,
          order.fulfillment.type,
          website?.orderPolicy?.sendDeliveryConfirmation !== false,
        );

  const now = new Date();
  const eventId = `BWF_${randomUUID()}`;

  if (nextStatus === "confirmed") order.confirmedAt = now;
  if (nextStatus === "in_preparation") order.preparationStartedAt = now;
  if (nextStatus === "preparation_complete") {
    order.preparationCompletedAt = now;
  }
  if (nextStatus === "ready_for_pickup") order.readyForPickupAt = now;
  if (nextStatus === "out_for_delivery") order.outForDeliveryAt = now;
  if (nextStatus === "delivery_attempted") order.deliveryAttemptedAt = now;
  if (nextStatus === "fulfilled") order.fulfilledAt = now;

  order.status = nextStatus;
  order.fulfillmentEvents = order.fulfillmentEvents || [];
  order.fulfillmentEvents.push({
    eventId,
    status: nextStatus,
    source,
    internalNote: resolvedInternalNote,
    customerNote: resolvedCustomerNote,
    customerNotified: false,
    occurredAt: now,
  } as any);

  const actorType =
    source === "portal"
      ? "florist"
      : source === "pos"
        ? "pos"
        : source === "api"
          ? "api"
          : "system";

  const statusLabel = getBloomWebsiteOrderStatusLabel(
    nextStatus,
    order.fulfillment.type,
  );

  order.historyEvents = order.historyEvents || [];
  order.historyEvents.push({
    eventId,
    kind: "status_changed",
    source,
    actor: {
      type: actorType,
      id: actorId || (source === "portal" ? shopId : ""),
      label:
        actorLabel ||
        (source === "portal"
          ? "Florist account"
          : source === "pos"
            ? "Connected POS"
            : source === "api"
              ? "Connected API"
              : "Bloom system"),
    },
    summary:
      nextStatus === "canceled"
        ? "Order canceled"
        : `Order status changed to ${statusLabel}`,
    reason: resolvedCancellationReason,
    internalNote: resolvedInternalNote,
    customerNote: resolvedCustomerNote,
    customerNotified: false,
    referenceType: "status",
    referenceId: nextStatus,
    changes: [
      {
        field: "status",
        label: "Order status",
        beforeValue: currentStatus,
        afterValue: nextStatus,
      },
    ],
    financialReviewRequired: false,
    occurredAt: now,
  } as any);

  await order.save();

  if (resolvedNotifyCustomer) {
    let notificationSent = false;

    if (nextStatus === "fulfilled" && order.fulfillment.type === "delivery") {
      notificationSent = Boolean(
        await sendBloomWebsiteDeliveryConfirmation(String(order._id), {
          customerNote: resolvedCustomerNote,
          scope: eventId,
        }).catch((error) => {
          console.error("BloomWebsite delivery confirmation failed:", error);
          return false;
        }),
      );
    } else {
      notificationSent = Boolean(
        await sendBloomWebsiteStatusNotification(String(order._id), {
          customerNote: resolvedCustomerNote,
          scope: eventId,
        }).catch((error) => {
          console.error("BloomWebsite status notification failed:", error);
          return false;
        }),
      );
    }

    if (notificationSent) {
      await BloomWebsiteOrder.updateOne(
        { _id: order._id },
        {
          $set: {
            "fulfillmentEvents.$[fulfillment].customerNotified": true,
            "historyEvents.$[history].customerNotified": true,
          },
        },
        {
          arrayFilters: [
            { "fulfillment.eventId": eventId },
            { "history.eventId": eventId },
          ],
        },
      ).catch((error) => {
        console.error("BloomWebsite notification audit update failed:", error);
      });
    }
  }

  return order;
}
