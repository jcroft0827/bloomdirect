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

export type OrderLean = {
  _id: string;

  orderNumber: string;

  originatingShop: string;
  originatingShopName: string;
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

  activityLog?: OrderActivityLean[];

  paymentMarkedPaidAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  paidAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;

  reassignCount?: number;
};