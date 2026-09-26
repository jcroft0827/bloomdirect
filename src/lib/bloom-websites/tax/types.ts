export type BloomTaxProviderName =
  | "bloom_native"
  | "stripe_tax"
  | "taxjar"
  | "avalara";

export type BloomTaxLineKind =
  | "product"
  | "addon"
  | "delivery"
  | "tip";

export type BloomTaxLineTaxability =
  | "taxable"
  | "non_taxable"
  | "provider_determined";

export type BloomTaxAddress = {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type BloomTaxLineInput = {
  referenceId: string;
  kind: BloomTaxLineKind;
  description: string;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
  taxability: BloomTaxLineTaxability;
  taxCode?: string;

  /**
   * Used by Bloom's native/manual tax provider.
   * External providers may ignore this and use taxCode/location rules.
   */
  taxRatePercent?: number;
};

export type BloomTaxExemptionInput = {
  /*
   * This value must come from a server-authoritative verification
   * workflow. Never set `applied` directly from browser input.
   */
  applied: boolean;
  reason?: string;
  certificateReference?: string;
  providerReference?: string;
};

export type BloomTaxCalculationInput = {
  shopId: string;
  websiteId: string;
  attemptId: string;
  currency: string;

  sellerAddress: BloomTaxAddress;
  customerAddress: BloomTaxAddress;

  fulfillmentType: "delivery" | "pickup";
  requestedDate: string;

  lines: BloomTaxLineInput[];

  /*
   * Delivery and gratuity stay distinct from merchandise so Bloom
   * can preserve their legal/accounting treatment and receipt
   * presentation even when a provider internally represents them
   * as tax lines.
   */
  deliveryFeeCents: number;
  tipCents: number;

  exemption?: BloomTaxExemptionInput;
};

export type BloomTaxJurisdictionBreakdown = {
  country?: string;
  state?: string;
  county?: string;
  city?: string;
  jurisdictionCode?: string;
  rate?: number;
  taxAmountCents: number;
};

export type BloomTaxLineResult = {
  referenceId: string;
  kind: BloomTaxLineKind;
  amountCents: number;
  taxableAmountCents: number;
  taxAmountCents: number;
  taxCode?: string;
  taxRatePercent?: number;
  taxabilityReason?: string;
};

export type BloomTaxCalculationResult = {
  provider: BloomTaxProviderName;
  providerCalculationId: string;

  currency: string;
  taxableSubtotalCents: number;
  taxAmountCents: number;

  exemptionApplied: boolean;
  exemptionReason?: string;
  exemptionReference?: string;

  lines: BloomTaxLineResult[];
  jurisdictions: BloomTaxJurisdictionBreakdown[];

  expiresAt?: Date;
};

export type BloomTaxCommitInput = {
  calculation: BloomTaxCalculationResult;
  orderNumber: string;
  providerPaymentId?: string;
};

export type BloomTaxCommitResult = {
  provider: BloomTaxProviderName;
  providerTransactionId: string;
  committedAt: Date;
};

export class BloomTaxProviderError extends Error {
  code: string;
  retryable: boolean;

  constructor(
    code: string,
    message: string,
    options?: { retryable?: boolean },
  ) {
    super(message);
    this.name = "BloomTaxProviderError";
    this.code = code;
    this.retryable = options?.retryable ?? false;
  }
}
