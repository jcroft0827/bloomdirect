import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_BLOOM_WEBSITE_STATUS_NOTIFICATIONS,
  getBloomWebsiteOrderStatusLabel,
  shouldNotifyBloomWebsiteStatus,
} from "../src/lib/bloom-websites/orders/fulfillment-status.ts";

test("fulfillment labels are florist-friendly", () => {
  assert.equal(getBloomWebsiteOrderStatusLabel("placed", "delivery"), "New");
  assert.equal(getBloomWebsiteOrderStatusLabel("in_preparation", "delivery"), "Designing");
  assert.equal(getBloomWebsiteOrderStatusLabel("preparation_complete", "delivery"), "Ready");
  assert.equal(getBloomWebsiteOrderStatusLabel("delivery_attempted", "delivery"), "Delivery Attempted");
  assert.equal(getBloomWebsiteOrderStatusLabel("fulfilled", "delivery"), "Delivered");
  assert.equal(getBloomWebsiteOrderStatusLabel("fulfilled", "pickup"), "Picked Up");
});

test("default notification policy avoids noisy design updates", () => {
  assert.equal(DEFAULT_BLOOM_WEBSITE_STATUS_NOTIFICATIONS.designing, false);
  assert.equal(DEFAULT_BLOOM_WEBSITE_STATUS_NOTIFICATIONS.ready, false);
  assert.equal(DEFAULT_BLOOM_WEBSITE_STATUS_NOTIFICATIONS.outForDelivery, true);
  assert.equal(DEFAULT_BLOOM_WEBSITE_STATUS_NOTIFICATIONS.deliveryAttempted, true);
  assert.equal(DEFAULT_BLOOM_WEBSITE_STATUS_NOTIFICATIONS.delivered, true);
  assert.equal(DEFAULT_BLOOM_WEBSITE_STATUS_NOTIFICATIONS.canceled, true);
});

test("delivery and pickup completion use separate notification settings", () => {
  const policy = {
    ...DEFAULT_BLOOM_WEBSITE_STATUS_NOTIFICATIONS,
    delivered: false,
    pickedUp: true,
  };

  assert.equal(
    shouldNotifyBloomWebsiteStatus(policy, "fulfilled", "delivery"),
    false,
  );
  assert.equal(
    shouldNotifyBloomWebsiteStatus(policy, "fulfilled", "pickup"),
    true,
  );
});
