// lib/order-settlement.ts

export type OrderProductInput = {
  name: string;
  priceCents: number;
  qty: number;
  taxable?: boolean;
};

export type FeeType = "%" | "flat";

export type FeeSnapshot = {
  feeType: FeeType;
  feeValue: number; // percent if feeType === "%", dollars if feeType === "flat"
};

export type FeeOverride = {
  feeType?: FeeType;
  feeValue?: number;
};

export type OrderSettlementInput = {
  products: OrderProductInput[];
  deliveryFeeCents?: number;
  taxPercentage?: number; // e.g. 8.75
  deliveryTaxed?: boolean;
  feeTaxed?: boolean;

  // Default fee from the originating shop
  originatingShopFee?: FeeSnapshot;

  // Optional per-order override from the UI
  originatingShopFeeOverride?: FeeOverride;
};

export type OrderSettlementResult = {
  taxableSubtotalCents: number;
  productsTotalCents: number;
  deliveryFeeCents: number;
  taxAmountCents: number;
  originatingShopFeeCents: number;
  customerPaysCents: number;
  orderTotalCents: number;
  fulfillingShopGetsCents: number;
  originatingShopKeepsCents: number;
  appliedOriginatingShopFee: FeeSnapshot | null;
};

function assertNonNegativeInteger(value: unknown, fieldName: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer.`);
  }

  if (value < 0) {
    throw new Error(`${fieldName} must not be negative.`);
  }

  return value;
}

function roundToCents(value: number): number {
  return Math.round(value);
}

function resolveFeeSnapshot(
  defaultFee?: FeeSnapshot,
  override?: FeeOverride
): FeeSnapshot | null {
  const feeType = override?.feeType ?? defaultFee?.feeType;
  const feeValue = override?.feeValue ?? defaultFee?.feeValue;

  if (!feeType || feeValue === undefined || feeValue === null) {
    return null;
  }

  if (feeType !== "%" && feeType !== "flat") {
    throw new Error("originatingShopFee.feeType must be '%' or 'flat'.");
  }

  if (typeof feeValue !== "number" || !Number.isFinite(feeValue) || feeValue < 0) {
    throw new Error("originatingShopFee.feeValue must be a valid non-negative number.");
  }

  return { feeType, feeValue };
}

function sumProducts(products: OrderProductInput[]) {
  let productsTotalCents = 0;
  let taxableSubtotalCents = 0;

  for (const product of products) {
    const priceCents = assertNonNegativeInteger(product.priceCents, "products.priceCents");
    const qty = assertNonNegativeInteger(product.qty, "products.qty");

    if (qty < 1) {
      throw new Error("products.qty must be at least 1.");
    }

    const lineTotalCents = priceCents * qty;
    productsTotalCents += lineTotalCents;

    if (product.taxable !== false) {
      taxableSubtotalCents += lineTotalCents;
    }
  }

  return { productsTotalCents, taxableSubtotalCents };
}

function calculateOriginatingShopFeeCents(
  productsTotalCents: number,
  fee: FeeSnapshot | null
): number {
  if (!fee) return 0;

  if (fee.feeType === "%") {
    return roundToCents(productsTotalCents * (fee.feeValue / 100));
  }

  return roundToCents(fee.feeValue * 100);
}

/**
 * One source of truth for order totals.
 * Store only the returned cent values in MongoDB.
 */
export function calculateOrderSettlement(
  input: OrderSettlementInput
): OrderSettlementResult {
  const products = Array.isArray(input.products) ? input.products : [];
  if (products.length === 0) {
    throw new Error("An order must contain at least one product.");
  }

  const deliveryFeeCents = assertNonNegativeInteger(
    input.deliveryFeeCents ?? 0,
    "deliveryFeeCents"
  );

  const taxPercentage =
    typeof input.taxPercentage === "number" ? input.taxPercentage : 0;

  if (!Number.isFinite(taxPercentage) || taxPercentage < 0) {
    throw new Error("taxPercentage must be a valid non-negative number.");
  }

  const { productsTotalCents, taxableSubtotalCents } = sumProducts(products);

  const appliedOriginatingShopFee = resolveFeeSnapshot(
    input.originatingShopFee,
    input.originatingShopFeeOverride
  );

  const originatingShopFeeCents = calculateOriginatingShopFeeCents(
    productsTotalCents,
    appliedOriginatingShopFee
  );

  let taxBaseCents = taxableSubtotalCents;
  if (input.deliveryTaxed) taxBaseCents += deliveryFeeCents;
  if (input.feeTaxed) taxBaseCents += originatingShopFeeCents;

  const taxAmountCents = roundToCents(taxBaseCents * (taxPercentage / 100));

  const customerPaysCents =
    productsTotalCents + deliveryFeeCents + originatingShopFeeCents + taxAmountCents;

  const orderTotalCents = customerPaysCents;
  const fulfillingShopGetsCents = productsTotalCents + deliveryFeeCents;
  const originatingShopKeepsCents =
    customerPaysCents - fulfillingShopGetsCents;

  return {
    taxableSubtotalCents,
    productsTotalCents,
    deliveryFeeCents,
    taxAmountCents,
    originatingShopFeeCents,
    customerPaysCents,
    orderTotalCents,
    fulfillingShopGetsCents,
    originatingShopKeepsCents,
    appliedOriginatingShopFee,
  };
}

export function centsToDollars(cents: number): string {
  const safeCents = assertNonNegativeInteger(cents, "cents");
  return (safeCents / 100).toFixed(2);
}