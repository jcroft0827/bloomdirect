import { bloomNativeTaxProvider } from "./bloomNativeTaxProvider";
import {
  calculateBloomWebsiteCheckoutTax,
  type CalculateBloomWebsiteCheckoutTaxInput,
} from "./calculateBloomWebsiteCheckoutTax";

export function calculateBloomWebsiteNativeCheckoutTax(
  input: Omit<CalculateBloomWebsiteCheckoutTaxInput, "provider">,
) {
  return calculateBloomWebsiteCheckoutTax({
    ...input,
    provider: bloomNativeTaxProvider,
  });
}
