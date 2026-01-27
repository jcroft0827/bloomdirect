// /lib/email/email-types.ts

/* ============================================================
   EMAIL TEMPLATE VARIABLE TYPES
   ============================================================ */

export type InviteFloristVariables = {
  inviteLink: string; // <-- shop name
  inviterName: string;
  personalMessage?: string;
};

export type OrderSentVariables = {
  orderId: string;
  orderNumber: string;
  senderShopName: string;
  recipientShopName: string;
};

export type OrderReassignedVariables = {
  orderId: string;
  orderNumber: string;
  oldShopName: string;
  newShopName: string;
  reassignedBy: string;
};

export type OrderPaidVariables = {
  orderId: string;
  orderNumber: string;
  amount: number;
  paidAt: string;
};


/* ============================================================
   EMAIL VARIABLES MAP
   ============================================================ */

export type EmailVariablesMap = {
  INVITE_FLORIST: InviteFloristVariables;
  ORDER_SENT: OrderSentVariables;
  ORDER_REASSIGNED: OrderReassignedVariables;
  ORDER_PAID: OrderPaidVariables;
};


/* ============================================================
   EMAIL TYPE
   ============================================================ */

export type EmailType = keyof EmailVariablesMap;


/* ============================================================
   SEND EMAIL PAYLOAD
   ============================================================ */

export type SendEmailPayload<T extends EmailType = EmailType> = {
  type: T;
  to: string | string[];
  variables: EmailVariablesMap[T];

  from?: string;
  subjectOverride?: string;

  actorId?: string;
  shopId?: string;
  orderId?: string;

  metadata?: Record<string, unknown>;
  sentAt?: string;
};
