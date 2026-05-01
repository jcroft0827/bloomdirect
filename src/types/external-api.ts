// /types/external-api.ts

export interface POSOrder {
  id: string;
  orderNumber: string;
  status: string;
  paid: boolean;
  deliveryDate?: Date;
}