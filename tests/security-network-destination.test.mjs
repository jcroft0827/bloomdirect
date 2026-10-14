import test from "node:test";
import assert from "node:assert/strict";

import { isBlockedNetworkAddress } from "../src/lib/security-network-destination.ts";

const blockedAddresses = [
  "0.0.0.1",
  "10.0.0.1",
  "100.64.0.1",
  "127.0.0.1",
  "169.254.169.254",
  "172.16.0.1",
  "192.168.1.10",
  "198.18.0.1",
  "192.0.2.1",
  "198.51.100.1",
  "203.0.113.1",
  "224.0.0.1",
  "240.0.0.1",
  "::",
  "::1",
  "fc00::1",
  "fe80::1",
  "ff00::1",
  "2001:db8::1",
];

const publicAddresses = [
  "1.1.1.1",
  "8.8.8.8",
  "9.9.9.9",
  "2606:4700:4700::1111",
  "2001:4860:4860::8888",
];

test("blocks private, loopback, link-local, documentation, multicast and reserved destinations", () => {
  for (const address of blockedAddresses) {
    assert.equal(
      isBlockedNetworkAddress(address),
      true,
      `${address} should be blocked`,
    );
  }
});

test("allows representative public IP addresses", () => {
  for (const address of publicAddresses) {
    assert.equal(
      isBlockedNetworkAddress(address),
      false,
      `${address} should be allowed`,
    );
  }
});

test("fails closed for malformed/non-IP input", () => {
  assert.equal(isBlockedNetworkAddress("not-an-ip"), true);
  assert.equal(isBlockedNetworkAddress(""), true);
});
