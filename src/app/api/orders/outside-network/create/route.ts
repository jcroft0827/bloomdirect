// api/orders/outside-network/create/route.ts

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { OrderActivityActions } from "@/lib/order-activity-actions";
import Order from "@/models/Order";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import OutsideNetworkFlorists from "@/models/OutsideNetworkFlorists";
import { OrderStatus } from "@/lib/order-status";
import ZipDemand from "@/models/ZipDemand";
import { getMonthlySendUsage } from "@/lib/order-send-usage";

function generateOrderNumber() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `GBD${date}-${random}`;
}

function dollarsToCents(value: unknown) {
  return Math.round((Number(value) || 0) * 100);
}

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      googleShop,
      outsideFlorist,
      recipient,
      customer,
      logistics,
      manualOrder,
      manualNotes,
    } = body;

    const outsideShop = outsideFlorist || googleShop;

    if (!outsideShop?.name) {
      return NextResponse.json(
        { error: "Outside florist name is required." },
        { status: 400 },
      );
    }

    if (!recipient?.zip) {
      return NextResponse.json(
        { error: "Recipient ZIP is required." },
        { status: 400 },
      );
    }

    if (
      !manualOrder?.items ||
      !Array.isArray(manualOrder.items) ||
      manualOrder.items.length === 0
    ) {
      return NextResponse.json(
        { error: "At least one manual item is required." },
        { status: 400 },
      );
    }

    const originShop = await Shop.findById(session?.user?.id);

    if (!originShop) {
      return NextResponse.json(
        { error: "Origin shop not found." },
        { status: 404 },
      );
    }

    const sendUsage = await getMonthlySendUsage({
      shopId: originShop._id,
      isPro: Boolean(originShop.isPro),
    });

    if (!sendUsage.allowed) {
      return NextResponse.json(
        {
          error:
            "You have reached the Bloom Free limit of 15 sent orders this month.",
          code: "MONTHLY_SEND_LIMIT_REACHED",
          upgradeRequired: true,
          usage: {
            sentThisMonth: sendUsage.sentThisMonth,
            limit: sendUsage.limit,
            remaining: sendUsage.remaining,
          },
        },
        { status: 403 },
      );
    }

    const normalizedName = outsideShop.name.trim();

    const outsideFloristQuery = outsideShop.googlePlaceId
      ? { googlePlaceId: outsideShop.googlePlaceId }
      : outsideShop.phone
        ? { businessName: normalizedName, phone: outsideShop.phone }
        : { businessName: normalizedName, address: outsideShop.address || "" };

    const outsideFloristRecord = await OutsideNetworkFlorists.findOneAndUpdate(
      outsideFloristQuery,
      {
        $set: {
          businessName: normalizedName,
          phone: outsideShop.phone || "",
          email: outsideShop.email || "",
          address: outsideShop.address || "",
          city: outsideShop.city || recipient.city || "",
          state: outsideShop.state || recipient.state || "",
          zip: outsideShop.zip || recipient.zip || "",
          googlePlaceId: outsideShop.googlePlaceId || "",
          source: outsideShop.googlePlaceId ? "google" : "manual",
          lastUsedAt: new Date(),
        },
        $setOnInsert: {
          firstUsedAt: new Date(),
        },
        $inc: {
          timesUsed: 1,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    const products = manualOrder.items.map((item: any) => {
      const qty = Math.max(Number(item.qty) || 1, 1);
      const priceCents = dollarsToCents(item.price);

      return {
        name: item.name || "Outside Network Item",
        description: item.description || "",
        photo: "",
        priceCents,
        qty,
        taxable: item.taxable !== false,
      };
    });

    const productTotalCents = products.reduce((sum: number, product: any) => {
      return sum + product.priceCents * product.qty;
    }, 0);

    const deliveryFeeCents = dollarsToCents(manualOrder.deliveryFee);

    const taxAmountCents = dollarsToCents(manualOrder.taxAmount);

    const customerPaysCents =
      dollarsToCents(manualOrder.orderTotal) ||
      productTotalCents + deliveryFeeCents + taxAmountCents;

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      fulfillmentType: "outside_network",
      status: OrderStatus.OUTSIDE_NETWORK,

      originatingShop: originShop._id,
      originatingShopName: originShop.businessName,

      fulfillingShop: null,
      fulfillingShopName: outsideShop.name,

      outsideFlorist: {
        outsideNetworkFlorist: outsideFloristRecord._id,
        name: outsideShop.name || "",
        phone: outsideShop.phone || "",
        email: outsideShop.email || "",
        address: outsideShop.address || "",
        googlePlaceId: outsideShop.googlePlaceId || "",
        contactPerson: manualOrder.contactPerson || "",
        notes: manualNotes || manualOrder.notes || "",
      },

      recipient,
      customer,
      logistics,

      products,

      originatingShopFee: {
        feeType: "flat",
        feeValue: 0,
      },

      pricing: {
        taxableSubtotalCents: productTotalCents,
        productsTotalCents: productTotalCents,
        deliveryFeeCents,
        taxPercentage: 0,
        deliveryTaxed: false,
        feeTaxed: false,
        taxAmountCents,
        originatingShopFeeCents: 0,
        customerPaysCents,
        orderTotalCents: customerPaysCents,
        fulfillingShopGetsCents: productTotalCents + deliveryFeeCents,
        originatingShopKeepsCents: 0,
      },

      paymentMethods: {
        venmo: "",
        cashapp: "",
        zelle: "",
        paypal: "",
        default: "venmo",
      },

      activityLog: [
        {
          action: OrderActivityActions.ORDER_CREATED,
          message: `Outside network order saved by ${originShop.businessName}`,
          actorShop: originShop._id,
        },
      ],
    });

    await Shop.findByIdAndUpdate(originShop._id, {
      $inc: { "stats.ordersSent": 1 },
    });

    try {
      await ZipDemand.findOneAndUpdate(
        { zip: recipient.zip },
        {
          $inc: { demandScore: 1 },
          $set: { lastUpdated: new Date() },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    } catch (error) {
      console.error("Failed to update ZipDemand:", error);
    }

    return NextResponse.json(
      {
        success: true,
        orderId: order._id,
        usage: originShop.isPro
          ? {
              isPro: true,
              sentThisMonth: sendUsage.sentThisMonth + 1,
              limit: null,
              remaining: null,
            }
          : {
              isPro: false,
              sentThisMonth: sendUsage.sentThisMonth + 1,
              limit: sendUsage.limit,
              remaining: Math.max((sendUsage.remaining ?? 1) - 1, 0),
            },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("OUTSIDE NETWORK ORDER CREATE ERROR: ", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
