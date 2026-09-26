import { createHash } from "crypto";

import BloomWebsiteRateLimit from "@/models/BloomWebsiteRateLimit";

type BloomWebsiteRateLimitOptions = {
  request: Request;
  scope: string;
  subject: string;
  limit: number;
  windowMs?: number;
};

export type BloomWebsiteRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

const DEFAULT_WINDOW_MS = 5 * 60 * 1000;

function getClientAddress(request: Request) {
  /*
   * On Vercel, x-forwarded-for identifies the connecting
   * client. Keep only the first address and hash it before
   * persistence so Bloom does not create a database of raw IPs.
   */
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const firstForwarded = forwarded.split(",")[0]?.trim();

  const address =
    firstForwarded ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  return createHash("sha256").update(address).digest("hex");
}

function buildRateLimitKey({
  request,
  scope,
  subject,
  windowStart,
}: {
  request: Request;
  scope: string;
  subject: string;
  windowStart: number;
}) {
  const clientHash = getClientAddress(request);

  return createHash("sha256")
    .update(`${scope}:${subject}:${clientHash}:${windowStart}`)
    .digest("hex");
}

export async function checkBloomWebsiteRateLimit({
  request,
  scope,
  subject,
  limit,
  windowMs = DEFAULT_WINDOW_MS,
}: BloomWebsiteRateLimitOptions): Promise<BloomWebsiteRateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const expiresAt = new Date(windowStart + windowMs + 60_000);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStart + windowMs - now) / 1000),
  );

  const key = buildRateLimitKey({
    request,
    scope,
    subject,
    windowStart,
  });

  const entry = await BloomWebsiteRateLimit.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        expiresAt,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  )
    .select("count")
    .lean<{ count?: number } | null>();

  const count = Math.max(0, Number(entry?.count) || 0);

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
  };
}
