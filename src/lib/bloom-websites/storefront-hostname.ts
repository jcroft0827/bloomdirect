const PLATFORM_HOSTS = new Set([
  "getbloomdirect.com",
  "www.getbloomdirect.com",
]);

function stripPort(value: string) {
  if (value.startsWith("[")) {
    const closingBracket = value.indexOf("]");

    return closingBracket >= 0
      ? value.slice(0, closingBracket + 1)
      : value;
  }

  return value.split(":")[0] || "";
}

export function normalizeBloomWebsiteHostname(
  value: string | null | undefined,
) {
  if (!value) {
    return "";
  }

  return stripPort(value)
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
}

export function isBloomPlatformHostname(
  value: string | null | undefined,
) {
  const hostname = normalizeBloomWebsiteHostname(value);

  if (!hostname) {
    return true;
  }

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    return true;
  }

  if (PLATFORM_HOSTS.has(hostname)) {
    return true;
  }

  /*
   * Deployment preview URLs stay part of the Bloom platform.
   * Custom florist domains must never be inferred from a
   * *.vercel.app hostname.
   */
  if (hostname.endsWith(".vercel.app")) {
    return true;
  }

  return false;
}

export function isPotentialBloomWebsiteCustomHostname(
  value: string | null | undefined,
) {
  const hostname = normalizeBloomWebsiteHostname(value);

  return Boolean(hostname) && !isBloomPlatformHostname(hostname);
}

export function getBloomWebsiteRequestHostname(
  headers: Pick<Headers, "get">,
) {
  const forwardedHost = headers.get("x-forwarded-host");

  /*
   * RFC-style forwarded headers can contain a comma-separated
   * proxy chain. Vercel's first value represents the original
   * hostname the customer requested.
   */
  const candidate =
    forwardedHost?.split(",")[0]?.trim() ||
    headers.get("host") ||
    "";

  return normalizeBloomWebsiteHostname(candidate);
}

export function isBloomWebsiteRequestHostMatch(
  headers: Pick<Headers, "get">,
  expectedHostname: string | null | undefined,
) {
  const expected = normalizeBloomWebsiteHostname(expectedHostname);
  const actual = getBloomWebsiteRequestHostname(headers);

  return Boolean(
    expected &&
      actual &&
      actual === expected &&
      isPotentialBloomWebsiteCustomHostname(actual),
  );
}
