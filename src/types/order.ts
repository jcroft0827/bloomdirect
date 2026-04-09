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
  fulfillingShop: string;
  fulfillingShopName: string;

  recipient: {
    firstName: string,
    lastName?: string,
    fullName: string,
    address: string,
    apt?: string,
    city: string,
    state: string,
    zip: string,
    phone?: string,
    email?: string,
    company?: string,
    message?: string,
  };
  
  customer?: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };

  logistics: {
    deliveryDate: string;
    deliveryTimeOption: string,
    deliveryTimeFrom?: string,
    deliveryTimeTo?: string,
    specialInstructions?: string,
  };

  products: {
    name?: string;
    description?: string;
    photo?: string;
    price?: number;
    qty: number;
    taxable: boolean;
  }[];

  pricing: {
    productsTotal: number;
    deliveryFee: number;
    taxAmount: number;
    customerPays: number;
    orderTotal: number;
    fulfillingShopGets: number;
    feeCharge: number;
  };
  
  paymentMethods?: {
    venmo?: string;
    cashapp?: string;
    zelle?: string;
    paypal?: string;
    default?: string;
  };
  
  paymentMarkedPaidAt?: Date;

  status: OrderStatus;
  
  declineReason?: string;
  declineMessage?: string;
  declineCount?: number;
  declineHistory?: {
    shop: string;
    shopName: string;
    reason: string;
    message?: string;
    declinedAt: Date;
  }[];

  activityLog?: OrderActivityLean[];

  acceptedAt?: string;
  declinedAt?: string;
  paidAt?: string;
  completedAt?: string;
  createdAt: string;
};
