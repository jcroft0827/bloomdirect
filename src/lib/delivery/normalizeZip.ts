export function normalizeZip(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const digits = value.trim().replace(/\D/g, "");

  if (digits.length < 5) {
    return "";
  }

  return digits.slice(0, 5);
}

export function isValidUsZip(value: string | null | undefined): boolean {
  return normalizeZip(value).length === 5;
}