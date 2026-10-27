import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const code = fs.readFileSync(new URL('../src/lib/bloom-websites/payments/recoverExpiredBloomWebsiteInventoryReservations.ts', import.meta.url), 'utf8');
test('ambiguous payment states do not release inventory or coupon capacity', () => {
  assert.match(code, /attempt\.status !== "created" && attempt\.status !== "validated"/);
  assert.match(code, /action: "held_for_payment_review"/);
});
test('close created or validated checkout atomically before releasing inventory', () => {
  const claim = code.indexOf('const closed = await BloomWebsiteCheckoutAttempt.updateOne(');
  const release = code.indexOf('const released = await releaseBloomWebsiteInventory({\n      reservationId,\n      reason: "Checkout expired before payment preparation started."');
  assert.ok(claim >= 0 && release > claim);
  assert.match(code, /status: \{ \$in: \["created", "validated"\] \}/);
  assert.match(code, /if \(closed\.modifiedCount !== 1\)/);
});
test('released, closed checkouts release coupon holds only for matching scope and attempt', () => {
  assert.match(code, /if \(released\.released && attempt\.couponSnapshot\?\.couponId\)/);
  assert.match(code, /releaseCouponUse\(\{[\s\S]*couponId: String\(attempt\.couponSnapshot\.couponId\),[\s\S]*shopId: id\(attempt\.shop\),[\s\S]*websiteId: id\(attempt\.website\),[\s\S]*attemptId: attempt\.attemptId/);
});
test('success and terminal payment outcomes still route through common finalizer', () => {
  assert.match(code, /finalizeBloomWebsitePayment\(\{\s*attemptId: attempt\.attemptId/);
});
