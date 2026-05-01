export function formatCurrencyFromCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}