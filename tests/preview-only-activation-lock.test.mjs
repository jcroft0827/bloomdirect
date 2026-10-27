import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('new website activations default paused in all environments and can be explicitly opened', () => {
 const s=read('src/lib/prelaunchHold.ts');
 assert.match(s, /if \(value === "true"\) return true;/);
 assert.match(s, /if \(value === "false"\) return false;/);
 assert.match(s, /return true;/);
 assert.doesNotMatch(s, /return process\.env\.NODE_ENV === "production"/);
});
test('website billing server refuses new checkout before Stripe session creation', () => {
 const s=read('src/app/api/websites/billing/checkout/route.ts');
 assert.ok(s.indexOf('if (areNewBloomWebsiteActivationsPaused())') < s.indexOf('stripe.checkout.sessions.create'));
 assert.match(s, /WEBSITE_ACTIVATION_PAUSED/);
});
test('new publishing is blocked server-side but existing paused websites can resume', () => {
 const s=read('src/app/api/websites/launch/route.ts');
 assert.match(s, /body\.action === "publish" && areNewBloomWebsiteActivationsPaused\(\)/);
 assert.match(s, /"resume"/);
});
test('launch passes paused flag and billing component hides Subscribe button', () => {
 const p=read('src/app/dashboard/websites/launch/page.tsx');
 const c=read('src/components/websites/BloomWebsiteBillingCard.tsx');
 assert.match(p, /activationsPaused=\{areNewBloomWebsiteActivationsPaused\(\)\}/);
 assert.match(c, /\{activationsPaused \? \(/);
 assert.match(c, /Publishing coming soon/);
 assert.match(c, /if \(billing\.hasAccess\)/);
});
test('public signup stays open and GBD Pro checkout independent', () => {
 const s=read('src/lib/prelaunchHold.ts');
 assert.match(s, /BLOOM_PRELAUNCH_HOLD/);
 assert.doesNotMatch(read('src/app/api/billing/checkout/route.ts'), /areNewBloomWebsiteActivationsPaused/);
});
