import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),'utf8');
test('registration and subscription endpoints enforce hold on server', () => {
 assert.match(read('src/app/api/register/route.ts'), /if \(isPrelaunchHoldEnabled\(\)\)/);
 assert.match(read('src/app/api/register/route.ts'), /INVITATION_REQUIRED/);
 for (const file of ['src/app/api/websites/billing/checkout/route.ts','src/app/api/billing/checkout/route.ts']) {
  const source=read(file);
  assert.match(source, /if \(isPrelaunchHoldEnabled\(\)\)/);
  assert.match(source, /PRELAUNCH_HOLD/);
 }
});
test('registration page displays hold without client registration form',()=>{
 const source=read('src/app/register/page.tsx');
 assert.match(source,/if \(isPrelaunchHoldEnabled\(\) && !hasInvitation\)/);
 assert.match(source,/New registrations are temporarily paused/);
});
test('existing verification, portals, billing changes are left untouched',()=>{
 for(const file of ['src/app/api/register/confirm-verification/route.ts','src/app/api/websites/billing/portal/route.ts','src/app/api/websites/billing/change-plan/route.ts','src/app/api/billing/portal/route.ts']) assert.doesNotMatch(read(file), /PRELAUNCH_HOLD/);
});
