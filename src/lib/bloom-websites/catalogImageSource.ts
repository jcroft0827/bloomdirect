export const MAX_CATALOG_IMAGE_URL_LENGTH = 2048;

export function validateCatalogImageSourceUrl(value: string) {
  const source = value.trim();

  if (!source) return null;

  if (source.length > MAX_CATALOG_IMAGE_URL_LENGTH) {
    return "Image URL is too long.";
  }

  try {
    const url = new URL(source);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "Image URLs must use http:// or https://.";
    }

    if (url.username || url.password) {
      return "Image URLs cannot contain embedded credentials.";
    }

    const port = url.port;
    if (
      port &&
      !(
        (url.protocol === "https:" && port === "443") ||
        (url.protocol === "http:" && port === "80")
      )
    ) {
      return "Image URLs must use the standard HTTP or HTTPS port.";
    }

    return null;
  } catch {
    return "Image URL is invalid.";
  }
}
