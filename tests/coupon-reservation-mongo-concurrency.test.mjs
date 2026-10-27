/**
 * Stage 3B2H: opt-in, live MongoDB concurrency verification.
 * Usage: $env:COUPON_TEST_MONGODB_URI = "mongodb+srv://..."
 *        node --test tests/coupon-reservation-mongo-concurrency.test.mjs
 * Uses an isolated database and uniquely named temporary collection.
 * Does NOT connect to the application's normal database or touch its coupons.
 * Exercises the same single-document Mongo operators used by reserveCouponUse.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.COUPON_TEST_MONGODB_URI?.trim();
const DATABASE = 'BloomCouponConcurrencyTest';
const token = randomUUID().replace(/-/g, '');
const collectionName = `coupon_reservations_${token}`;

const suite = test;

suite('Stage 3B2H: real MongoDB coupon reservation/recovery race', { skip: !uri ? 'Set COUPON_TEST_MONGODB_URI to opt in; no database was touched.' : false, timeout: 45000 }, async () => {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  let created = false;
  try {
    await client.connect();
    const db = client.db(DATABASE);
    const col = db.collection(collectionName);
    await db.createCollection(collectionName);
    created = true;

    const shop = new ObjectId(), website = new ObjectId();
    const scope = { shop, website };
    const couponId = new ObjectId();
    await col.insertOne({ _id: couponId, ...scope, code: 'TESTONLY', isActive: true, usageLimit: 1, redemptionCount: 0, reservations: [], redeemedAttemptIds: [] });
    const couponScope = { _id: couponId, ...scope };

    async function reserve(attemptId) {
      const existing = await col.findOne({ ...couponScope, 'reservations.attemptId': attemptId }, { projection: { _id: 1 } });
      if (existing) return 'already_reserved';
      const cap = { $expr: { $and: [
        { $lt: [{ $size: { $ifNull: ['$reservations', []] } }, 500] },
        { $or: [ { $eq: ['$usageLimit', null] }, { $lt: [ { $add: ['$redemptionCount', { $size: { $ifNull: ['$reservations', []] } }] }, '$usageLimit' ] } ] },
      ] } };
      const res = await col.updateOne({ ...couponScope, isActive: true, redeemedAttemptIds: { $ne: attemptId }, 'reservations.attemptId': { $ne: attemptId }, $and: [cap] }, { $push: { reservations: { attemptId, expiresAt: new Date(Date.now() + 600000) } } });
      if (res.modifiedCount === 1) return 'reserved';
      return await col.findOne({ ...couponScope, 'reservations.attemptId': attemptId }) ? 'already_reserved' : 'unavailable';
    }
    async function commit(attemptId) {
      const res = await col.updateOne({ ...couponScope, 'reservations.attemptId': attemptId, redeemedAttemptIds: { $ne: attemptId } }, { $pull: { reservations: { attemptId } }, $addToSet: { redeemedAttemptIds: attemptId }, $inc: { redemptionCount: 1 } });
      if (res.modifiedCount) return 'committed';
      if (await col.findOne({ ...couponScope, redeemedAttemptIds: attemptId })) return 'already_committed';
      throw new Error('Missing reservation');
    }
    async function release(attemptId) {
      const res = await col.updateOne({ ...couponScope, 'reservations.attemptId': attemptId }, { $pull: { reservations: { attemptId } } });
      return res.modifiedCount === 1;
    }

    // Two separate checkout attempts competing for last capacity.
    const attempts = ['checkout_aaaaaaaa', 'checkout_bbbbbbbb'];
    const outcome = await Promise.all(attempts.map(reserve));
    assert.equal(outcome.filter(x => x === 'reserved').length, 1, JSON.stringify(outcome));
    assert.equal(outcome.filter(x => x === 'unavailable').length, 1, JSON.stringify(outcome));
    const winner = attempts[outcome.indexOf('reserved')], loser = attempts[outcome.indexOf('unavailable')];
    assert.equal(await reserve(winner), 'already_reserved');
    assert.equal(await reserve(loser), 'unavailable');

    // Pending payment hold does not vanish or count as a redemption.
    let doc = await col.findOne(couponScope);
    assert.equal(doc.redemptionCount, 0);
    assert.deepEqual(doc.reservations.map(x => x.attemptId), [winner]);

    // Committing after verified payment is idempotent through retried webhooks.
    assert.equal(await commit(winner), 'committed');
    const repeat = await Promise.all(Array.from({ length: 8 }, () => commit(winner)));
    assert.deepEqual(new Set(repeat), new Set(['already_committed']));
    doc = await col.findOne(couponScope);
    assert.equal(doc.redemptionCount, 1);
    assert.equal(doc.reservations.length, 0);
    assert.deepEqual(doc.redeemedAttemptIds, [winner]);
    assert.equal(await reserve(loser), 'unavailable');

    // A *different* coupon verifies release is idempotent and capacity returns.
    const secondId = new ObjectId();
    await col.insertOne({ _id: secondId, ...scope, isActive: true, usageLimit: 1, redemptionCount: 0, reservations: [], redeemedAttemptIds: [] });
    const oldId = couponScope._id;
    couponScope._id = secondId;
    assert.equal(await reserve('checkout_cccccccc'), 'reserved');
    assert.equal(await release('checkout_cccccccc'), true);
    assert.equal(await release('checkout_cccccccc'), false);
    assert.equal(await reserve('checkout_dddddddd'), 'reserved');
    assert.equal(await commit('checkout_dddddddd'), 'committed');
    couponScope._id = oldId;

    // Scope isolation: a different florist cannot touch a reservation.
    const wrongShop = await col.updateOne({ _id: couponId, shop: new ObjectId(), website, 'reservations.attemptId': winner }, { $pull: { reservations: { attemptId: winner } } });
    assert.equal(wrongShop.modifiedCount, 0);
    console.log('PASS: atomic last-slot race, retry, capacity, idempotent commit, release, and shop isolation.');
  } finally {
    if (created) await client.db(DATABASE).collection(collectionName).drop();
    await client.close();
  }
});
