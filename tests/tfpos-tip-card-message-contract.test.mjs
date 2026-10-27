import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/lib/bloom-websites/pos/tfpos/generateTfposXml.ts', import.meta.url), 'utf8');

test('positive tip is exported as a product named TIP for TFPOS inventory matching', () => {
  assert.match(source, /const tipCents = number\(order\?\.totals\?\.tipCents\)/);
  assert.match(source, /if \(tipCents > 0\)\s*\{[\s\S]*?productXml\(\{[\s\S]*?itemName: "TIP"/);
  assert.doesNotMatch(source, /itemName: "Gratuity"/);
});

test('missing card message remains an empty XML field, not a placeholder', () => {
  assert.match(source, /<cardMessage>\$\{xml\(clean\(order\?\.cardMessage\)\)\}<\/cardMessage>/);
  assert.doesNotMatch(source, /\[No Card Message\]/);
});

test('coupon and charge reconciliation fields remain in the XML', () => {
  assert.match(source, /<discountValue>/);
  assert.match(source, /<discountCode>/);
  assert.match(source, /<paymentTotal>/);
});
