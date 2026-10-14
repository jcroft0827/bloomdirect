import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
const proCron = JSON.parse(
  await readFile(new URL("../vercel.cron.pro.example.json", import.meta.url), "utf8"),
);
const nextConfig = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");

const requiredCronPaths = [
  "/api/internal/bloomwebsites/commerce-recovery",
  "/api/internal/webhooks/retry",
];

test("production cron config registers both recovery jobs", () => {
  const paths = new Set((vercel.crons || []).map((entry) => entry.path));

  for (const path of requiredCronPaths) {
    assert.equal(paths.has(path), true, `${path} should be scheduled`);
  }
});

test("Pro cron example keeps both recovery jobs on frequent schedules", () => {
  const entries = new Map((proCron.crons || []).map((entry) => [entry.path, entry.schedule]));

  for (const path of requiredCronPaths) {
    assert.equal(entries.has(path), true, `${path} should be in the Pro cron example`);
  }

  assert.equal(entries.get("/api/internal/bloomwebsites/commerce-recovery"), "*/10 * * * *");
  assert.equal(entries.get("/api/internal/webhooks/retry"), "*/5 * * * *");
});

test("global wildcard API CORS is not reintroduced", () => {
  assert.equal(
    nextConfig.includes('Access-Control-Allow-Origin", value: "*"'),
    false,
    "Do not restore wildcard CORS globally; add route-specific origins only when needed.",
  );
});
