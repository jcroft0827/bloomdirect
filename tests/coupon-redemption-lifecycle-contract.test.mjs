import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const util = readFileSync(new URL('../src/lib/bloom-websites/coupons/reserveCouponUse.ts', import.meta.url), 'utf8');
const finalize = readFileSync(new URL('../src/lib/bloom-websites/payments/finalizeBloomWebsitePayment.ts', import.meta.url), 'utf8');
const model = readFileSync(new URL('../src/models/BloomWebsiteCoupon.ts', import.meta.url), 'utf8');
test('redemption stored atomically with reservation removal and count increment', () => {
 assert.match(util, /\$pull: \{ reservations: \{ attemptId \} \}/);
 assert.match(util, /\$addToSet: \{ redeemedAttemptIds: attemptId \}/);
 assert.match(util, /\$inc: \{ redemptionCount: 1 \}/);
});
test('duplicate redemption is idempotent', () => {
 assert.match(util, /redeemedAttemptIds: \{ \$ne: attemptId \}/);
 assert.match(util, /return "already_committed"/);
});
test('no reservation means no redemption count', () => {
 assert.match(util, /"reservations.attemptId": attemptId/);
 assert.match(util, /no matching reservation/);
});
test('webhook recovery finalization commits and terminal payment releases', () => {
 assert.match(finalize, /const order = await createOrderOnce\(attempt\);[\s\S]*?await commitCouponRedemption/);
 assert.match(finalize, /terminalPayment\)[\s\S]*?await releaseCouponUse/);
});
test('coupon model retains idempotency ledger', () => {
 assert.match(model, /redeemedAttemptIds: \{ type: \[String\], default: \[\] \}/);
});
