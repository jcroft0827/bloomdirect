import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeCouponSandboxPreparation, couponSandboxEnvironmentReady } from '../src/lib/bloom-websites/coupons/authorizeCouponSandboxPreparation.ts';
const token = 'abcdef0123456789abcdef0123456789';
const env = { NODE_ENV: 'development', STRIPE_SECRET_KEY: 'sk_test_example1234', BLOOM_COUPON_SANDBOX_TOKEN: token };
test('sandbox requires explicit development with test Stripe key', () => {
 assert.equal(couponSandboxEnvironmentReady(env), true);
 assert.equal(couponSandboxEnvironmentReady({...env, NODE_ENV: 'production'}), false);
 assert.equal(couponSandboxEnvironmentReady({...env, STRIPE_SECRET_KEY: 'sk_live_example'}), false);
 assert.equal(couponSandboxEnvironmentReady({...env, BLOOM_COUPON_SANDBOX_TOKEN: 'short'}), false);
});
test('coupon sandbox only authorizes a matching token for Stripe', () => {
 assert.equal(authorizeCouponSandboxPreparation({ token, paymentProvider:'stripe', env }), true);
 assert.equal(authorizeCouponSandboxPreparation({ token:'incorrect', paymentProvider:'stripe', env }), false);
 assert.equal(authorizeCouponSandboxPreparation({ token, paymentProvider:'fiserv', env }), false);
 assert.equal(authorizeCouponSandboxPreparation({ token, paymentProvider:'stripe', env:{...env, NODE_ENV:'production'} }), false);
});
