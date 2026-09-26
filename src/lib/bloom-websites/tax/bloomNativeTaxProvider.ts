import { createHash } from "crypto";

import type { BloomTaxProvider } from "./BloomTaxProvider";
import {
  BloomTaxProviderError,
  type BloomTaxCalculationInput,
  type BloomTaxCalculationResult,
  type BloomTaxCommitInput,
  type BloomTaxCommitResult,
} from "./types";

function validRate(value: unknown) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new BloomTaxProviderError(
      "NATIVE_TAX_RATE_INVALID",
      "Bloom native tax received an invalid tax rate.",
    );
  }
  return rate;
}

function taxCents(amountCents: number, ratePercent: number) {
  return Math.round((amountCents * ratePercent) / 100);
}

export const bloomNativeTaxProvider: BloomTaxProvider = {
  name: "bloom_native",

  async calculate(
    input: BloomTaxCalculationInput,
  ): Promise<BloomTaxCalculationResult> {
    const exemptionApplied = input.exemption?.applied === true;
    let taxableSubtotalCents = 0;
    let taxAmountCents = 0;

    const lines = input.lines.map((line) => {
      const taxable =
        !exemptionApplied && line.taxability === "taxable";
      const rate = taxable ? validRate(line.taxRatePercent ?? 0) : 0;
      const taxableAmountCents = taxable ? line.amountCents : 0;
      const lineTaxCents = taxable ? taxCents(line.amountCents, rate) : 0;

      taxableSubtotalCents += taxableAmountCents;
      taxAmountCents += lineTaxCents;

      return {
        referenceId: line.referenceId,
        kind: line.kind,
        amountCents: line.amountCents,
        taxableAmountCents,
        taxAmountCents: lineTaxCents,
        taxCode: line.taxCode,
        taxRatePercent: rate,
        taxabilityReason: exemptionApplied
          ? "verified_tax_exemption"
          : taxable
            ? "florist_configured_taxable"
            : "florist_configured_non_taxable",
      };
    });

    const providerCalculationId =
      "BNT_" +
      createHash("sha256")
        .update(JSON.stringify(input))
        .digest("hex")
        .slice(0, 24);

    return {
      provider: "bloom_native",
      providerCalculationId,
      currency: input.currency.toLowerCase(),
      taxableSubtotalCents,
      taxAmountCents,
      exemptionApplied,
      exemptionReason: exemptionApplied ? input.exemption?.reason : undefined,
      exemptionReference: exemptionApplied
        ? input.exemption?.certificateReference ||
          input.exemption?.providerReference
        : undefined,
      lines,
      jurisdictions: [],
    };
  },

  async commit(
    input: BloomTaxCommitInput,
  ): Promise<BloomTaxCommitResult> {
    return {
      provider: "bloom_native",
      providerTransactionId:
        `BNTX_${input.calculation.providerCalculationId}_${input.orderNumber}`,
      committedAt: new Date(),
    };
  },
};
