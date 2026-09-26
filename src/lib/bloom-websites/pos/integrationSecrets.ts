import crypto from "crypto";

type EncryptedIntegrationSecret = {
  encryptedValue: string;
  iv: string;
  authTag: string;
};

function getIntegrationEncryptionKey() {
  const configured = process.env.BLOOM_INTEGRATION_ENCRYPTION_KEY;

  if (!configured) {
    throw new Error(
      "BLOOM_INTEGRATION_ENCRYPTION_KEY is required before POS credentials can be saved.",
    );
  }

  const key = Buffer.from(configured, "base64");

  if (key.length !== 32) {
    throw new Error(
      "BLOOM_INTEGRATION_ENCRYPTION_KEY must decode to exactly 32 bytes.",
    );
  }

  return key;
}

export function encryptIntegrationSecret(
  value: string,
): EncryptedIntegrationSecret {
  const key = getIntegrationEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return {
    encryptedValue: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptIntegrationSecret({
  encryptedValue,
  iv,
  authTag,
}: EncryptedIntegrationSecret) {
  const key = getIntegrationEncryptionKey();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
