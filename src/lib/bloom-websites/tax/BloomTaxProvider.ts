import type {
  BloomTaxCalculationInput,
  BloomTaxCalculationResult,
  BloomTaxCommitInput,
  BloomTaxCommitResult,
  BloomTaxProviderName,
} from "./types";

export interface BloomTaxProvider {
  readonly name: BloomTaxProviderName;

  /*
   * Calculate tax immediately before payment using server-
   * authoritative cart, fulfillment, exemption, and address data.
   */
  calculate(
    input: BloomTaxCalculationInput,
  ): Promise<BloomTaxCalculationResult>;

  /*
   * Some providers distinguish a quote/calculation from the
   * permanent transaction used for reporting/filing. Bloom calls
   * commit only after the payment/order commit succeeds.
   */
  commit(
    input: BloomTaxCommitInput,
  ): Promise<BloomTaxCommitResult>;
}
