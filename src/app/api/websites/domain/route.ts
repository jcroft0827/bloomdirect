import { randomBytes } from "crypto";
import { resolveTxt } from "dns/promises";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { removeBloomWebsiteDomainFromVercel } from "@/lib/bloom-websites/vercel-domain-provisioning";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VERIFICATION_PREFIX = "bloom-site-verification=";

function normalizeDomain(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  let candidate = value.trim().toLowerCase();

  candidate = candidate.replace(/^https?:\/\//, "");
  candidate = candidate.replace(/\/.*$/, "");
  candidate = candidate.replace(/\.$/, "");

  return candidate;
}

function isValidDomain(domain: string) {
  if (!domain || domain.length > 253 || domain.includes(" ")) {
    return false;
  }

  if (
    domain === "localhost" ||
    domain.endsWith(".localhost") ||
    domain === "getbloomdirect.com" ||
    domain.endsWith(".getbloomdirect.com")
  ) {
    return false;
  }

  const labels = domain.split(".");

  if (labels.length < 2) {
    return false;
  }

  return labels.every((label) => {
    if (!label || label.length > 63) {
      return false;
    }

    return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label);
  });
}

function createVerificationToken() {
  return randomBytes(24).toString("hex");
}

function isDuplicateKeyError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: unknown }).code === 11000,
  );
}

function getVerificationRecord(domain: string, token: string) {
  return {
    type: "TXT" as const,
    name: `_bloomverify.${domain}`,
    value: `${VERIFICATION_PREFIX}${token}`,
  };
}

async function getSessionShop(): Promise<
  | {
      shopId: string;
    }
  | {
      response: NextResponse;
    }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  await connectToDB();

  const shop = await Shop.findById(session.user.id)
    .select("_id isSuspended")
    .lean<{ _id: unknown; isSuspended?: boolean } | null>();

  if (!shop) {
    return {
      response: NextResponse.json(
        { error: "Shop not found." },
        { status: 404 },
      ),
    };
  }

  if (shop.isSuspended) {
    return {
      response: NextResponse.json(
        { error: "Suspended shops cannot update their BloomWebsite." },
        { status: 403 },
      ),
    };
  }

  return {
    shopId: session.user.id,
  };
}

export async function GET() {
  try {
    const auth = await getSessionShop();

    if ("response" in auth) {
      return auth.response;
    }

    const website = await BloomWebsite.findOne({
      shop: auth.shopId,
    }).select(
      "_id status customDomain domainVerified domainVerificationToken domainVerifiedAt domainRoutingReady domainRoutingVerifiedAt",
    );

    if (!website) {
      return NextResponse.json(
        { error: "BloomWebsite not found." },
        { status: 404 },
      );
    }

    const customDomain = normalizeDomain(website.customDomain);

    if (!customDomain) {
      return NextResponse.json({
        success: true,
        website: {
          id: website._id.toString(),
          customDomain: "",
          domainVerified: false,
          domainVerifiedAt: null,
          verification: null,
        },
      });
    }

    if (!website.domainVerificationToken) {
      website.domainVerificationToken = createVerificationToken();
      website.domainVerified = false;
      website.domainVerifiedAt = null;
      await website.save();
    }

    return NextResponse.json({
      success: true,
      website: {
        id: website._id.toString(),
        customDomain,
        domainVerified: Boolean(website.domainVerified),
        domainVerifiedAt: website.domainVerifiedAt ?? null,
        verification: getVerificationRecord(
          customDomain,
          website.domainVerificationToken,
        ),
      },
    });
  } catch (error) {
    console.error("Failed to load BloomWebsite domain:", error);

    return NextResponse.json(
      { error: "Failed to load your website domain." },
      { status: 500 },
    );
  }
}

type UpdateDomainBody = {
  customDomain?: unknown;
};

