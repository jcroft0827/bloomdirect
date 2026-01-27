// src/lib/order-transition-guard.ts

import { OrderStatus } from "@/lib/order-status";
import type { Types } from "mongoose";
import { ApiError } from "./api-error";

/**
 * Minimal shape required for transition validation
 * (no need to import full Mongoose document type)
 */
type GuardOrder = {
  status: OrderStatus;
  originatingShop: Types.ObjectId | string;
  fulfillingShop: Types.ObjectId | string;
};

type GuardParams = {
  order: GuardOrder;
  nextStatus: OrderStatus;
  actorShopId: Types.ObjectId | string;
};

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [OrderStatus.PENDING_ACCEPTANCE]: [
    OrderStatus.ACCEPTED_AWAITING_PAYMENT,
    OrderStatus.DECLINED,
  ],

  [OrderStatus.ACCEPTED_AWAITING_PAYMENT]: [
    OrderStatus.PAID_AWAITING_FULFILLMENT,
  ],

  [OrderStatus.PAID_AWAITING_FULFILLMENT]: [
    OrderStatus.COMPLETED,
  ],

  [OrderStatus.DECLINED]: [
    OrderStatus.PENDING_ACCEPTANCE, // via reassignment
  ],

  [OrderStatus.COMPLETED]: [],
};

export function assertOrderTransition({
  order,
  nextStatus,
  actorShopId,
}: GuardParams) {
  const currentStatus = order.status;

  const allowedNext = TRANSITIONS[currentStatus];

  if (!allowedNext.includes(nextStatus)) {
    throw new ApiError(
        "INVALID_TRANSITION",
        `Illegal order transition: ${currentStatus} → ${nextStatus}`
    );
  }

  // Fulfillment-side actions
  if (
    [
      OrderStatus.ACCEPTED_AWAITING_PAYMENT,
      OrderStatus.DECLINED,
      OrderStatus.COMPLETED,
    ].includes(nextStatus) &&
    order.fulfillingShop.toString() !== actorShopId.toString()
  ) {
    throw new ApiError(
        "INVALID_TRANSITION",
        "Only fulfilling shop can perform this action."
    );
  }

  // Originating shop payment action
  if (
    nextStatus === OrderStatus.PAID_AWAITING_FULFILLMENT &&
    order.originatingShop.toString() !== actorShopId.toString()
  ) {
    throw new ApiError(
        "INVALID_TRANSITION",
        "Only originating shop can mark payment."
    );
  }
}
