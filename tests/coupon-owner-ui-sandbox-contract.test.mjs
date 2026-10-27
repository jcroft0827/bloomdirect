import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("owner-only gate checks a development database and test Stripe secret", () => {
 const gate=source("src/lib/bloom-websites/coupons/authorizeCouponSandboxPreparation.ts");
 assert.match(gate,/NODE_ENV === "development"/);
 assert.match(gate,/sk_test_/);
 assert.match(gate,/databaseName === "BloomDirectDev"/);
});
test("public checkout cannot bypass owner access or existing private gate", () => {
 const route=source("src/app/api/websites/storefront/[previewSlug]/checkout/payment/prepare/route.ts");
 assert.match(route,/access.mode === "owner_preview"/);
 assert.match(route,/couponOwnerUiSandboxReady\(\)/);
 assert.match(route,/authorizeCouponSandboxPreparation\(/);
});
test("owner-facing capability endpoint does not return secret token", () => {
 const status=source("src/app/api/websites/storefront/[previewSlug]/checkout/coupon-test-status/route.ts");
 assert.match(status,/access.mode !== "owner_preview"/);
 assert.match(status,/enabled: couponOwnerUiSandboxReady\(\)/);
 assert.doesNotMatch(status,/BLOOM_COUPON_SANDBOX_TOKEN/);
});
test("UI sends coupon only when test access is allowed and binds retry signature to coupon and tip", () => {
 const checkout=source("src/components/websites/storefront/BloomWebsitePaymentCheckout.tsx");
 assert.match(checkout,/activeCouponPreview && couponTestEnabled \? \{ couponCode:/);
 assert.match(checkout,/paymentAttemptSignature = .*activeCouponPreview\?\.code.*tipCents/);
 assert.match(checkout,/stored\?\.signature === paymentAttemptSignature/);
});
