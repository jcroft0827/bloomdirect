import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import Shop from "@/models/Shop";
import { OrderStatus } from "@/lib/order-status";

type ReportPeriod = "month" | "year" | "all";

function getPeriodStart(period: ReportPeriod) {
  const now = new Date();

  if (period === "month") {
    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1,
        0,
        0,
        0,
        0,
      ),
    );
  }

  if (period === "year") {
    return new Date(
      Date.UTC(
        now.getUTCFullYear(),
        0,
        1,
        0,
        0,
        0,
        0,
      ),
    );
  }

  return null;
}

export async function GET(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const shop = await Shop.findById(session.user.id)
      .select("_id isPro isSuspended");

    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found." },
        { status: 404 },
      );
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        { error: "This shop account is suspended." },
        { status: 403 },
      );
    }

    if (!shop.isPro) {
      return NextResponse.json(
        {
          error: "Performance reporting is available with Bloom Pro.",
          upgradeRequired: true,
        },
        { status: 403 },
      );
    }

    const searchParams = new URL(req.url).searchParams;
    const rawPeriod = searchParams.get("period");

    const period: ReportPeriod =
      rawPeriod === "year" || rawPeriod === "all"
        ? rawPeriod
        : "month";

    const periodStart = getPeriodStart(period);

    const match: Record<string, any> = {
      fulfillingShop: shop._id,

      // Outside-network orders have no GetBloomDirect fulfilling shop,
      // so they will not appear here.
      fulfillmentType: "network",

      // Count orders that became real fulfillment business.
      status: {
        $in: [
          OrderStatus.ACCEPTED_AWAITING_PAYMENT,
          OrderStatus.PAID_AWAITING_FULFILLMENT,
          OrderStatus.COMPLETED,
        ],
      },
    };

    if (periodStart) {
      match.createdAt = {
        $gte: periodStart,
      };
    }

    const result = await Order.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: null,
          ordersReceived: {
            $sum: 1,
          },
          fulfillmentValueCents: {
            $sum: "$pricing.fulfillingShopGetsCents",
          },
        },
      },
    ]);

    const ordersReceived = result[0]?.ordersReceived ?? 0;
    const fulfillmentValueCents =
      result[0]?.fulfillmentValueCents ?? 0;

    const averageFulfillmentOrderCents =
      ordersReceived > 0
        ? Math.round(
            fulfillmentValueCents / ordersReceived,
          )
        : 0;

    return NextResponse.json({
      summary: {
        period,
        ordersReceived,
        fulfillmentValueCents,
        averageFulfillmentOrderCents,
      },
    });
  } catch (error) {
    console.error(
      "DASHBOARD REPORT SUMMARY ERROR:",
      error,
    );

    return NextResponse.json(
      {
        error: "Unable to load dashboard reporting.",
      },
      { status: 500 },
    );
  }
}