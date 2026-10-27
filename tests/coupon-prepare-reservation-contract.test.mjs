import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const code = fs.readFileSync(new URL('../src/lib/bloom-websites/payments/prepareBloomWebsitePayment.ts', import.meta.url),'utf8');
test('customer coupon redemption still gated',()=>{assert.match(code,/COUPON_REDEMPTION_ENABLED = false/);});
test('only claimed attempt acquires coupon hold',()=>{assert.ok(code.indexOf('const claimedAttempt') < code.indexOf('await reserveCouponUse('));});
test('coupon hold precedes payment processor creation',()=>{assert.ok(code.indexOf('await reserveCouponUse(') < code.indexOf('await paymentProvider.createPayment('));});
test('capacity exhaustion fails before payment creation',()=>{assert.match(code,/couponReservation === "unavailable"/);assert.match(code,/COUPON_CAPACITY_UNAVAILABLE/);});
test('do not release coupon hold for an ambiguous processor failure',()=>{assert.match(code,/if \(evaluatedCoupon && couponProviderRequestStarted\)/);assert.match(code,/PAYMENT_RECONCILIATION_REQUIRED/);});
