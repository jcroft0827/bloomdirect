import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { OrderActivityActions } from "@/lib/order-activity";
import Order from "@/models/Order";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import OutsideNetworkFlorists from "@/models/OutsideNetworkFlorists";

function generateOrderNumber() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `GBD${date}-${random}`;
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
      manualPricing,
      manualProduct,
    } = body;

    const outsideShop = outsideFlorist || googleShop;

    if (!outsideShop?.name) {
      return NextResponse.json(
        { error: "Outside florist name is required." },
        { status: 400 },
      );
    }

    const outsideFloristRecord = await OutsideNetworkFlorists.findOneAndUpdate(
        {
            zip: recipient.zip,
            businessName: outsideFlorist.name.trim(),
        },
        {
            $set: {
                businessName: outsideFlorist.name.trim(),
                phone: outsideFlorist.phone || "",
                email: outsideFlorist.email || "",
                address: outsideFlorist.address || "",
                city: recipient.city || "",
                state: recipient.state || "",
                zip: recipient.zip || "",
                googlePlaceId: outsideFlorist.googlePlaceId || "",
                source: outsideFlorist.googlePlaceId ? "google" : "manual",
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

    if (!manualPricing) {
      return NextResponse.json(
        { error: "Manual pricing is required." },
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

    const productTotalCents = Math.round(
      Number(manualPricing.productTotal || 0) * 100,
    );

    const deliveryFeeCents = Math.round(
      Number(manualPricing.deliveryFee || 0) * 100,
    );

    const taxAmountCents = Math.round(
      Number(manualPricing.taxAmount || 0) * 100,
    );

    const customerPaysCents = Math.round(
      Number(
        manualPricing.customerPays ||
          Number(manualPricing.productTotal || 0) +
            Number(manualPricing.deliveryFee || 0) +
            Number(manualPricing.taxAmount || 0),
      ) * 100,
    );

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      fulfillmentType: "outside_network",
      status: "OUTSIDE_NETWORK",

      originatingShop: originShop._id,
      originatingShopName: originShop.businessName,

      fulfillingShop: null,
      fulfillingShopName: outsideShop.name,

      outsideFlorist: {
        outsideNetworkFlorist: outsideFloristRecord._id,
        name: outsideFlorist.name || "",
        phone: outsideFlorist.phone || "",
        email: outsideFlorist.email || "",
        address: outsideFlorist.address || "",
        googlePlaceId: outsideFlorist.googlePlaceId || "",
        contactPerson: outsideFlorist.contactPerson || "",
        notes: outsideFlorist.notes || "",
        },

      recipient,
      customer,
      logistics,

      products: [
        {
          name: manualProduct?.name || "Outside Network Order",
          description: manualProduct?.description || "",
          photo: "",
          priceCents: productTotalCents,
          qty: 1,
          taxable: manualProduct?.taxable !== false,
        },
      ],

      pricing: {
        taxableSubtotalCents: productTotalCents,
        productsTotalCents: productTotalCents,
        deliveryFeeCents,
        taxPercentage: Number(manualPricing.taxPercentage || 0),
        deliveryTaxed: false,
        feeTaxed: false,
        taxAmountCents,
        originatingShopFeeCents: 0,
        customerPaysCents,
        orderTotalCents: customerPaysCents,
        fulfillingShopGetsCents:
          productTotalCents + deliveryFeeCents + taxAmountCents,
        originatingShopKeepsCents: 0,
      },

      paymentMethods: {
        venmo: "",
        cashapp: "",
        zelle: "",
        paypal: "",
        default: "",
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

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("OUTSIDE NETWORK ORDER CREATE ERROR: ", error);
    return NextResponse.json(
        { error: error.message || "Internal Server Error" },
        { status: 500 },
    );
  }
}
