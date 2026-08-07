// src/types/order.ts

import { OrderStatus } from "@/lib/order-status";

export interface OrderActivityLean {
  action: string;
  actorShopId?: string;
  message?: string;
  createdAt: string;
}

export interface OrderDeclineHistoryLean {
  shopId: string;
  shopName: string;
  reason: string;
  message?: string;
  declinedAt: string;
}

export interface OrderPaymentMethodsLean {
  venmo?: string;
  cashapp?: string;
  zelle?: string;
  paypal?: string;
  default?: "venmo" | "cashapp" | "zelle" | "paypal";
}

export interface OrderRecipientLean {
  firstName?: string;
  lastName?: string;
  fullName: string;
  address: string;
  apt?: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  email?: string;
  company?: string;
  message?: string;
}

export interface OrderCustomerLean {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface OrderLogisticsLean {
  deliveryDate: string;
  deliveryTimeOption: string;
  deliveryTimeFrom?: string;
  deliveryTimeTo?: string;
  specialInstructions?: string;
}

export interface OrderProductLean {
  id?: string;
  productId?: string;
  name: string;
  description?: string;
  photo?: string;
  priceCents: number;
  qty: number;
  taxable: boolean;
}

export interface OrderPricingLean {
  productsSubtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;

  orderTotalCents: number;

  originatingShopFeeType?: "flat" | "percentage";
  originatingShopFeeValue?: number;

  originatingShopKeepsCents: number;
  fulfillingShopGetsCents: number;
}

export interface OrderReviewsLean {
  reviewerShop: string;
  reviewedShop: string;
  reviewerRole: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface OutsideFlorist {
  outsideNetworkFlorist: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  googlePlaceId: string;
  contactPerson: string;
  notes: string;
}

export type RefundSource = "manual" | "platform";

export type RefundCategory = "delivery_fee" | "tax" | "full" | "custom";

export type RefundEntryStatus = "active" | "voided";

export type OrderRefundStatus = "none" | "partial" | "full";

export type OrderRefund = {
  _id: string;

  amountCents: number;

  refundDate: string;

  source: RefundSource;

  category: RefundCategory;

  reason?: string;

  notes?: string;

  status: RefundEntryStatus;

  createdByShop: string;

  createdAt: string;

  voidedAt?: string | null;

  voidedByShop?: string | null;

  voidReason?: string;

  externalRefundId?: string;

  externalPaymentId?: string;
};

export type OrderLean = {
  _id: string;

  orderNumber: string;

  originatingShop: string;
  originatingShopName: string;

  fulfillmentType: string;

  fulfillingShop: string;
  fulfillingShopName: string;

  recipient: OrderRecipientLean;
  customer?: OrderCustomerLean;

  logistics: OrderLogisticsLean;

  products: OrderProductLean[];

  pricing: OrderPricingLean;

  paymentMethods?: OrderPaymentMethodsLean;
  paymentMethod?: "venmo" | "cashapp" | "zelle" | "paypal";

  status: OrderStatus;

  declineReason?: string;
  declineMessage?: string;
  declineHistory?: OrderDeclineHistoryLean[];

  outsideFlorist?: OutsideFlorist;

  activityLog?: OrderActivityLean[];

  reviews?: OrderReviewsLean[];

  refundStatus: OrderRefundStatus;

  totalRefundedCents: number;

  refunds: OrderRefund[];

  paymentMarkedPaidAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  paidAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;

  reassignCount?: number;
};
