/** Presentation-only helpers. Keep email, free-form instructions and address lines unchanged. */
export function formatPersonName(value: string): string {
  // Capitalize each word while retaining the customer's existing case elsewhere.
  return value.replace(/(^|[\s'’\-])([a-z])/g, (_match, prefix: string, letter: string) => prefix + letter.toUpperCase());
}

export function formatUsPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  // Preserve a leading US country code as a display prefix.
  const hasCountryCode = digits.length === 11 && digits.startsWith("1");
  const local = (hasCountryCode ? digits.slice(1) : digits).slice(0, 10);
  const formatted = local.length <= 3 ? local : local.length <= 6
    ? `${local.slice(0, 3)}-${local.slice(3)}`
    : `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  return hasCountryCode ? `1-${formatted}` : formatted;
}
