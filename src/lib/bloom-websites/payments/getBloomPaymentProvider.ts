import type { BloomPaymentProvider } from "./BloomPaymentProvider";
import { bloomFiservPaymentProvider } from "./providers/fiserv";
import { bloomStripePaymentProvider } from "./providers/stripe";
import type { BloomPaymentProviderName } from "./types";

const providers: Record<BloomPaymentProviderName, BloomPaymentProvider> = {
  stripe: bloomStripePaymentProvider,
  fiserv: bloomFiservPaymentProvider,
};

export function getBloomPaymentProvider(
  provider: BloomPaymentProviderName,
) {
  return providers[provider];
}
