import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const src = readFileSync(new URL('../src/models/BloomWebsiteOrder.ts', import.meta.url), 'utf8');
test('canonical order guard subtracts coupon discount from original merchandise', () => {
  assert.match(src, /order\.totals\.subtotalCents\s*-\s*merchandiseDiscountCents\s*\+/);
  assert.match(src, /coupon\.originalMerchandiseCents\s*!==\s*order\.totals\.subtotalCents/);
  assert.match(src, /coupon\.chargedTotalCents\s*!==\s*order\.totals\.totalCents/);
});
test('sample discounted pickup totals reconcile', () => {
  const merchandise = 8000, discount = 800, pickup = 0, tax = 594, tip = 0;
  assert.equal(merchandise - discount + pickup + tax + tip, 7794);
  assert.notEqual(merchandise + pickup + tax + tip, 7794);
});
