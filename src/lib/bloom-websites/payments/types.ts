export type BloomPaymentProviderName = "stripe" | "fiserv";

export type BloomPaymentStatus =
  | "requires_payment_method"
  | "requires_action"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

export type BloomMerchantConnectionSnapshot = {
  id: string;
  provider: BloomPaymentProviderName;
  status: "disconnected" | "pending" | "active" | "restricted" | "error";
  providerMerchantId: string;
  providerAccountId: string;
  providerStoreId: string;
  credentialReference: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
};

export type BloomCreatePaymentInput = {
  attemptId: string;
  idempotencyKey: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  description: string;
  merchant: BloomMerchantConnectionSnapshot;
  metadata: Record<string, string>;
};

export type BloomCreatePaymentResult = {
  provider: BloomPaymentProviderName;
  providerPaymentId: string;
  status: BloomPaymentStatus;
  clientSecret?: string;
  redirectUrl?: string;
};

export type BloomRetrievePaymentInput = {
  providerPaymentId: string;
  merchant: BloomMerchantConnectionSnapshot;
};

export type BloomRetrievePaymentResult = {
  provider: BloomPaymentProviderName;
  providerPaymentId: string;
  status: BloomPaymentStatus;
  amountCents: number | null;
  currency: string;
  clientSecret?: string;
};

export class BloomPaymentProviderError extends Error {
  code: string;
  retryable: boolean;
  status: number;

  constructor(
    code: string,
    message: string,
    options?: { retryable?: boolean; status?: number },
  ) {
    super(message);
    this.name = "BloomPaymentProviderError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.status = options?.status ?? 502;
  }
}

export type BloomRefundPaymentInput = {
  providerPaymentId: string;
  amountCents: number;
  reason: string;
  idempotencyKey: string;
  merchant: BloomMerchantConnectionSnapshot;
};

export type BloomRefundPaymentResult = {
  provider: BloomPaymentProviderName;
  providerRefundId: string;
  status: "pending" | "succeeded" | "failed" | "canceled";
  amountCents: number;
};


export type BloomCancelPaymentInput = {
  providerPaymentId: string;
  merchant: BloomMerchantConnectionSnapshot;
};

export type BloomCancelPaymentResult = {
  provider: BloomPaymentProviderName;
  providerPaymentId: string;
  status: BloomPaymentStatus;
};
