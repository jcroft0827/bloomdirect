import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteMerchantConnection from "@/models/BloomWebsiteMerchantConnection";
import type {
  BloomMerchantConnectionSnapshot,
  BloomPaymentProviderName,
} from "./types";

function idString(value: unknown) {
  if (!value) return "";
  return typeof value === "string" ? value : String(value);
}

export class BloomMerchantReadinessError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 409) {
    super(message);
    this.name = "BloomMerchantReadinessError";
    this.code = code;
    this.status = status;
  }
}

export async function getBloomWebsiteMerchantReadiness({
  websiteId,
  provider: requestedProvider,
  requireReady = false,
}: {
  websiteId: string;
  provider?: BloomPaymentProviderName;
  requireReady?: boolean;
}) {
  await connectToDB();

  const website = await BloomWebsite.findById(websiteId)
    .select("_id shop paymentSettings")
    .lean<any>();

  if (!website) {
    throw new BloomMerchantReadinessError(
      "WEBSITE_NOT_FOUND",
      "BloomWebsite could not be found.",
      404,
    );
  }

  const provider = requestedProvider
    ? requestedProvider
    : (website.paymentSettings?.provider === "fiserv"
        ? "fiserv"
        : "stripe") as BloomPaymentProviderName;

  const connection = await BloomWebsiteMerchantConnection.findOne({
    website: website._id,
    shop: website.shop,
    provider,
  }).lean<any>();

  const snapshot: BloomMerchantConnectionSnapshot | null = connection
    ? {
        id: idString(connection._id),
        provider,
        status: connection.status || "disconnected",
        providerMerchantId: connection.providerMerchantId || "",
        providerAccountId: connection.providerAccountId || "",
        providerStoreId: connection.providerStoreId || "",
        credentialReference: connection.credentialReference || "",
        chargesEnabled: connection.chargesEnabled === true,
        payoutsEnabled: connection.payoutsEnabled === true,
        detailsSubmitted: connection.detailsSubmitted === true,
      }
    : null;

  const ready =
    website.paymentSettings?.enabled === true &&
    snapshot?.status === "active" &&
    snapshot.chargesEnabled === true &&
    snapshot.payoutsEnabled === true &&
    snapshot.detailsSubmitted === true;

  const response = {
    websiteId: idString(website._id),
    shopId: idString(website.shop),
    enabled: website.paymentSettings?.enabled === true,
    provider,
    ready,
    connection: snapshot,
  };

  if (requireReady && !ready) {
    throw new BloomMerchantReadinessError(
      "MERCHANT_NOT_READY",
      provider === "stripe"
        ? "This florist has not finished connecting Stripe for website payments."
        : "This florist has not finished connecting Fiserv for website payments.",
      409,
    );
  }

  return response;
}