export async function PATCH(request: Request) {
  try {
    const auth = await getSessionShop();

    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json()) as UpdateDomainBody;
    const customDomain = normalizeDomain(body.customDomain);

    if (!isValidDomain(customDomain)) {
      return NextResponse.json(
        {
          error:
            "Enter a valid domain such as flowershop.com or www.flowershop.com.",
        },
        { status: 400 },
      );
    }

    const website = await BloomWebsite.findOne({
      shop: auth.shopId,
    }).select(
      "_id status customDomain domainVerified domainVerificationToken domainVerifiedAt domainRoutingReady domainRoutingVerifiedAt",
    );

    if (!website) {
      return NextResponse.json(
        { error: "BloomWebsite not found." },
        { status: 404 },
      );
    }

    const existingDomain = normalizeDomain(website.customDomain);
    const domainChanged = existingDomain !== customDomain;

    if (domainChanged && website.status === "live") {
      return NextResponse.json(
        {
          error:
            "Pause your BloomWebsite before changing its public domain.",
        },
        { status: 409 },
      );
    }

    /*
     * This lookup gives the florist a friendly error before the
     * write. The database unique index is still authoritative,
     * because two shops can race between this lookup and update.
     */
    const conflictingWebsite = await BloomWebsite.findOne({
      _id: { $ne: website._id },
      customDomain,
    })
      .select("_id")
      .lean();

    if (conflictingWebsite) {
      return NextResponse.json(
        {
          error:
            "That domain is already connected to another BloomWebsite.",
        },
        { status: 409 },
      );
    }

    if (!domainChanged) {
      if (!website.domainVerificationToken) {
        website.domainVerificationToken = createVerificationToken();
        website.domainVerified = false;
        website.domainVerifiedAt = null;
        await website.save();
      }

      return NextResponse.json({
        success: true,
        website: {
          id: website._id.toString(),
          customDomain,
          domainVerified: Boolean(website.domainVerified),
          domainVerifiedAt: website.domainVerifiedAt ?? null,
          verification: getVerificationRecord(
            customDomain,
            website.domainVerificationToken,
          ),
        },
      });
    }

    const previousState = {
      customDomain: existingDomain,
      domainVerified: Boolean(website.domainVerified),
      domainVerificationToken: website.domainVerificationToken || "",
      domainVerifiedAt: website.domainVerifiedAt ?? null,
      domainRoutingReady: Boolean(website.domainRoutingReady),
      domainRoutingVerifiedAt: website.domainRoutingVerifiedAt ?? null,
    };

    const nextVerificationToken = createVerificationToken();

    let updatedWebsite;

    try {
      /*
       * Reserve the new hostname in MongoDB before changing any
       * external hosting state. The unique partial index makes
       * this write race-safe across shops.
       */
      updatedWebsite = await BloomWebsite.findOneAndUpdate(
        {
          _id: website._id,
          shop: auth.shopId,
          status: { $ne: "live" },
          customDomain: website.customDomain,
        },
        {
          $set: {
            customDomain,
            domainVerified: false,
            domainVerificationToken: nextVerificationToken,
            domainVerifiedAt: null,
            domainRoutingReady: false,
            domainRoutingVerifiedAt: null,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      ).select(
        "_id customDomain domainVerified domainVerificationToken domainVerifiedAt",
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return NextResponse.json(
          {
            error:
              "That domain is already connected to another BloomWebsite.",
          },
          { status: 409 },
        );
      }

      throw error;
    }

    if (!updatedWebsite) {
      return NextResponse.json(
        {
          error:
            "The website changed before Bloom could save this domain. Refresh and try again.",
        },
        { status: 409 },
      );
    }

    if (existingDomain) {
      try {
        const detachResult =
          await removeBloomWebsiteDomainFromVercel(existingDomain);

        if (!detachResult.removed) {
          throw new Error(detachResult.message);
        }
      } catch (error) {
        await BloomWebsite.updateOne(
          {
            _id: website._id,
            shop: auth.shopId,
            customDomain,
          },
          {
            $set: previousState,
          },
        );

        console.error(
          "Failed to detach previous BloomWebsite domain:",
          error,
        );

        return NextResponse.json(
          {
            error:
              "Bloom could not safely detach the existing domain from hosting, so the domain change was cancelled. Try again shortly.",
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      website: {
        id: updatedWebsite._id.toString(),
        customDomain: updatedWebsite.customDomain || "",
        domainVerified: false,
        domainVerifiedAt: null,
        verification: getVerificationRecord(
          customDomain,
          updatedWebsite.domainVerificationToken,
        ),
      },
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        {
          error:
            "That domain is already connected to another BloomWebsite.",
        },
        { status: 409 },
      );
    }

    console.error("Failed to update BloomWebsite domain:", error);

    return NextResponse.json(
      { error: "Failed to save your website domain." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const auth = await getSessionShop();

    if ("response" in auth) {
      return auth.response;
    }

    const website = await BloomWebsite.findOne({
      shop: auth.shopId,
    }).select(
      "_id status customDomain domainVerified domainVerificationToken domainVerifiedAt domainRoutingReady domainRoutingVerifiedAt",
    );

    if (!website) {
      return NextResponse.json(
        { error: "BloomWebsite not found." },
        { status: 404 },
      );
    }

    const existingDomain = normalizeDomain(website.customDomain);

    if (!existingDomain) {
      return NextResponse.json({
        success: true,
        website: {
          id: website._id.toString(),
          customDomain: "",
          domainVerified: false,
          domainVerifiedAt: null,
          verification: null,
        },
      });
    }

    if (website.status === "live") {
      return NextResponse.json(
        {
          error:
            "Pause your BloomWebsite before removing its public domain.",
        },
        { status: 409 },
      );
    }

    const detachResult =
      await removeBloomWebsiteDomainFromVercel(existingDomain);

    if (!detachResult.removed) {
      return NextResponse.json(
        {
          error:
            "Bloom could not safely detach this domain from hosting. Try again after the hosting connection is available.",
        },
        { status: 409 },
      );
    }

    website.customDomain = "";
    website.domainVerified = false;
    website.domainVerificationToken = "";
    website.domainVerifiedAt = null;
    website.domainRoutingReady = false;
    website.domainRoutingVerifiedAt = null;

    await website.save();

    return NextResponse.json({
      success: true,
      website: {
        id: website._id.toString(),
        customDomain: "",
        domainVerified: false,
        domainVerifiedAt: null,
        verification: null,
      },
    });
  } catch (error) {
    console.error("Failed to remove BloomWebsite domain:", error);

    return NextResponse.json(
      { error: "Failed to remove your website domain." },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const auth = await getSessionShop();

    if ("response" in auth) {
      return auth.response;
    }

    const website = await BloomWebsite.findOne({
      shop: auth.shopId,
    }).select(
      "_id status customDomain domainVerified domainVerificationToken domainVerifiedAt domainRoutingReady domainRoutingVerifiedAt",
    );

    if (!website) {
      return NextResponse.json(
        { error: "BloomWebsite not found." },
        { status: 404 },
      );
    }

    const customDomain = normalizeDomain(website.customDomain);

    if (!customDomain) {
      return NextResponse.json(
        { error: "Save a custom domain before checking verification." },
        { status: 400 },
      );
    }

    if (!website.domainVerificationToken) {
      website.domainVerificationToken = createVerificationToken();
      website.domainVerified = false;
      website.domainVerifiedAt = null;
      await website.save();
    }

    const verification = getVerificationRecord(
      customDomain,
      website.domainVerificationToken,
    );

    let records: string[][];

    try {
      records = await resolveTxt(verification.name);
    } catch (error) {
      const dnsError = error as NodeJS.ErrnoException;

      if (
        dnsError.code === "ENODATA" ||
        dnsError.code === "ENOTFOUND" ||
        dnsError.code === "ESERVFAIL" ||
        dnsError.code === "ETIMEOUT"
      ) {
        return NextResponse.json(
          {
            error:
              "Bloom cannot see the verification record yet. DNS changes can take time to propagate, so check the record and try again shortly.",
            verified: false,
            verification,
          },
          { status: 409 },
        );
      }

      throw error;
    }

    const values = records.map((record) => record.join(""));
    const matched = values.some((value) => value.trim() === verification.value);

    if (!matched) {
      return NextResponse.json(
        {
          error:
            "A TXT record was found, but it does not match this BloomWebsite's verification value.",
          verified: false,
          verification,
        },
        { status: 409 },
      );
    }

    website.domainVerified = true;
    website.domainVerifiedAt = new Date();

    await website.save();

    return NextResponse.json({
      success: true,
      verified: true,
      website: {
        id: website._id.toString(),
        customDomain,
        domainVerified: true,
        domainVerifiedAt: website.domainVerifiedAt,
        verification,
      },
    });
  } catch (error) {
    console.error("Failed to verify BloomWebsite domain:", error);

    return NextResponse.json(
      { error: "Bloom could not verify your domain right now." },
      { status: 500 },
    );
  }
}
