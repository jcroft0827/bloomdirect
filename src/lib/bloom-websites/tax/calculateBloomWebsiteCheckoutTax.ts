import { createHash } from "crypto";

import { connectToDB } from "@/lib/mongoose";
import BloomWebsiteCheckoutAttempt from "@/models/BloomWebsiteCheckoutAttempt";
import type { BloomTaxProvider } from "./BloomTaxProvider";
import {
  BloomTaxProviderError,
  type BloomTaxAddress,
  type BloomTaxCalculationInput,
  type BloomTaxCalculationResult,
  type BloomTaxLineInput,
} from "./types";
import type { validateBloomWebsiteCheckoutPreflight } from "../validateBloomWebsiteCheckoutPreflight";

type CheckoutPreflightResult = Awaited<
  ReturnType<typeof validateBloomWebsiteCheckoutPreflight>
>;

export type CalculateBloomWebsiteCheckoutTaxInput = {
  attemptId: string;
  preflight: CheckoutPreflightResult;
  tipCents?: number;
  provider: BloomTaxProvider;
};

export type CalculateBloomWebsiteCheckoutTaxResult = {
  calculation: BloomTaxCalculationResult;
  inputFingerprint: string;
  merchandiseAndFulfillmentCents: number;
  tipCents: number;
  taxAmountCents: number;
  finalTotalCents: number;
};

export class BloomWebsiteCheckoutTaxError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 409) {
    super(message);
    this.name = "BloomWebsiteCheckoutTaxError";
    this.code = code;
    this.status = status;
  }
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toIdString(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    return value.toString();
  }

  return "";
}

function normalizeCountry(value: unknown) {
  const country = cleanString(value).toUpperCase();
  return country || "US";
}

