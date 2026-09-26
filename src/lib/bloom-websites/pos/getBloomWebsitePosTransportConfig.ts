import BloomWebsitePosIntegration from "@/models/BloomWebsitePosIntegration";
import { decryptIntegrationSecret } from "@/lib/bloom-websites/pos/integrationSecrets";
import type {
  BloomPosTransportConfig,
  BloomPosTransportProtocol,
} from "@/lib/bloom-websites/pos/transport/sendPosPayload";

export type BloomWebsiteTfposIntegrationLean = {
  _id: unknown;
  shop: unknown;
  website: unknown;
  provider: "tfpos";
  enabled: boolean;
  automaticExport: boolean;
  sourceVendor?: string;
  transport?: {
    protocol?: BloomPosTransportProtocol;
    host?: string;
    port?: number;
    folder?: string;
    username?: string;
    encryptedPassword?: string;
    passwordIv?: string;
    passwordAuthTag?: string;
  };
  payloadEncryption?: {
    mode?: "none" | "xor" | "3des";
  };
};

export function validateTfposIntegrationForTransport(
  integration: BloomWebsiteTfposIntegrationLean,
  options: { requireEnabled?: boolean } = {},
) {
  const transport = integration.transport || {};
  const host = String(transport.host || "").trim();
  const username = String(transport.username || "").trim();
  const protocol = transport.protocol || "sftp";
  const port = Number(transport.port || (protocol === "sftp" ? 22 : 21));

  if (options.requireEnabled !== false && !integration.enabled) {
    throw new Error("The Floral POS integration is disabled.");
  }

  if (!host) {
    throw new Error("The Floral POS server address is missing.");
  }

  if (!username) {
    throw new Error("The Floral POS username is missing.");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("The Floral POS port is invalid.");
  }

  if (integration.payloadEncryption?.mode && integration.payloadEncryption.mode !== "none") {
    throw new Error(
      "Bloom currently supports TFPOS payload encryption mode NONE only. Set the TFPOS Website Config encryption type to NONE for this connection.",
    );
  }
}

export function tfposTransportConfigFromIntegration(
  integration: BloomWebsiteTfposIntegrationLean,
  options: { requireEnabled?: boolean } = {},
): BloomPosTransportConfig {
  validateTfposIntegrationForTransport(integration, options);

  const transport = integration.transport || {};
  const encryptedValue = String(transport.encryptedPassword || "");
  const iv = String(transport.passwordIv || "");
  const authTag = String(transport.passwordAuthTag || "");

  if (!encryptedValue || !iv || !authTag) {
    throw new Error("The Floral POS password has not been saved yet.");
  }

  const protocol = transport.protocol || "sftp";

  return {
    protocol,
    host: String(transport.host || "").trim(),
    port: Number(transport.port || (protocol === "sftp" ? 22 : 21)),
    folder: String(transport.folder || "/").trim() || "/",
    username: String(transport.username || "").trim(),
    password: decryptIntegrationSecret({
      encryptedValue,
      iv,
      authTag,
    }),
  };
}

export async function loadTfposIntegrationWithSecrets({
  shopId,
  websiteId,
}: {
  shopId: string;
  websiteId: string;
}) {
  return BloomWebsitePosIntegration.findOne({
    shop: shopId,
    website: websiteId,
    provider: "tfpos",
  })
    .select(
      "+transport.encryptedPassword +transport.passwordIv +transport.passwordAuthTag",
    )
    .lean<BloomWebsiteTfposIntegrationLean | null>();
}
