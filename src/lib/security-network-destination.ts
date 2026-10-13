import { lookup } from "node:dns/promises";
import net from "node:net";

function parseIpv4(address: string) {
  const parts = address.split(".");
  if (parts.length !== 4) return null;

  const numbers = parts.map((part) => Number(part));
  if (
    numbers.some(
      (part) => !Number.isInteger(part) || part < 0 || part > 255,
    )
  ) {
    return null;
  }

  return (
    ((numbers[0] << 24) >>> 0) +
    (numbers[1] << 16) +
    (numbers[2] << 8) +
    numbers[3]
  ) >>> 0;
}

function ipv4InCidr(address: string, base: string, prefix: number) {
  const addressNumber = parseIpv4(address);
  const baseNumber = parseIpv4(base);
  if (addressNumber === null || baseNumber === null) return false;

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (addressNumber & mask) === (baseNumber & mask);
}

function expandIpv6(address: string) {
  let source = address.toLowerCase().split("%")[0];

  if (source.includes(".")) {
    const lastColon = source.lastIndexOf(":");
    const ipv4 = parseIpv4(source.slice(lastColon + 1));
    if (ipv4 === null) return null;
    source = `${source.slice(0, lastColon)}:${((ipv4 >>> 16) & 0xffff).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }

  const halves = source.split("::");
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(":").filter(Boolean) : [];
  const right =
    halves.length === 2 && halves[1]
      ? halves[1].split(":").filter(Boolean)
      : [];

  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;

  const parts = [
    ...left,
    ...Array.from({ length: halves.length === 2 ? missing : 0 }, () => "0"),
    ...right,
  ];

  if (parts.length !== 8) return null;

  let value = BigInt(0);
  for (const part of parts) {
    if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
    value = (value << BigInt(16)) + BigInt(parseInt(part, 16));
  }

  return value;
}

function ipv6InCidr(address: string, base: string, prefix: number) {
  const addressNumber = expandIpv6(address);
  const baseNumber = expandIpv6(base);
  if (addressNumber === null || baseNumber === null) return false;

  const shift = BigInt(128 - prefix);
  return (addressNumber >> shift) === (baseNumber >> shift);
}

export function isBlockedNetworkAddress(address: string) {
  const family = net.isIP(address);

  if (family === 4) {
    return [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.0.2.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["198.51.100.0", 24],
      ["203.0.113.0", 24],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4],
    ].some(([base, prefix]) =>
      ipv4InCidr(address, String(base), Number(prefix)),
    );
  }

  if (family === 6) {
    return (
      ipv6InCidr(address, "::", 128) ||
      ipv6InCidr(address, "::1", 128) ||
      ipv6InCidr(address, "fc00::", 7) ||
      ipv6InCidr(address, "fe80::", 10) ||
      ipv6InCidr(address, "ff00::", 8) ||
      ipv6InCidr(address, "2001:db8::", 32) ||
      ipv6InCidr(address, "::ffff:0:0", 96)
    );
  }

  return true;
}

export async function assertSafeOutboundHostname(
  hostname: string,
  options: {
    label?: string;
    allowPrivateInDevelopment?: boolean;
  } = {},
) {
  const label = options.label || "Destination";
  const normalizedHost = hostname.toLowerCase().replace(/\.$/, "");

  if (!normalizedHost) {
    throw new Error(`${label} host is required.`);
  }

  if (
    options.allowPrivateInDevelopment &&
    process.env.NODE_ENV !== "production"
  ) {
    return;
  }

  if (
    normalizedHost === "localhost" ||
    normalizedHost.endsWith(".localhost") ||
    normalizedHost.endsWith(".local") ||
    normalizedHost.endsWith(".internal")
  ) {
    throw new Error(`${label} cannot use a private or local host.`);
  }

  if (net.isIP(normalizedHost)) {
    if (isBlockedNetworkAddress(normalizedHost)) {
      throw new Error(`${label} cannot use a private or reserved address.`);
    }
    return;
  }

  const addresses = await lookup(normalizedHost, {
    all: true,
    verbatim: true,
  });

  if (addresses.length === 0) {
    throw new Error(`${label} host could not be resolved.`);
  }

  if (addresses.some((entry) => isBlockedNetworkAddress(entry.address))) {
    throw new Error(`${label} cannot resolve to a private or reserved address.`);
  }
}

export async function assertSafeWebhookUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Webhook URL is invalid.");
  }

  if (url.username || url.password) {
    throw new Error("Webhook URL cannot contain embedded credentials.");
  }

  if (process.env.NODE_ENV === "production") {
    if (url.protocol !== "https:") {
      throw new Error("Webhook URL must use HTTPS in production.");
    }
  } else if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Webhook URL must use HTTP or HTTPS.");
  }

  await assertSafeOutboundHostname(url.hostname, {
    label: "Webhook",
    allowPrivateInDevelopment: true,
  });

  return url;
}
