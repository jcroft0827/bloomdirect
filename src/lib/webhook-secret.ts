import crypto from "crypto";

const algorithm = "aes-256-gcm";

const encryptionKeyBase64 = process.env.WEBHOOK_ENCRYPTION_KEY;

if (!encryptionKeyBase64) {
  throw new Error("Missing WEBHOOK_ENCRYPTION_KEY environment variable.");
}

const encryptionKey = Buffer.from(encryptionKeyBase64, "base64");

if (encryptionKey.length !== 32) {
  throw new Error(
    "WEBHOOK_ENCRYPTION_KEY must decode to exactly 32 bytes.",
  );
}

export function generateWebhookSecret() {
  return `whsec_${crypto.randomBytes(32).toString("hex")}`;
}

export function encryptWebhookSecret(secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    algorithm,
    encryptionKey,
    iv,
  );

  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encryptedSecret: encrypted.toString("base64"),
    encryptionIv: iv.toString("base64"),
    encryptionAuthTag: authTag.toString("base64"),
  };
}

export function decryptWebhookSecret({
  encryptedSecret,
  encryptionIv,
  encryptionAuthTag,
}: {
  encryptedSecret: string;
  encryptionIv: string;
  encryptionAuthTag: string;
}) {
  const decipher = crypto.createDecipheriv(
    algorithm,
    encryptionKey,
    Buffer.from(encryptionIv, "base64"),
  );

  decipher.setAuthTag(
    Buffer.from(encryptionAuthTag, "base64"),
  );

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(encryptedSecret, "base64"),
    ),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}