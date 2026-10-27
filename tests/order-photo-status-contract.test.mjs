import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
test('status action offers photo option only alongside customer email', () => {
 const src=read('src/components/websites/orders/BloomWebsiteOrderActions.tsx');
 assert.match(src,/notifyCustomer && arrangementPhotos\.length > 0/);
 assert.match(src,/notificationPhotoId: notifyCustomer \? notificationPhotoId : ""/);
});
test('photo identity is checked on the scoped order', () => {
 const src=read('src/lib/bloom-websites/orders/updateBloomWebsiteOrderStatus.ts');
 assert.match(src,/shop: shopId/);
 assert.match(src,/order\.arrangementPhotos\.some/);
 assert.match(src,/INVALID_NOTIFICATION_PHOTO/);
});
test('delivery and pickup customer emails embed the selected photo', () => {
 const src=read('src/lib/bloom-websites/orders/sendBloomWebsiteOrderNotifications.ts');
 assert.equal((src.match(/\$\{selectedPhotoHtml\}/g)||[]).length,2);
 assert.match(src,/escapeHtml\(photo\.imageUrl\)/);
});
