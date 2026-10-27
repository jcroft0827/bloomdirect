import type { BloomTaxLineInput } from "../tax/types";
import { allocateMerchandiseDiscount } from "./allocateMerchandiseDiscount";

/**
 * Builds discounted merchandise lines for the tax provider from SERVER-validated
 * coupon amounts. Never accept discountCents directly from a storefront request.
 * Checkout payment integration must separately persist/verify the coupon and
 * original amounts in its immutable payment/order snapshot before enabling this.
 */
export function buildDiscountedTaxLines(
  originalLines: readonly BloomTaxLineInput[],
  discountCents: number,
): BloomTaxLineInput[] {
  const merchandise = originalLines.filter(line => line.kind === "product" || line.kind === "addon");
  const allocations = allocateMerchandiseDiscount(
    merchandise.map(line => ({ referenceId: line.referenceId, amountCents: line.amountCents })),
    discountCents,
  );
  const byReference = new Map(allocations.map(line => [line.referenceId, line]));
  const resultingLines = originalLines.map(line => {
    const allocation = byReference.get(line.referenceId);
    if (!allocation) return { ...line };
    // A coupon reduces the line taxable base, not quantity, taxability, or rate.
    // Preserve unit price for receipt/order references. Provider tax calculations
    // use amountCents as the authoritative extended line price.
    return { ...line, amountCents: allocation.discountedAmountCents };
  });
  const originalTotal = originalLines.reduce((sum, line) => sum + line.amountCents, 0);
  const discountedTotal = resultingLines.reduce((sum, line) => sum + line.amountCents, 0);
  if (!Number.isSafeInteger(originalTotal) || originalTotal - discountedTotal !== discountCents) {
    throw new RangeError("Discounted tax lines do not reconcile with checkout.");
  }
  return resultingLines;
}
