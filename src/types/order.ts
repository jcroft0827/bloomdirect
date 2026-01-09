import { OrderStatus } from "@/lib/order-status";

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

  specialInstructions?: string;

  paymentMethod?: "venmo" | "cashapp" | "zelle" | "other";
  paymentMarkedPaidAt?: string;

  acceptedAt?: string;
  fulfilledAt?: string;

  fulfillingShopGets?: number;

  createdAt: string;
};
