// src/app/api/dashboard/overview/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import Order from "@/models/Order";

export async function GET() {
  await connectToDB();

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shopId = session.user.id;

  // Pull shop info and relevant fields
  const shop = await Shop.findById(shopId).select("shopName logo isPro proSince subscriptionStatus");
  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  // Use counts (efficient) and aggregation for profit
  const [ordersSent, ordersReceived] = await Promise.all([
    Order.countDocuments({ originatingShop: shop._id }),
    Order.countDocuments({ fulfillingShop: shop._id }),
  ]);

  const profitAgg = await Order.aggregate([
    { $match: { originatingShop: shop._id } },
    {
      $group: {
        _id: null,
        total: { $sum: { $ifNull: ["$totalCustomerPaid", 0] } },
      },
    },
  ]);
  const totalPaid = (profitAgg[0] && profitAgg[0].total) || 0;
  const profit = Math.round(totalPaid * 0.2);

  return NextResponse.json({
    profit,
    ordersSent,
    ordersReceived,
    shopName: shop.shopName,
    isPro: shop.isPro,
    proSince: shop.proSince ?? null,
    subscriptionStatus: (shop as any).subscriptionStatus ?? null,
    logo: shop.logo ?? null,
  });
}
