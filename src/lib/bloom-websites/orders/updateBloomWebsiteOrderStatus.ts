import { randomUUID } from "crypto";

import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";
import {
  sendBloomWebsiteDeliveryConfirmation,
  sendBloomWebsiteStatusNotification,
} from "./sendBloomWebsiteOrderNotifications";

export type BloomWebsiteOrderStatus =
  | "placed"
  | "confirmed"
  | "in_preparation"
  | "preparation_complete"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "fulfilled"
  | "canceled";

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
 * Server-side transitions intentionally allow skipping operational steps.
 * A florist may use every milestone, only mark the order complete, or later
 * have a POS/API supply status updates. The portal workflow setting controls
 * what is emphasized in the UI; it does not trap an order in a rigid state.
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
    "fulfilled",
    "canceled",
  ],
  // Kept for backward compatibility with orders created before the
  // manual Confirm Order step was removed from BloomWebsites.
  confirmed: [
    "in_preparation",
    "preparation_complete",
    "ready_for_pickup",
    "out_for_delivery",
    "fulfilled",
    "canceled",
  ],
  in_preparation: [
    "preparation_complete",
    "ready_for_pickup",
    "out_for_delivery",
    "fulfilled",
    "canceled",
  ],
  preparation_complete: [
    "ready_for_pickup",
    "out_for_delivery",
    "fulfilled",
    "canceled",
  ],
  ready_for_pickup: ["fulfilled", "canceled"],
  out_for_delivery: ["fulfilled", "canceled"],
  fulfilled: [],
  canceled: [],
};

export async function updateBloomWebsiteOrderStatus({
  orderId,
  shopId,
  nextStatus,
  cancellationReason = "",
  source = "portal",
  actorId = "",
  actorLabel = "",
}: {
  orderId: string;
  shopId: string;
  nextStatus: BloomWebsiteOrderStatus;
  cancellationReason?: string;
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
    nextStatus === "out_for_delivery" &&
    order.fulfillment.type !== "delivery"
  ) {
    throw new BloomWebsiteOrderStatusError(
      "FULFILLMENT_STATUS_MISMATCH",
      "Only delivery orders can be marked out for delivery.",
      400,
    );
  }

  const resolvedCancellationReason =
    nextStatus === "canceled"
      ? cancellationReason.trim() || "Order canceled by florist."
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

  const now = new Date();

  // confirmedAt remains for historical orders, but no new portal action
  // deliberately creates the confirmed state.
  if (nextStatus === "confirmed") order.confirmedAt = now;
  if (nextStatus === "in_preparation") order.preparationStartedAt = now;
  if (nextStatus === "preparation_complete") {
    order.preparationCompletedAt = now;
  }
  if (nextStatus === "ready_for_pickup") order.readyForPickupAt = now;
  if (nextStatus === "out_for_delivery") order.outForDeliveryAt = now;
  if (nextStatus === "fulfilled") order.fulfilledAt = now;

  order.status = nextStatus;
  order.fulfillmentEvents = order.fulfillmentEvents || [];
  order.fulfillmentEvents.push({
    status: nextStatus,
    source,
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

  order.historyEvents = order.historyEvents || [];
  order.historyEvents.push({
    eventId: `BWH_${randomUUID()}`,
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
        : `Order status changed to ${nextStatus.replaceAll("_", " ")}`,
    reason: resolvedCancellationReason,
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

  if (nextStatus === "fulfilled" && order.fulfillment.type === "delivery") {
    const website = await BloomWebsite.findById(order.website)
      .select("orderPolicy.sendDeliveryConfirmation")
      .lean<any>();

    if (website?.orderPolicy?.sendDeliveryConfirmation !== false) {
      await sendBloomWebsiteDeliveryConfirmation(String(order._id)).catch(
        (error) => {
          console.error(
            "BloomWebsite delivery confirmation failed:",
            error,
          );
        },
      );
    }
  } else {
    await sendBloomWebsiteStatusNotification(String(order._id)).catch(
      (error) => {
        console.error("BloomWebsite status notification failed:", error);
      },
    );
  }

  return order;
}
