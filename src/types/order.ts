import { OrderStatus } from "@/lib/order-status";

export interface OrderActivityLean {
  action: string;
  actorShop?: string;
  message?: string;
  createdAt: string;
}

export type OrderLean = {
  _id: string;

  orderNumber: string;

  originatingShop: string;
  originatingShopName: string;

  productPhoto?: string;

  fulfillingShop: string;
  fulfillingShopName: string;

  status: OrderStatus;

  recipient: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    message?: string;
  };

  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };

  deliveryDate: string;

  declineReason?: string;
  declineMessage?: string;
  declinedAt?: Date;
  declineCount?: number;

  specialInstructions?: string;

  paymentMethod?: "venmo" | "cashapp" | "zelle" | "other";
  paymentMarkedPaidAt?: string;

  activityLog?: OrderActivityLean[];

  acceptedAt?: string;
  fulfilledAt?: string;
  paidAt?: string;
  completedAt?: string;

  fulfillingShopGets?: number;

  createdAt: string;
};
