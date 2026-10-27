import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
test('payment route accepts only owner test-mode gate or existing token gate', () => {
  const src = read('src/app/api/websites/storefront/[previewSlug]/checkout/payment/prepare/route.ts');
  assert.match(src, /access\.mode === "owner_preview"/);
  assert.match(src, /couponProvider === "stripe" && couponOwnerUiSandboxReady\(\)/);
  assert.match(src, /authorizeCouponSandboxPreparation\(/);
  assert.match(src, /!\(ownerSandboxAuthorized \|\| tokenSandboxAuthorized\)/);
});
test('deep preparation guard matches approved owner sandbox', () => {
  const src = read('src/lib/bloom-websites/payments/prepareBloomWebsitePayment.ts');
  assert.match(src, /couponSandboxEnvironmentReady\(\) \|\| couponOwnerUiSandboxReady\(\)/);
});
test('coupon dashboard no longer claims all redemption is disabled', () => {
  const src = read('src/components/websites/CouponsManager.tsx');
  assert.doesNotMatch(src, /Setup only — customers cannot redeem coupons yet/);
  assert.match(src, /Public coupon redemption will be enabled after release verification/);
});
test('production guard still blocks owner sandbox', () => {
  const src = read('src/lib/bloom-websites/coupons/authorizeCouponSandboxPreparation.ts');
  assert.match(src, /NODE_ENV === "development"/);
  assert.match(src, /sk_test_/);
  assert.match(src, /couponOwnerSandboxDatabaseReady\(\)/);
});
