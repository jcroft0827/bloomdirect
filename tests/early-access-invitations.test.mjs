import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('invitation issuance hashes token and binds link to register',()=>{
const src=read('src/lib/admin/sendFloristInvitation.ts');
assert.match(src,/randomBytes\(32\)/);
assert.match(src,/createHash\("sha256"\)/);
assert.match(src,/register\?earlyAccess=/);
});
test('registration requires invitation tied to exact email under hold',()=>{
const src=read('src/app/api/register/route.ts');
assert.match(src,/isPrelaunchHoldEnabled\(\)/);
assert.match(src,/email: normalizedEmail, status: "sent", earlyAccessTokenHash: tokenHash/);
assert.match(src,/earlyAccessExpiresAt: \{ \$gt: new Date\(\) \}/);
});
test('subscription checkout remains held while existing login is untouched',()=>{
assert.match(read('src/app/api/websites/billing/checkout/route.ts'),/isPrelaunchHoldEnabled/);
assert.match(read('src/app/api/billing/checkout/route.ts'),/isPrelaunchHoldEnabled/);
});
