import authOptions from "@/lib/auth";
import { getBloomWebsiteLaunchReadiness } from "@/lib/bloom-websites/getBloomWebsiteLaunchReadiness";
import { getBloomWebsiteVercelStatus } from "@/lib/bloom-websites/vercel-domain-provisioning";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type LaunchAction = "publish" | "pause" | "resume";

type LaunchBody = {
  websiteId?: unknown;
  action?: unknown;
};

async function getSessionShop(): Promise<
  | {
      shopId: string;
      isSuspended: boolean;
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

  return {
    shopId: session.user.id,
    isSuspended: Boolean(shop.isSuspended),
  };
}

function isLaunchAction(value: unknown): value is LaunchAction {
  return value === "publish" || value === "pause" || value === "resume";
}

export async function POST(request: Request) {
  try {
    const auth = await getSessionShop();

    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json()) as LaunchBody;
    const websiteId =
      typeof body.websiteId === "string" ? body.websiteId.trim() : "";

    if (!websiteId || !isLaunchAction(body.action)) {
      return NextResponse.json(
        { error: "A valid website and launch action are required." },
        { status: 400 },
      );
    }

    const website = await BloomWebsite.findOne({
      _id: websiteId,
      shop: auth.shopId,
    }).select(
      "_id status publishedAt pauseReason customDomain domainVerified domainRoutingReady",
    );

    if (!website) {
      return NextResponse.json(
        { error: "BloomWebsite not found." },
        { status: 404 },
      );
    }

    if (body.action === "pause") {
      if (website.status !== "live") {
        return NextResponse.json(
          {
            error:
              website.status === "paused"
                ? "This BloomWebsite is already paused."
                : "Only a live BloomWebsite can be paused.",
          },
          { status: 409 },
        );
      }

      const pausedWebsite = await BloomWebsite.findOneAndUpdate(
        {
          _id: website._id,
          shop: auth.shopId,
          status: "live",
        },
        {
          $set: {
            status: "paused",
            pauseReason: "manual",
          },
        },
        {
          new: true,
        },
      ).select("_id status publishedAt");

      if (!pausedWebsite) {
        return NextResponse.json(
          {
            error:
              "The website status changed before Bloom could pause it. Refresh and try again.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json({
        success: true,
        action: "pause",
        website: {
          id: pausedWebsite._id.toString(),
          status: pausedWebsite.status,
          publishedAt: pausedWebsite.publishedAt ?? null,
        },
      });
    }

    const expectedStatus =
      body.action === "publish" ? "preview" : "paused";

    if (website.status !== expectedStatus) {
      return NextResponse.json(
        {
          error:
            body.action === "publish"
              ? website.status === "live"
                ? "This BloomWebsite is already live."
                : "A paused BloomWebsite should be resumed instead of published again."
              : website.status === "live"
                ? "This BloomWebsite is already live."
                : "Only a paused BloomWebsite can be resumed.",
        },
        { status: 409 },
      );
    }

    if (auth.isSuspended) {
      return NextResponse.json(
        {
          error:
            "Suspended shops cannot publish or resume a BloomWebsite.",
        },
        { status: 403 },
      );
    }

    /*
     * domainRoutingReady is a cached convenience flag for the
     * dashboard. It is not authoritative enough to publish a
     * storefront. DNS/provider configuration can change after
     * the last successful routing check, so publish/resume must
     * ask the hosting provider again.
     */
    const customDomain =
      typeof website.customDomain === "string"
        ? website.customDomain.trim().toLowerCase()
        : "";

    if (!customDomain || website.domainVerified !== true) {
      return NextResponse.json(
        {
          error:
            "Verify the BloomWebsite domain before publishing or resuming.",
        },
        { status: 409 },
      );
    }

    let liveRoutingStatus;

    try {
      liveRoutingStatus = await getBloomWebsiteVercelStatus(customDomain);
    } catch (error) {
      console.error(
        "Failed to revalidate BloomWebsite routing before launch:",
        error,
      );

      await BloomWebsite.updateOne(
        {
          _id: website._id,
          shop: auth.shopId,
        },
        {
          $set: {
            domainRoutingReady: false,
            domainRoutingVerifiedAt: null,
          },
        },
      );

      return NextResponse.json(
        {
          error:
            "Bloom could not confirm your domain routing right now. Check the Domain setup and try again.",
        },
        { status: 409 },
      );
    }

    if (
      !liveRoutingStatus.providerConfigured ||
      !liveRoutingStatus.attached ||
      !liveRoutingStatus.projectVerified ||
      !liveRoutingStatus.routingReady
    ) {
      await BloomWebsite.updateOne(
        {
          _id: website._id,
          shop: auth.shopId,
        },
        {
          $set: {
            domainRoutingReady: false,
            domainRoutingVerifiedAt: null,
          },
        },
      );

      return NextResponse.json(
        {
          error:
            "Your domain is no longer confirmed for production routing. Review Domain setup before publishing or resuming.",
          routing: liveRoutingStatus,
        },
        { status: 409 },
      );
    }

    const routingVerifiedAt = new Date();

    await BloomWebsite.updateOne(
      {
        _id: website._id,
        shop: auth.shopId,
        customDomain,
      },
      {
        $set: {
          domainRoutingReady: true,
          domainRoutingVerifiedAt: routingVerifiedAt,
        },
      },
    );

    /*
     * Never trust readiness calculated in the browser or
     * on a previously-rendered page. Recompute immediately
     * before changing the public lifecycle state. This runs
     * after the live routing check so readiness sees the
     * freshly-confirmed routing state.
     */
    const readiness = await getBloomWebsiteLaunchReadiness({
      websiteId: website._id.toString(),
      shopId: auth.shopId,
    });

    if (!readiness) {
      return NextResponse.json(
        { error: "Unable to calculate launch readiness." },
        { status: 409 },
      );
    }

    if (!readiness.readyToPublish) {
      return NextResponse.json(
        {
          error:
            body.action === "publish"
              ? "This BloomWebsite is not ready to publish yet."
              : "This BloomWebsite no longer meets the requirements to resume.",
          readiness,
        },
        { status: 409 },
      );
    }

    const now = new Date();

    const update =
      website.publishedAt
        ? {
            $set: {
              status: "live",
              pauseReason: null,
            },
          }
        : {
            $set: {
              status: "live",
              publishedAt: now,
              pauseReason: null,
            },
          };

    const liveWebsite = await BloomWebsite.findOneAndUpdate(
      {
        _id: website._id,
        shop: auth.shopId,
        status: expectedStatus,
      },
      update,
      {
        new: true,
      },
    ).select("_id status publishedAt");

    if (!liveWebsite) {
      return NextResponse.json(
        {
          error:
            "The website status changed before Bloom could complete this action. Refresh and try again.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      action: body.action,
      website: {
        id: liveWebsite._id.toString(),
        status: liveWebsite.status,
        publishedAt: liveWebsite.publishedAt ?? null,
      },
      readiness,
    });
  } catch (error) {
    console.error("Failed to update BloomWebsite launch status:", error);

    return NextResponse.json(
      { error: "Unable to update the BloomWebsite launch status." },
      { status: 500 },
    );
  }
}
