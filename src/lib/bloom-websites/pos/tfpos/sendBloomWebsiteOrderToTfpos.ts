import crypto from "crypto";

import { connectToDB } from "@/lib/mongoose";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";
import BloomWebsitePosExport from "@/models/BloomWebsitePosExport";
import BloomWebsitePosIntegration from "@/models/BloomWebsitePosIntegration";
import {
  loadTfposIntegrationWithSecrets,
  tfposTransportConfigFromIntegration,
} from "@/lib/bloom-websites/pos/getBloomWebsitePosTransportConfig";
import { sendPosPayload } from "@/lib/bloom-websites/pos/transport/sendPosPayload";
import { getTfposSafePaymentDetails } from "@/lib/bloom-websites/pos/tfpos/getTfposSafePaymentDetails";
import { generateTfposXml } from "@/lib/bloom-websites/pos/tfpos/generateTfposXml";

export type TfposExportTrigger = "automatic" | "manual" | "retry" | "system";

export class BloomTfposExportError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 409) {
    super(message);
    this.name = "BloomTfposExportError";
    this.code = code;
    this.status = status;
  }
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeFilename(orderNumber: string) {
  const safe = String(orderNumber || "order")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${safe || "order"}.xml`;
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

async function createExportSnapshot({
  order,
  integration,
}: {
  order: any;
  integration: any;
}) {
  const payment = await getTfposSafePaymentDetails(order);
  const xml = generateTfposXml({
    order,
    payment,
    protocol: integration.transport?.protocol || "sftp",
    sourceVendor: integration.sourceVendor || "BloomWebsites",
  });

  const filename = safeFilename(order.orderNumber);

  try {
    return await BloomWebsitePosExport.create({
      shop: order.shop,
      website: order.website,
      order: order._id,
      integration: integration._id,
      provider: "tfpos",
      format: "xml",
      transportProtocol: integration.transport?.protocol || "sftp",
      status: "pending",
      remoteFilename: filename,
      payloadSha256: sha256(xml),
      payloadXml: xml,
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await BloomWebsitePosExport.findOne({
        order: order._id,
        integration: integration._id,
      });

      if (existing) return existing;
    }

    throw error;
  }
}

async function claimExportAttempt({
  exportId,
  trigger,
  protocol,
}: {
  exportId: unknown;
  trigger: TfposExportTrigger;
  protocol: "ftp" | "ftps" | "sftp";
}) {
  const current = await BloomWebsitePosExport.findById(exportId)
    .select("attempts status")
    .lean<any>();

  if (!current) {
    throw new BloomTfposExportError(
      "TFPOS_EXPORT_NOT_FOUND",
      "TFPOS export record could not be found.",
      404,
    );
  }

  const attempts = Array.isArray(current.attempts) ? current.attempts : [];
  const automaticAttemptExists = attempts.some(
    (attempt: any) => attempt?.trigger === "automatic",
  );

  /*
   * A paid order gets one automatic TFPOS delivery attempt. Browser recovery,
   * Stripe webhook redelivery, and cron reconciliation may all finalize the
   * same order concurrently; none of them should upload the same XML twice.
   * Failed automatic transfers remain available through the explicit
   * manual/retry workflow that already exists in the order UI.
   */
  if (trigger === "automatic" && automaticAttemptExists) {
    return {
      skipped: true as const,
      reason: "Automatic TFPOS export has already been attempted.",
    };
  }

  if (current.status === "processing") {
    if (trigger === "automatic") {
      return {
        skipped: true as const,
        reason: "Automatic TFPOS export is already in progress.",
      };
    }

    throw new BloomTfposExportError(
      "TFPOS_EXPORT_IN_PROGRESS",
      "This order is already being sent to The Floral POS.",
      409,
    );
  }

  const attemptNumber = attempts.length + 1;
  const now = new Date();

  const claimed = await BloomWebsitePosExport.findOneAndUpdate(
    {
      _id: exportId,
      status: { $ne: "processing" },
      ...(trigger === "automatic"
        ? {
            attempts: {
              $not: {
                $elemMatch: { trigger: "automatic" },
              },
            },
          }
        : {}),
    },
    {
      $set: {
        status: "processing",
        transportProtocol: protocol,
        lastAttemptAt: now,
        lastErrorCode: "",
        lastErrorMessage: "",
      },
      $push: {
        attempts: {
          attemptNumber,
          trigger,
          status: "processing",
          startedAt: now,
          completedAt: null,
          errorCode: "",
          errorMessage: "",
        },
      },
    },
    { new: true },
  );

  if (!claimed) {
    if (trigger === "automatic") {
      return {
        skipped: true as const,
        reason: "Automatic TFPOS export has already been claimed.",
      };
    }

    throw new BloomTfposExportError(
      "TFPOS_EXPORT_IN_PROGRESS",
      "This order is already being sent to The Floral POS.",
      409,
    );
  }

  return {
    skipped: false as const,
    exportRecord: claimed,
    attemptNumber,
  };
}

async function markAttemptUploaded({
  exportId,
  attemptNumber,
}: {
  exportId: unknown;
  attemptNumber: number;
}) {
  const now = new Date();

  await BloomWebsitePosExport.updateOne(
    { _id: exportId },
    {
      $set: {
        status: "uploaded",
        lastUploadedAt: now,
        lastErrorCode: "",
        lastErrorMessage: "",
        "attempts.$[attempt].status": "uploaded",
        "attempts.$[attempt].completedAt": now,
        "attempts.$[attempt].errorCode": "",
        "attempts.$[attempt].errorMessage": "",
      },
    },
    {
      arrayFilters: [{ "attempt.attemptNumber": attemptNumber }],
    },
  );

  await BloomWebsitePosExport.updateOne(
    { _id: exportId, firstUploadedAt: null },
    { $set: { firstUploadedAt: now } },
  );
}

async function markAttemptFailed({
  exportId,
  attemptNumber,
  error,
}: {
  exportId: unknown;
  attemptNumber: number;
  error: unknown;
}) {
  const message = error instanceof Error ? error.message : "Unknown transfer error.";
  const code =
    error instanceof BloomTfposExportError
      ? error.code
      : "TFPOS_TRANSPORT_FAILED";
  const now = new Date();

  await BloomWebsitePosExport.updateOne(
    { _id: exportId },
    {
      $set: {
        status: "failed",
        lastErrorCode: code,
        lastErrorMessage: message,
        "attempts.$[attempt].status": "failed",
        "attempts.$[attempt].completedAt": now,
        "attempts.$[attempt].errorCode": code,
        "attempts.$[attempt].errorMessage": message,
      },
    },
    {
      arrayFilters: [{ "attempt.attemptNumber": attemptNumber }],
    },
  );
}

export async function sendBloomWebsiteOrderToTfpos({
  orderId,
  shopId,
  trigger,
}: {
  orderId: string;
  shopId?: string;
  trigger: TfposExportTrigger;
}) {
  await connectToDB();

  const query: Record<string, unknown> = { _id: orderId };
  if (shopId) query.shop = shopId;

  const order = await BloomWebsiteOrder.findOne(query);

  if (!order) {
    throw new BloomTfposExportError(
      "TFPOS_ORDER_NOT_FOUND",
      "BloomWebsite order could not be found.",
      404,
    );
  }

  if (order.payment?.status !== "paid") {
    throw new BloomTfposExportError(
      "TFPOS_ORDER_NOT_PAID",
      "Only paid BloomWebsite orders can be sent to The Floral POS.",
      409,
    );
  }

  const integration = await loadTfposIntegrationWithSecrets({
    shopId: String(order.shop),
    websiteId: String(order.website),
  });

  if (!integration) {
    if (trigger === "automatic") {
      return {
        skipped: true as const,
        reason: "The Floral POS integration has not been configured.",
      };
    }

    throw new BloomTfposExportError(
      "TFPOS_NOT_CONFIGURED",
      "The Floral POS integration has not been configured.",
      409,
    );
  }

  if (trigger === "automatic" && integration.automaticExport === false) {
    return {
      skipped: true as const,
      reason: "Automatic TFPOS export is disabled.",
    };
  }

  if (!integration.enabled) {
    if (trigger === "automatic") {
      return {
        skipped: true as const,
        reason: "The Floral POS integration is disabled.",
      };
    }

    throw new BloomTfposExportError(
      "TFPOS_DISABLED",
      "Enable The Floral POS integration before sending orders.",
      409,
    );
  }

  const config = tfposTransportConfigFromIntegration(integration);

  let exportRecord = await BloomWebsitePosExport.findOne({
    order: order._id,
    integration: integration._id,
  });

  if (!exportRecord) {
    exportRecord = await createExportSnapshot({ order, integration });
  }

  const claim = await claimExportAttempt({
    exportId: exportRecord._id,
    trigger,
    protocol: config.protocol,
  });

  if (claim.skipped) {
    return claim;
  }

  const { attemptNumber } = claim;

  try {
    const upload = await sendPosPayload({
      config,
      filename: exportRecord.remoteFilename,
      payload: clean(exportRecord.payloadXml),
    });

    await markAttemptUploaded({
      exportId: exportRecord._id,
      attemptNumber,
    });

    return {
      skipped: false as const,
      success: true as const,
      exportId: String(exportRecord._id),
      filename: exportRecord.remoteFilename,
      remotePath: upload.remotePath,
      attemptNumber,
    };
  } catch (error) {
    await markAttemptFailed({
      exportId: exportRecord._id,
      attemptNumber,
      error,
    });

    if (error instanceof BloomTfposExportError) throw error;

    throw new BloomTfposExportError(
      "TFPOS_TRANSPORT_FAILED",
      error instanceof Error
        ? error.message
        : "Bloom could not upload the order to The Floral POS.",
      409,
    );
  }
}

export async function getBloomWebsiteTfposExportStatus({
  orderId,
  shopId,
}: {
  orderId: string;
  shopId: string;
}) {
  await connectToDB();

  const order = await BloomWebsiteOrder.findOne({
    _id: orderId,
    shop: shopId,
  })
    .select("_id website payment.status")
    .lean<any>();

  if (!order) {
    throw new BloomTfposExportError(
      "TFPOS_ORDER_NOT_FOUND",
      "BloomWebsite order could not be found.",
      404,
    );
  }

  const integration = await BloomWebsitePosIntegration.findOne({
    shop: shopId,
    website: order.website,
    provider: "tfpos",
  })
    .select("enabled automaticExport transport.protocol lastConnectionTest")
    .lean<any>();

  let exportRecord = null;

  if (integration) {
    exportRecord = await BloomWebsitePosExport.findOne({
      order: order._id,
      integration: integration._id,
    })
      .select(
        "status remoteFilename attempts firstUploadedAt lastUploadedAt lastAttemptAt lastErrorCode lastErrorMessage transportProtocol",
      )
      .lean<any>();
  }

  return {
    paid: order.payment?.status === "paid",
    integrationConfigured: Boolean(integration),
    integrationEnabled: Boolean(integration?.enabled),
    automaticExport: integration?.automaticExport !== false,
    protocol: integration?.transport?.protocol || "",
    lastConnectionTest: integration?.lastConnectionTest || null,
    export: exportRecord
      ? {
          id: String(exportRecord._id),
          status: exportRecord.status,
          filename: exportRecord.remoteFilename,
          transportProtocol: exportRecord.transportProtocol,
          firstUploadedAt: exportRecord.firstUploadedAt || null,
          lastUploadedAt: exportRecord.lastUploadedAt || null,
          lastAttemptAt: exportRecord.lastAttemptAt || null,
          lastErrorCode: exportRecord.lastErrorCode || "",
          lastErrorMessage: exportRecord.lastErrorMessage || "",
          attempts: Array.isArray(exportRecord.attempts)
            ? [...exportRecord.attempts].reverse().slice(0, 8)
            : [],
        }
      : null,
  };
}
