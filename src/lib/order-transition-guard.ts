// src/lib/order-transition-guard.ts

import { OrderStatus } from "@/lib/order-status";
import type { Types } from "mongoose";
import { ApiError } from "./api-error";

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
    OrderStatus.ACCEPTED,
    OrderStatus.ACCEPTED_AWAITING_PAYMENT,
    OrderStatus.DECLINED,
  ],

  [OrderStatus.ACCEPTED]: [OrderStatus.COMPLETED],

  [OrderStatus.ACCEPTED_AWAITING_PAYMENT]: [
    OrderStatus.PAID_AWAITING_FULFILLMENT,
    OrderStatus.COMPLETED,
  ],

  [OrderStatus.PAID_AWAITING_FULFILLMENT]: [OrderStatus.COMPLETED],

  [OrderStatus.DECLINED]: [OrderStatus.PENDING_ACCEPTANCE],

  [OrderStatus.COMPLETED]: [],

  [OrderStatus.OUTSIDE_NETWORK]: [],
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
      `Illegal order transition: ${currentStatus} → ${nextStatus}`,
      409,
    );
  }

  const fulfillingActions: OrderStatus[] = [
    OrderStatus.ACCEPTED,
    OrderStatus.ACCEPTED_AWAITING_PAYMENT,
    OrderStatus.DECLINED,
    OrderStatus.COMPLETED,
  ];

  if (
    fulfillingActions.includes(nextStatus) &&
    order.fulfillingShop.toString() !== actorShopId.toString()
  ) {
    throw new ApiError(
      "INVALID_TRANSITION",
      "Only the fulfilling shop can perform this action.",
      409,
    );
  }

  // Legacy payment transition support.
  if (
    nextStatus === OrderStatus.PAID_AWAITING_FULFILLMENT &&
    order.originatingShop.toString() !== actorShopId.toString()
  ) {
    throw new ApiError(
      "INVALID_TRANSITION",
      "Only the originating shop can record payment.",
      409,
    );
  }
}
