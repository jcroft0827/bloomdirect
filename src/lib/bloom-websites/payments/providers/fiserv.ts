import type { BloomPaymentProvider } from "../BloomPaymentProvider";
import { BloomPaymentProviderError } from "../types";

/*
 * Fiserv is a V1 provider, but Bloom must not guess at a merchant's
 * boarding credentials or accept raw card data server-side.
 *
 * This adapter is intentionally the processor boundary. Once Bloom's
 * Fiserv app/merchant boarding credentials and hosted/tokenized checkout
 * contract are finalized, only this file needs the gateway call.
 */
export const bloomFiservPaymentProvider: BloomPaymentProvider = {
  name: "fiserv",

  async createPayment(input) {
    if (
      !input.merchant.providerMerchantId &&
      !input.merchant.providerStoreId
    ) {
      throw new BloomPaymentProviderError(
        "FISERV_MERCHANT_MISSING",
        "This florist has not finished connecting Fiserv.",
        { status: 409 },
      );
    }

    throw new BloomPaymentProviderError(
      "FISERV_GATEWAY_HANDSHAKE_PENDING",
      "Fiserv merchant boarding is connected to Bloom's V1 payment architecture, but the production hosted/tokenized gateway handshake still needs to be activated.",
      { status: 503 },
    );
  },

  async retrievePayment() {
    throw new BloomPaymentProviderError(
      "FISERV_GATEWAY_HANDSHAKE_PENDING",
      "Fiserv payment retrieval is not activated yet.",
      { status: 503 },
    );
  },

  async cancelPayment() {
    throw new BloomPaymentProviderError(
      "FISERV_GATEWAY_HANDSHAKE_PENDING",
      "Fiserv payment cancellation is not activated yet.",
      { status: 503 },
    );
  },

  async refundPayment() {
    throw new BloomPaymentProviderError(
      "FISERV_GATEWAY_HANDSHAKE_PENDING",
      "Fiserv refunds are not activated yet.",
      { status: 503 },
    );
  },

  async verifyWebhook() {
    throw new BloomPaymentProviderError(
      "FISERV_GATEWAY_HANDSHAKE_PENDING",
      "Fiserv webhook verification is not activated yet.",
      { status: 503 },
    );
  },
};
