import mongoose from "mongoose";
import { timingSafeEqual } from "node:crypto";

/** Coupon payment testing is intentionally unavailable in production. */
export function couponSandboxEnvironmentReady(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    env.NODE_ENV === "development" &&
    /^sk_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY ?? "") &&
    (env.BLOOM_COUPON_SANDBOX_TOKEN?.length ?? 0) >= 32
  );
}

export function authorizeCouponSandboxPreparation({
  token,
  paymentProvider,
  env = process.env,
}: {
  token: string;
  paymentProvider: string;
  env?: NodeJS.ProcessEnv;
}): boolean {
  if (paymentProvider !== "stripe" || !couponSandboxEnvironmentReady(env)) return false;
  const expected = Buffer.from(env.BLOOM_COUPON_SANDBOX_TOKEN ?? "", "utf8");
  const supplied = Buffer.from(token, "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

/**
 * This deployment's existing development Atlas URI has no database pathname;
 * Mongoose therefore uses its default `test` database. Bind that fallback to
 * the known development cluster instead of accepting any URI as a safe test DB.
 * Do not infer safety solely from NODE_ENV or the existence of MONGODB_URI.
 */
export function couponOwnerSandboxDatabaseReady({
  mongoUri = process.env.MONGODB_URI,
  databaseName = mongoose.connection.db?.databaseName,
  connected = mongoose.connection.readyState === 1,
}: {
  mongoUri?: string;
  databaseName?: string;
  connected?: boolean;
} = {}): boolean {
  if (!connected || !mongoUri || !databaseName) return false;
  try {
    const url = new URL(mongoUri);
    const configuredDatabase = decodeURIComponent(url.pathname.slice(1));
    const isKnownTestCluster =
      url.protocol === "mongodb+srv:" &&
      url.hostname.toLowerCase() === "cluster0.rmbl0eo.mongodb.net";
    if (!isKnownTestCluster) return false;
    if (configuredDatabase && configuredDatabase !== databaseName) return false;
    return databaseName === "BloomDirectDev" ||
      (databaseName === "test" && configuredDatabase === "");
  } catch {
    return false;
  }
}

/** UI-based test payments must be owner-authenticated by the API route.
 * Never infer test safety from `npm run dev` alone.
 */
export function couponOwnerUiSandboxReady(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    env.NODE_ENV === "development" &&
    /^sk_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY ?? "") &&
    couponOwnerSandboxDatabaseReady()
  );
}
