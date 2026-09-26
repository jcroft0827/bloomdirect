import type {
  BloomCancelPaymentInput,
  BloomCancelPaymentResult,
  BloomCreatePaymentInput,
  BloomCreatePaymentResult,
  BloomPaymentProviderName,
  BloomRetrievePaymentInput,
  BloomRetrievePaymentResult,
  BloomRefundPaymentInput,
  BloomRefundPaymentResult,
} from "./types";

export interface BloomPaymentProvider {
  readonly name: BloomPaymentProviderName;

  createPayment(
    input: BloomCreatePaymentInput,
  ): Promise<BloomCreatePaymentResult>;

  retrievePayment(
    input: BloomRetrievePaymentInput,
  ): Promise<BloomRetrievePaymentResult>;

  cancelPayment(
    input: BloomCancelPaymentInput,
  ): Promise<BloomCancelPaymentResult>;

  refundPayment(
    input: BloomRefundPaymentInput,
  ): Promise<BloomRefundPaymentResult>;

  verifyWebhook?(
    rawBody: string,
    signature: string,
  ): Promise<{
    eventId: string;
    eventType: string;
    providerPaymentId: string;
    providerAccountId: string;
  }>;
}
