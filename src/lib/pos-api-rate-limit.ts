import { checkBloomWebsiteRateLimit } from "@/lib/bloom-websites/checkBloomWebsiteRateLimit";

const WINDOW_MS = 60 * 1000;

export async function checkPosApiRateLimit({
  request,
  key,
  limit,
}: {
  request: Request;
  key: string;
  limit: number;
}) {
  const result = await checkBloomWebsiteRateLimit({
    request,
    scope: "pos-api",
    subject: key,
    limit,
    windowMs: WINDOW_MS,
  });

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetAt: Date.now() + result.retryAfterSeconds * 1000,
  };
}
