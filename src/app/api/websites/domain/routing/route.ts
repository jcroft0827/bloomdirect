import authOptions from "@/lib/auth";
import {
  addBloomWebsiteDomainToVercel,
  getBloomWebsiteVercelStatus,
} from "@/lib/bloom-websites/vercel-domain-provisioning";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type WebsiteLean = {
  _id: unknown;
  customDomain?: string;
  domainVerified?: boolean;
  domainRoutingReady?: boolean;
  domainRoutingVerifiedAt?: Date | null;
};

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
        { error: "Suspended shops cannot configure website routing." },
        { status: 403 },
      ),
    };
  }

  return {
    shopId: session.user.id,
  };
}

async function getWebsite(shopId: string) {
  return BloomWebsite.findOne({
    shop: shopId,
  }).select(
    "_id customDomain domainVerified domainRoutingReady domainRoutingVerifiedAt",
  );
}

async function persistRoutingStatus(
  website: Awaited<ReturnType<typeof getWebsite>>,
  routingReady: boolean,
) {
  if (!website) {
    return;
  }

  const wasReady = Boolean(website.domainRoutingReady);

  website.domainRoutingReady = routingReady;

  if (routingReady) {
    if (!wasReady || !website.domainRoutingVerifiedAt) {
      website.domainRoutingVerifiedAt = new Date();
    }
  } else {
    website.domainRoutingVerifiedAt = null;
  }

  await website.save();
}

export async function GET() {
  try {
    const auth = await getSessionShop();

    if ("response" in auth) {
      return auth.response;
    }

    const website = await getWebsite(auth.shopId);

    if (!website) {
      return NextResponse.json(
        { error: "BloomWebsite not found." },
        { status: 404 },
      );
    }

    const customDomain = website.customDomain?.trim().toLowerCase() || "";

    if (!customDomain) {
      return NextResponse.json({
        success: true,
        ownershipVerified: false,
        routing: {
          providerConfigured: false,
          attached: false,
          projectVerified: false,
          routingReady: false,
          configuredBy: null,
          dnsRecord: null,
          providerVerification: [],
          message: "Save a custom domain first.",
        },
      });
    }

    if (!website.domainVerified) {
      return NextResponse.json({
        success: true,
        ownershipVerified: false,
        routing: {
          providerConfigured: false,
          attached: false,
          projectVerified: false,
          routingReady: false,
          configuredBy: null,
          dnsRecord: null,
          providerVerification: [],
          message:
            "Verify domain ownership with Bloom before configuring storefront routing.",
        },
      });
    }

    const status = await getBloomWebsiteVercelStatus(customDomain);

    await persistRoutingStatus(website, status.routingReady);

    return NextResponse.json({
      success: true,
      ownershipVerified: true,
      routing: status,
      routingVerifiedAt:
        website.domainRoutingVerifiedAt?.toISOString?.() || null,
    });
  } catch (error) {
    console.error("Failed to load BloomWebsite routing status:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to check storefront routing.",
      },
      { status: 502 },
    );
  }
}

export async function POST() {
  try {
    const auth = await getSessionShop();

    if ("response" in auth) {
      return auth.response;
    }

    const website = await getWebsite(auth.shopId);

    if (!website) {
      return NextResponse.json(
        { error: "BloomWebsite not found." },
        { status: 404 },
      );
    }

    const customDomain = website.customDomain?.trim().toLowerCase() || "";

    if (!customDomain) {
      return NextResponse.json(
        { error: "Save a custom domain before connecting hosting." },
        { status: 400 },
      );
    }

    if (!website.domainVerified) {
      return NextResponse.json(
        {
          error:
            "Bloom must verify domain ownership before connecting storefront hosting.",
        },
        { status: 409 },
      );
    }

    const status = await addBloomWebsiteDomainToVercel(customDomain);

    await persistRoutingStatus(website, status.routingReady);

    return NextResponse.json({
      success: true,
      ownershipVerified: true,
      routing: status,
      routingVerifiedAt:
        website.domainRoutingVerifiedAt?.toISOString?.() || null,
    });
  } catch (error) {
    console.error("Failed to provision BloomWebsite domain routing:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to connect storefront hosting.",
      },
      { status: 502 },
    );
  }
}
