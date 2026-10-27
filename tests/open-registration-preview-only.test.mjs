import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
test("public registration defaults open; emergency closure is explicit", () => {
 const s=read("src/lib/prelaunchHold.ts");
 assert.match(s, /BLOOM_PRELAUNCH_HOLD\?\.trim\(\)\.toLowerCase\(\) === "true"/);
 assert.match(s, /return process.env.NODE_ENV === "production"/);
});
test("website checkout and initial publishing enforce activation hold", () => {
 assert.match(read("src/app/api/websites/billing/checkout/route.ts"), /areNewBloomWebsiteActivationsPaused\(\)/);
 assert.match(read("src/app/api/websites/launch/route.ts"), /body.action === "publish" && areNewBloomWebsiteActivationsPaused\(\)/);
});
test("GBD Pro subscription remains independent", () => {
 assert.doesNotMatch(read("src/app/api/billing/checkout/route.ts"), /isPrelaunchHoldEnabled|areNewBloomWebsiteActivationsPaused/);
});
