import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { OrderStatus } from "@/lib/order-status";
import Order from "@/models/Order";
import Shop from "@/models/Shop";

function parseStartDate(value: string | null) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseEndDate(value: string | null) {
  if (!value) return null;

  const date = new Date(`${value}T23:59:59.999Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized." },
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
          error: "Reporting is available with Bloom Pro.",
          code: "PRO_REQUIRED",
          upgradeRequired: true,
        },
        { status: 403 },
      );
    }

    const searchParams = new URL(req.url).searchParams;

    const startDate = parseStartDate(
      searchParams.get("startDate"),
    );

    const endDate = parseEndDate(
      searchParams.get("endDate"),
    );

    if (
      searchParams.get("startDate") &&
      !startDate
    ) {
      return NextResponse.json(
        { error: "Invalid start date." },
        { status: 400 },
      );
    }

    if (
      searchParams.get("endDate") &&
      !endDate
    ) {
      return NextResponse.json(
        { error: "Invalid end date." },
        { status: 400 },
      );
    }

    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {
      return NextResponse.json(
        {
          error:
            "The start date must be before the end date.",
        },
        { status: 400 },
      );
    }

    const createdAtFilter: Record<string, Date> = {};

    if (startDate) {
      createdAtFilter.$gte = startDate;
    }

    if (endDate) {
      createdAtFilter.$lte = endDate;
    }

    const hasDateFilter =
      Object.keys(createdAtFilter).length > 0;

    const shopObjectId = new mongoose.Types.ObjectId(
      session.user.id,
    );

    const sentMatch: Record<string, any> = {
      originatingShop: shopObjectId,
    };

    const receivedMatch: Record<string, any> = {
      fulfillingShop: shopObjectId,
      fulfillmentType: "network",
    };

    if (hasDateFilter) {
      sentMatch.createdAt = createdAtFilter;
      receivedMatch.createdAt = createdAtFilter;
    }

    /*
     * Financial totals exclude declined orders.
     *
     * Pending orders remain included because they were
     * legitimately created and may still be accepted.
     * We can later add status filtering to the report UI.
     */
    const sentFinancialMatch = {
      ...sentMatch,
      status: {
        $ne: OrderStatus.DECLINED,
      },
    };

    const receivedFinancialMatch = {
      ...receivedMatch,
      status: {
        $ne: OrderStatus.DECLINED,
      },
    };

    const [
      sentSummaryResult,
      receivedSummaryResult,
      fulfillmentTypeResult,
      salesTaxResult,
    ] = await Promise.all([
      Order.aggregate([
        {
          $match: sentFinancialMatch,
        },
        {
          $group: {
            _id: null,

            ordersSent: {
              $sum: 1,
            },

            sentOrderValueCents: {
              $sum: "$pricing.customerPaysCents",
            },
          },
        },
      ]),

      Order.aggregate([
        {
          $match: receivedFinancialMatch,
        },
        {
          $group: {
            _id: null,

            ordersReceived: {
              $sum: 1,
            },

            fulfillmentValueCents: {
              $sum:
                "$pricing.fulfillingShopGetsCents",
            },
          },
        },
      ]),

      Order.aggregate([
        {
          $match: sentMatch,
        },
        {
          $group: {
            _id: {
              $ifNull: [
                "$fulfillmentType",
                "network",
              ],
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]),

      Order.aggregate([
        {
          $match: sentFinancialMatch,
        },
        {
          $group: {
            _id: null,

            taxableProductSubtotalCents: {
              $sum:
                "$pricing.taxableSubtotalCents",
            },

            productSubtotalCents: {
              $sum:
                "$pricing.productsTotalCents",
            },

            taxableDeliveryFeesCents: {
              $sum: {
                $cond: [
                  "$pricing.deliveryTaxed",
                  "$pricing.deliveryFeeCents",
                  0,
                ],
              },
            },

            nonTaxableDeliveryFeesCents: {
              $sum: {
                $cond: [
                  "$pricing.deliveryTaxed",
                  0,
                  "$pricing.deliveryFeeCents",
                ],
              },
            },

            taxCollectedCents: {
              $sum:
                "$pricing.taxAmountCents",
            },

            grossOrderTotalCents: {
              $sum:
                "$pricing.customerPaysCents",
            },
          },
        },
      ]),
    ]);

    const sentSummary =
      sentSummaryResult[0] ?? {
        ordersSent: 0,
        sentOrderValueCents: 0,
      };

    const receivedSummary =
      receivedSummaryResult[0] ?? {
        ordersReceived: 0,
        fulfillmentValueCents: 0,
      };

    const salesTax =
      salesTaxResult[0] ?? {
        taxableProductSubtotalCents: 0,
        productSubtotalCents: 0,
        taxableDeliveryFeesCents: 0,
        nonTaxableDeliveryFeesCents: 0,
        taxCollectedCents: 0,
        grossOrderTotalCents: 0,
      };

    const fulfillmentTypes = {
      network: 0,
      outsideNetwork: 0,
    };

    for (const result of fulfillmentTypeResult) {
      if (result._id === "outside_network") {
        fulfillmentTypes.outsideNetwork =
          result.count;
      } else {
        fulfillmentTypes.network =
          result.count;
      }
    }

    const nonTaxableProductSubtotalCents =
      Math.max(
        salesTax.productSubtotalCents -
          salesTax.taxableProductSubtotalCents,
        0,
      );

    const averageSentOrderValueCents =
      sentSummary.ordersSent > 0
        ? Math.round(
            sentSummary.sentOrderValueCents /
              sentSummary.ordersSent,
          )
        : 0;

    const averageFulfillmentOrderCents =
      receivedSummary.ordersReceived > 0
        ? Math.round(
            receivedSummary.fulfillmentValueCents /
              receivedSummary.ordersReceived,
          )
        : 0;

    return NextResponse.json({
      filters: {
        startDate:
          startDate?.toISOString() ?? null,
        endDate:
          endDate?.toISOString() ?? null,
      },

      summary: {
        ordersSent: sentSummary.ordersSent,
        ordersReceived:
          receivedSummary.ordersReceived,

        sentOrderValueCents:
          sentSummary.sentOrderValueCents,

        fulfillmentValueCents:
          receivedSummary.fulfillmentValueCents,

        averageSentOrderValueCents,
        averageFulfillmentOrderCents,
      },

      fulfillmentTypes,

      salesTax: {
        taxableProductSubtotalCents:
          salesTax.taxableProductSubtotalCents,

        nonTaxableProductSubtotalCents,

        taxableDeliveryFeesCents:
          salesTax.taxableDeliveryFeesCents,

        nonTaxableDeliveryFeesCents:
          salesTax.nonTaxableDeliveryFeesCents,

        taxCollectedCents:
          salesTax.taxCollectedCents,

        grossOrderTotalCents:
          salesTax.grossOrderTotalCents,
      },
    });
  } catch (error) {
    console.error(
      "REPORT SUMMARY ERROR:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to generate reporting data.",
      },
      { status: 500 },
    );
  }
}