// src/lib/bloom-websites/generateBloomWebsiteOrderNumber.ts

import { randomBytes } from "crypto";

const ORDER_NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomOrderCode(length: number) {
  const bytes = randomBytes(length);
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += ORDER_NUMBER_ALPHABET[
      bytes[index] % ORDER_NUMBER_ALPHABET.length
    ];
  }

  return value;
}

/**
 * Customer-facing BloomWebsite order number.
 *
 * Example:
 * BW-260909-7KM4QH
 *
 * The database unique index remains authoritative. Final
 * checkout should retry generation if a duplicate-key error
 * ever occurs rather than assuming randomness is a lock.
 */
export function generateBloomWebsiteOrderNumber(now = new Date()) {
  const year = String(now.getUTCFullYear()).slice(-2);
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  return `BW-${year}${month}${day}-${randomOrderCode(6)}`;
}
