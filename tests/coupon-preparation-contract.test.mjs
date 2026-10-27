import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const prepare = readFileSync(new URL('../src/lib/bloom-websites/payments/prepareBloomWebsitePayment.ts', import.meta.url), 'utf8');
const route = readFileSync(new URL('../src/app/api/websites/storefront/[previewSlug]/checkout/payment/prepare/route.ts', import.meta.url), 'utf8');

test('coupon redemption remains gated until reservation accounting exists', () => {
  assert.match(prepare, /COUPON_REDEMPTION_ENABLED = false/);
  assert.match(prepare, /if \(couponCode && !COUPON_REDEMPTION_ENABLED\)/);
  assert.match(route, /COUPON_REDEMPTION_UNAVAILABLE/);
});

test('coupon evaluation is scoped to the florist website and authoritative preflight', () => {
  assert.match(prepare, /shop: preflight\.shop\._id/);
  assert.match(prepare, /website: preflight\.website\._id/);
  assert.match(prepare, /merchandiseSubtotalCents: preflight\.totals\.subtotalCents/);
});

test('discount goes through real tax calculator and frozen payment claim', () => {
  assert.match(prepare, /merchandiseDiscountCents: evaluatedCoupon\?\.discountCents \?\? 0/);
  assert.match(prepare, /buildCouponPaymentSnapshot\(/);
  assert.match(prepare, /"payment\.amountCents": tax\.finalTotalCents,[\s\S]*?couponSnapshot/);
});
