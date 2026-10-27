/** Opt-in READ ONLY diagnostic, never releases or commits coupon uses. */
import { MongoClient } from 'mongodb';
import { classifyCouponHold } from '../src/lib/bloom-websites/coupons/classifyCouponHold.ts';
const uri = process.env.COUPON_AUDIT_MONGODB_URI?.trim();
const dbName = process.env.COUPON_AUDIT_DATABASE?.trim();
if (!uri || !dbName || !/^[a-zA-Z0-9_-]{1,64}$/.test(dbName)) {
  console.error('Set COUPON_AUDIT_MONGODB_URI and COUPON_AUDIT_DATABASE explicitly. Nothing was accessed.');
  process.exitCode = 2;
} else {
  const client = new MongoClient(uri, {serverSelectionTimeoutMS:10000, maxPoolSize:2});
  try {
    await client.connect();
    const db = client.db(dbName);
    const coupons = db.collection('bloomwebsitecoupons');
    const attempts = db.collection('bloomwebsitecheckoutattempts');
    const cursor = coupons.find({'reservations.0':{$exists:true}}, {projection:{_id:1,shop:1,website:1,code:1,reservations:1,redeemedAttemptIds:1}}).limit(200);
    const findings = [];
    for await (const coupon of cursor) {
      for (const reservation of (coupon.reservations ?? []).slice(0,500)) {
        const attempt = await attempts.findOne({ attemptId: reservation.attemptId, shop: coupon.shop, website: coupon.website }, {projection:{status:1,couponSnapshot:1,'payment.providerPaymentId':1}});
        const finding = classifyCouponHold({couponId:String(coupon._id),attempt:attempt?{status:attempt.status,couponSnapshot:attempt.couponSnapshot,providerPaymentId:attempt.payment?.providerPaymentId}:null});
        findings.push({couponCode:coupon.code, couponId:String(coupon._id),attemptId:reservation.attemptId,holdUntil:reservation.expiresAt,category:finding});
      }
    }
    console.log(JSON.stringify({database:dbName,readOnly:true,scannedCouponLimit:200,findings,warning:'Do not release holds based only on this report; verify provider status and reconcile each attempt.'},null,2));
  } catch (err) {console.error('Audit failed:',err?.message || String(err));process.exitCode=1;}
  finally {await client.close();}
}
