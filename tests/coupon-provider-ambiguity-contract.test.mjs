import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source = readFileSync(new URL('../src/lib/bloom-websites/payments/prepareBloomWebsitePayment.ts', import.meta.url),'utf8');
test('coupon checkout remains gated',()=>assert.match(source,/COUPON_REDEMPTION_ENABLED = false/));
test('provider start is marked before invoking provider',()=>{
 const mark=source.indexOf('couponProviderRequestStarted = evaluatedCoupon !== null;');
 const create=source.indexOf('await paymentProvider.createPayment(');
 assert.ok(mark>0 && create>mark);
});
test('ambiguous provider outcome holds inventory and coupon, and reports reconciliation',()=>{
 const ambiguous=source.indexOf('if (evaluatedCoupon && couponProviderRequestStarted)');
 const release=source.indexOf('await releaseBloomWebsiteInventory({',ambiguous);
 assert.ok(ambiguous>0 && release>ambiguous);
 const block=source.slice(ambiguous,source.indexOf('    // Provider creation was never invoked.',ambiguous));
 assert.match(block,/PAYMENT_RECONCILIATION_REQUIRED/);
 assert.doesNotMatch(block,/releaseCouponUse\(/);
 assert.doesNotMatch(block,/releaseBloomWebsiteInventory\(/);
});
test('pre-provider failure releases coupon before inventory',()=>{
 const guard=source.indexOf('if (evaluatedCoupon && couponProviderRequestStarted)');
 const after=source.slice(guard);
 assert.ok(after.indexOf('await releaseCouponUse(')>after.indexOf('if (evaluatedCoupon) {'));
 assert.ok(after.indexOf('await releaseCouponUse(')<after.indexOf('await releaseBloomWebsiteInventory('));
});
