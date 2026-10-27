/**
 * Allocate a server-calculated merchandise coupon discount to product/add-on
 * tax lines before invoking the tax provider. This helper never reads browser
 * totals and never discounts delivery or tips.
 *
 * Largest-remainder rounding gives an exact cents reconciliation while
 * distributing discount proportionally across taxable and exempt items.
 */
export type MerchandiseDiscountLine = {
  referenceId: string;
  amountCents: number;
};

export type AllocatedMerchandiseDiscountLine = MerchandiseDiscountLine & {
  discountCents: number;
  discountedAmountCents: number;
};

export function allocateMerchandiseDiscount(
  lines: readonly MerchandiseDiscountLine[],
  discountCents: number,
): AllocatedMerchandiseDiscountLine[] {
  if (!Number.isSafeInteger(discountCents) || discountCents < 0) {
    throw new RangeError("Discount must be a non-negative integer number of cents.");
  }
  const seen = new Set<string>();
  let subtotalCents = 0;
  for (const line of lines) {
    if (!line.referenceId || seen.has(line.referenceId)) {
      throw new RangeError("Merchandise discount lines require unique reference IDs.");
    }
    seen.add(line.referenceId);
    if (!Number.isSafeInteger(line.amountCents) || line.amountCents < 0) {
      throw new RangeError("Line amounts must be non-negative integer cents.");
    }
    subtotalCents += line.amountCents;
    if (!Number.isSafeInteger(subtotalCents)) {
      throw new RangeError("Merchandise subtotal exceeds safe integer cents.");
    }
  }
  if (discountCents > subtotalCents) {
    throw new RangeError("Discount exceeds eligible merchandise subtotal.");
  }
  if (subtotalCents === 0) {
    return lines.map(line => ({ ...line, discountCents: 0, discountedAmountCents: 0 }));
  }
  // Integer quotients avoid floating-point rounding and tie instability.
  const allocations = lines.map((line, index) => {
    const product = BigInt(line.amountCents) * BigInt(discountCents);
    const quotient = Number(product / BigInt(subtotalCents));
    const remainder = product % BigInt(subtotalCents);
    return { index, line, discountCents: quotient, remainder };
  });
  let remaining = discountCents - allocations.reduce((sum, item) => sum + item.discountCents, 0);
  const priority = [...allocations].sort((a, b) =>
    a.remainder === b.remainder
      ? a.line.referenceId.localeCompare(b.line.referenceId)
      : a.remainder > b.remainder ? -1 : 1,
  );
  for (const allocation of priority) {
    if (remaining <= 0) break;
    if (allocation.discountCents < allocation.line.amountCents) {
      allocation.discountCents += 1;
      remaining -= 1;
    }
  }
  if (remaining !== 0) throw new RangeError("Discount allocation failed to reconcile.");
  return allocations.sort((a, b) => a.index - b.index).map(({ line, discountCents: allocated }) => ({
    ...line,
    discountCents: allocated,
    discountedAmountCents: line.amountCents - allocated,
  }));
}
