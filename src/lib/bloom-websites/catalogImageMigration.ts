
import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

import {
  validateCatalogImageSourceUrl,
} from "@/lib/bloom-websites/catalogImageSource";
import { uploadBufferToS3 } from "@/lib/s3";

export const MAX_REMOTE_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_REMOTE_IMAGE_REDIRECTS = 4;
export const REMOTE_IMAGE_TIMEOUT_MS = 10_000;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type CatalogImageMigrationKind =
  | "primary"
  | "gallery"
  | "standardTier"
  | "deluxeTier"
  | "premiumTier"
  | "social";

export type CatalogImageMigrationItem = {
  kind: CatalogImageMigrationKind;
  url: string;
  status: "pending" | "failed";
  error?: string;
};

function normalizeBaseUrl(value: string | undefined) {
  return (value || "").trim().replace(/\/$/, "");
}

export function getBloomImageDeliveryBaseUrl() {
  return normalizeBaseUrl(
    process.env.CLOUDFRONT_URL || process.env.NEXT_PUBLIC_CLOUDFRONT_URL,
  );
}

export function isBloomHostedImageUrl(value: string) {
  const source = value.trim();
  const base = getBloomImageDeliveryBaseUrl();

  if (!source || !base) return false;

  try {
    const sourceUrl = new URL(source);
    const baseUrl = new URL(base);
    return (
      sourceUrl.protocol === "https:" &&
      sourceUrl.hostname.toLowerCase() === baseUrl.hostname.toLowerCase() &&
      sourceUrl.pathname.startsWith("/bloom-websites/")
    );
  } catch {
    return false;
  }
}

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
  const right = halves.length === 2 && halves[1]
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

function isBlockedAddress(address: string) {
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

async function resolvePublicHost(hostname: string) {
  const normalizedHost = hostname.toLowerCase().replace(/\.$/, "");

  if (
    normalizedHost === "localhost" ||
    normalizedHost.endsWith(".localhost") ||
    normalizedHost.endsWith(".local") ||
    normalizedHost.endsWith(".internal")
  ) {
    throw new Error("Private or local image hosts are not allowed.");
  }

  if (net.isIP(normalizedHost)) {
    if (isBlockedAddress(normalizedHost)) {
      throw new Error("Private or reserved image hosts are not allowed.");
    }

    return {
      address: normalizedHost,
      family: net.isIP(normalizedHost) as 4 | 6,
    };
  }

  const addresses = await lookup(normalizedHost, {
    all: true,
    verbatim: true,
  });

  if (addresses.length === 0) {
    throw new Error("Image host could not be resolved.");
  }

  if (addresses.some((entry) => isBlockedAddress(entry.address))) {
    throw new Error("Private or reserved image hosts are not allowed.");
  }

  return addresses.find((entry) => entry.family === 4) || addresses[0];
}

function sniffImageType(buffer: Buffer) {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

type DownloadedImage = {
  buffer: Buffer;
  contentType: string;
};

async function downloadRemoteImage(
  sourceUrl: string,
  redirectCount = 0,
): Promise<DownloadedImage> {
  const validationError = validateCatalogImageSourceUrl(sourceUrl);
  if (validationError) throw new Error(validationError);

  const url = new URL(sourceUrl);
  const resolved = await resolvePublicHost(url.hostname);
  const transport = url.protocol === "https:" ? https : http;

  return await new Promise<DownloadedImage>((resolve, reject) => {
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const request = transport.request(
      {
        protocol: url.protocol,
        hostname: resolved.address,
        family: resolved.family,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method: "GET",
        servername: url.protocol === "https:" ? url.hostname : undefined,
        headers: {
          Host: url.host,
          Accept: "image/jpeg,image/png,image/webp",
          "User-Agent": "BloomWebsites-ImageImporter/1.0",
        },
      },
      (response) => {
        const statusCode = response.statusCode || 0;

        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();

          if (redirectCount >= MAX_REMOTE_IMAGE_REDIRECTS) {
            fail(new Error("Image URL redirected too many times."));
            return;
          }

          const redirectUrl = new URL(response.headers.location, url).toString();
          settled = true;
          void downloadRemoteImage(redirectUrl, redirectCount + 1).then(
            resolve,
            reject,
          );
          return;
        }

        if (statusCode !== 200) {
          response.resume();
          fail(new Error(`Image server returned HTTP ${statusCode || "error"}.`));
          return;
        }

        const contentType = String(response.headers["content-type"] || "")
          .split(";", 1)[0]
          .trim()
          .toLowerCase();

        if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
          response.resume();
          fail(new Error("Remote file is not a JPG, PNG, or WebP image."));
          return;
        }

        const contentLength = Number(response.headers["content-length"] || 0);
        if (
          Number.isFinite(contentLength) &&
          contentLength > MAX_REMOTE_IMAGE_BYTES
        ) {
          response.resume();
          fail(new Error("Remote image is larger than 8 MB."));
          return;
        }

        const chunks: Buffer[] = [];
        let totalBytes = 0;

        response.on("data", (chunk: Buffer | Uint8Array) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          totalBytes += buffer.byteLength;

          if (totalBytes > MAX_REMOTE_IMAGE_BYTES) {
            response.destroy(new Error("Remote image is larger than 8 MB."));
            return;
          }

          chunks.push(buffer);
        });

        response.on("error", (error) => fail(error));
        response.on("aborted", () =>
          fail(new Error("Remote image download was interrupted.")),
        );

        response.on("end", () => {
          if (settled) return;

          const buffer = Buffer.concat(chunks, totalBytes);
          const detectedType = sniffImageType(buffer);

          if (!detectedType || detectedType !== contentType) {
            fail(new Error("Remote image content does not match its file type."));
            return;
          }

          settled = true;
          resolve({ buffer, contentType });
        });
      },
    );

    request.setTimeout(REMOTE_IMAGE_TIMEOUT_MS, () => {
      request.destroy(new Error("Remote image download timed out."));
    });

    request.on("error", (error) => fail(error));
    request.end();
  });
}

export async function migrateCatalogImageToBloom(input: {
  sourceUrl: string;
  shopId: string;
}) {
  const sourceUrl = input.sourceUrl.trim();

  if (isBloomHostedImageUrl(sourceUrl)) {
    return sourceUrl;
  }

  const downloaded = await downloadRemoteImage(sourceUrl);
  const extension = EXTENSION_BY_TYPE[downloaded.contentType];
  const fileKey = [
    "bloom-websites",
    input.shopId,
    "products",
    `${randomUUID()}.${extension}`,
  ].join("/");

  const cloudFrontBase = getBloomImageDeliveryBaseUrl();
  if (!cloudFrontBase) {
    throw new Error("Bloom image delivery is not configured.");
  }

  await uploadBufferToS3(fileKey, downloaded.contentType, downloaded.buffer);

  return `${cloudFrontBase}/${fileKey}`;
}