function toTaxAddress(input: {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): BloomTaxAddress {
  const address = {
    address1: cleanString(input.address1),
    address2: cleanString(input.address2),
    city: cleanString(input.city),
    state: cleanString(input.state),
    postalCode: cleanString(input.postalCode),
    country: normalizeCountry(input.country),
  };

  if (
    !address.address1 ||
    !address.city ||
    !address.state ||
    !address.postalCode
  ) {
    throw new BloomWebsiteCheckoutTaxError(
      "TAX_ADDRESS_INCOMPLETE",
      "The address needed to calculate tax is incomplete.",
    );
  }

  return address;
}

function normalizeTipCents(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const amount = Number(value);

  if (!Number.isInteger(amount) || amount < 0) {
    throw new BloomWebsiteCheckoutTaxError(
      "INVALID_TIP_AMOUNT",
      "The tip amount must be a non-negative integer number of cents.",
      400,
    );
  }

  // Safety ceiling, not a suggested/gratuity percentage rule.
  if (amount > 100_000) {
    throw new BloomWebsiteCheckoutTaxError(
      "TIP_AMOUNT_TOO_LARGE",
      "The tip amount is too large to process through checkout.",
      400,
    );
  }

  return amount;
}

function resolveRate(
  overrideRate: number | null | undefined,
  defaultRate: number,
) {
  return typeof overrideRate === "number" &&
    Number.isFinite(overrideRate) &&
    overrideRate >= 0 &&
    overrideRate <= 100
    ? overrideRate
    : defaultRate;
}

function buildTaxLines(
  preflight: CheckoutPreflightResult,
  tipCents: number,
): BloomTaxLineInput[] {
  const taxSettings = preflight.website.taxSettings ?? {};
  const defaultRate = Number(taxSettings.defaultRatePercent ?? 0);

  if (!Number.isFinite(defaultRate) || defaultRate < 0 || defaultRate > 100) {
    throw new BloomWebsiteCheckoutTaxError(
      "WEBSITE_TAX_SETTINGS_INVALID",
      "Website tax settings are invalid.",
      500,
    );
  }
  const lines: BloomTaxLineInput[] = [];

  for (const [itemIndex, item] of preflight.cart.items.entries()) {
    lines.push({
      referenceId: `product:${itemIndex}:${item.productId}:${item.tier}`,
      kind: "product",
      description: item.name,
      quantity: item.quantity,
      unitAmountCents: item.unitPriceCents,
      amountCents: item.productSubtotalCents,
      taxability:
        taxSettings.enabled !== false && item.taxable
          ? "taxable"
          : "non_taxable",
      taxRatePercent: resolveRate(item.taxRatePercent, defaultRate),
    });

    for (const [addonIndex, addon] of item.addons.entries()) {
      lines.push({
        referenceId: `addon:${itemIndex}:${addonIndex}:${item.productId}:${item.tier}:${addon.id}`,
        kind: "addon",
        description: addon.name,
        quantity: addon.quantity,
        unitAmountCents: addon.unitPriceCents,
        amountCents: addon.lineTotalCents,
        taxability:
          taxSettings.enabled !== false && addon.taxable
            ? "taxable"
            : "non_taxable",
        taxRatePercent: resolveRate(addon.taxRatePercent, defaultRate),
      });
    }
  }

  if (preflight.totals.fulfillmentFeeCents > 0) {
    lines.push({
      referenceId: "fulfillment:delivery",
      kind: "delivery",
      description: "Delivery",
      quantity: 1,
      unitAmountCents: preflight.totals.fulfillmentFeeCents,
      amountCents: preflight.totals.fulfillmentFeeCents,
      taxability:
        taxSettings.enabled !== false &&
        taxSettings.deliveryTaxable !== false
          ? "taxable"
          : "non_taxable",
      taxRatePercent: resolveRate(
        taxSettings.deliveryRatePercent,
        defaultRate,
      ),
    });
  }

  if (tipCents > 0) {
    lines.push({
      referenceId: "gratuity:tip",
      kind: "tip",
      description: "Tip",
      quantity: 1,
      unitAmountCents: tipCents,
      amountCents: tipCents,
      taxability:
        taxSettings.enabled !== false &&
        taxSettings.tipsTaxable === true
          ? "taxable"
          : "non_taxable",
      taxRatePercent: resolveRate(
        taxSettings.tipRatePercent,
        defaultRate,
      ),
    });
  }

  return lines;
}

function assertCalculationResult(
  input: BloomTaxCalculationInput,
  result: BloomTaxCalculationResult,
  provider: BloomTaxProvider,
) {
  if (result.provider !== provider.name) {
    throw new BloomTaxProviderError(
      "TAX_PROVIDER_MISMATCH",
      "Tax provider returned a result for an unexpected provider.",
    );
  }

  if (!cleanString(result.providerCalculationId)) {
    throw new BloomTaxProviderError(
      "TAX_CALCULATION_ID_MISSING",
      "Tax provider did not return a calculation identifier.",
    );
  }

  if (result.currency.toLowerCase() !== input.currency.toLowerCase()) {
    throw new BloomTaxProviderError(
      "TAX_CURRENCY_MISMATCH",
      "Tax provider returned a result in an unexpected currency.",
    );
  }

  if (
    !Number.isInteger(result.taxableSubtotalCents) ||
    result.taxableSubtotalCents < 0 ||
    !Number.isInteger(result.taxAmountCents) ||
    result.taxAmountCents < 0
  ) {
    throw new BloomTaxProviderError(
      "TAX_TOTALS_INVALID",
      "Tax provider returned invalid tax totals.",
    );
  }

  const inputByReference = new Map(
    input.lines.map((line) => [line.referenceId, line]),
  );

  if (result.lines.length !== input.lines.length) {
    throw new BloomTaxProviderError(
      "TAX_LINE_COUNT_MISMATCH",
      "Tax provider returned an unexpected number of tax lines.",
    );
  }

  let taxFromLines = 0;
  let taxableFromLines = 0;

  for (const line of result.lines) {
    const source = inputByReference.get(line.referenceId);

    if (!source || source.kind !== line.kind || source.amountCents !== line.amountCents) {
      throw new BloomTaxProviderError(
        "TAX_LINE_MISMATCH",
        "Tax provider returned a tax line that does not match checkout.",
      );
    }

    if (
      !Number.isInteger(line.taxableAmountCents) ||
      line.taxableAmountCents < 0 ||
      !Number.isInteger(line.taxAmountCents) ||
      line.taxAmountCents < 0 ||
      line.taxableAmountCents > line.amountCents
    ) {
      throw new BloomTaxProviderError(
        "TAX_LINE_TOTALS_INVALID",
        "Tax provider returned invalid tax line totals.",
      );
    }

    taxFromLines += line.taxAmountCents;
    taxableFromLines += line.taxableAmountCents;
    inputByReference.delete(line.referenceId);
  }

  if (
    inputByReference.size > 0 ||
    taxFromLines !== result.taxAmountCents ||
    taxableFromLines !== result.taxableSubtotalCents
  ) {
    throw new BloomTaxProviderError(
      "TAX_TOTALS_INCONSISTENT",
      "Tax provider tax lines do not reconcile with the calculation totals.",
    );
  }

  if (result.expiresAt) {
    const expiresAt = new Date(result.expiresAt);

    if (
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      throw new BloomTaxProviderError(
        "TAX_CALCULATION_EXPIRED",
        "Tax provider returned an expired tax calculation.",
        { retryable: true },
      );
    }
  }
}

function createInputFingerprint(input: BloomTaxCalculationInput) {
  const normalized = {
    ...input,
    currency: input.currency.toLowerCase(),
    lines: [...input.lines].sort((a, b) =>
      a.referenceId.localeCompare(b.referenceId),
    ),
  };

  return createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

export async function calculateBloomWebsiteCheckoutTax({
  attemptId,
  preflight,
  tipCents: rawTipCents,
  provider,
}: CalculateBloomWebsiteCheckoutTaxInput): Promise<CalculateBloomWebsiteCheckoutTaxResult> {
  const tipCents = normalizeTipCents(rawTipCents);

  if (
    tipCents > 0 &&
    preflight.website.taxSettings?.tipsEnabled === false
  ) {
    throw new BloomWebsiteCheckoutTaxError(
      "TIPS_DISABLED",
      "This florist is not accepting tips for website orders.",
      400,
    );
  }

  const websiteId = toIdString(preflight.website._id);
  const shopId = toIdString(preflight.shop._id);

  if (!attemptId || !websiteId || !shopId) {
    throw new BloomWebsiteCheckoutTaxError(
      "TAX_CONTEXT_INVALID",
      "Checkout tax context is incomplete.",
      500,
    );
  }

  await connectToDB();

  const attempt = await BloomWebsiteCheckoutAttempt.findOne({
    attemptId,
    website: websiteId,
    shop: shopId,
  });

  if (!attempt) {
    throw new BloomWebsiteCheckoutTaxError(
      "CHECKOUT_ATTEMPT_NOT_FOUND",
      "Checkout attempt could not be found.",
      404,
    );
  }

  if (attempt.status !== "validated") {
    throw new BloomWebsiteCheckoutTaxError(
      "CHECKOUT_ATTEMPT_NOT_READY_FOR_TAX",
      "Checkout must pass authoritative validation before tax is calculated.",
    );
  }

  const sellerAddress = toTaxAddress({
    address1: preflight.shop.address?.street,
    city: preflight.shop.address?.city,
    state: preflight.shop.address?.state,
    postalCode: preflight.shop.address?.zip,
    country: preflight.shop.address?.country,
  });

  const customerAddress =
    preflight.fulfillment.type === "delivery"
      ? toTaxAddress(preflight.fulfillment.deliveryAddress)
      : toTaxAddress(preflight.fulfillment.pickupLocation.address);

  const exemptionVerified = attempt.taxExemption?.status === "verified";

  const calculationInput: BloomTaxCalculationInput = {
    shopId,
    websiteId,
    attemptId,
    currency: "usd",
    sellerAddress,
    customerAddress,
    fulfillmentType: preflight.fulfillment.type,
    requestedDate: preflight.fulfillment.requestedDate,
    lines: buildTaxLines(preflight, tipCents),
    deliveryFeeCents: preflight.totals.fulfillmentFeeCents,
    tipCents,
    exemption: {
      applied: exemptionVerified,
      reason: exemptionVerified
        ? cleanString(attempt.taxExemption?.reason)
        : undefined,
      certificateReference: exemptionVerified
        ? cleanString(attempt.taxExemption?.certificateReference)
        : undefined,
      providerReference: exemptionVerified
        ? cleanString(attempt.taxExemption?.providerReference)
        : undefined,
    },
  };

  const inputFingerprint = createInputFingerprint(calculationInput);
  const calculation = await provider.calculate(calculationInput);

  assertCalculationResult(calculationInput, calculation, provider);

  if (calculation.exemptionApplied !== exemptionVerified) {
    throw new BloomTaxProviderError(
      "TAX_EXEMPTION_MISMATCH",
      "Tax provider exemption result does not match Bloom's verified exemption state.",
    );
  }

  const merchandiseAndFulfillmentCents =
    preflight.totals.subtotalCents +
    preflight.totals.fulfillmentFeeCents;

  const finalTotalCents =
    merchandiseAndFulfillmentCents +
    calculation.taxAmountCents +
    tipCents;

  const updatedAttempt = await BloomWebsiteCheckoutAttempt.findOneAndUpdate(
    {
      _id: attempt._id,
      status: "validated",
    },
    {
      $set: {
        "tax.status": "calculated",
        "tax.provider": calculation.provider,
        "tax.providerCalculationId": calculation.providerCalculationId,
        "tax.calculationSnapshot": calculation,
        "tax.inputFingerprint": inputFingerprint,
        "tax.taxableSubtotalCents": calculation.taxableSubtotalCents,
        "tax.taxAmountCents": calculation.taxAmountCents,
        "tax.finalTotalCents": finalTotalCents,
        "tax.calculatedAt": new Date(),
        "tip.amountCents": tipCents,
        "lastError.code": "",
        "lastError.message": "",
        "lastError.occurredAt": null,
      },
    },
    { new: true },
  );

  if (!updatedAttempt) {
    throw new BloomWebsiteCheckoutTaxError(
      "CHECKOUT_ATTEMPT_CHANGED",
      "Checkout changed while tax was being calculated. Please try again.",
      409,
    );
  }

  return {
    calculation,
    inputFingerprint,
    merchandiseAndFulfillmentCents,
    tipCents,
    taxAmountCents: calculation.taxAmountCents,
    finalTotalCents,
  };
}
