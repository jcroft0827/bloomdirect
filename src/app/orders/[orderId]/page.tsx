// app/orders/[orderId]/page.tsx
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import type { OrderLean } from "@/types/order";
import { OrderStatus } from "@/lib/order-status";
import Shop from "@/models/Shop";
import { Types } from "mongoose";
import OrderClient from "./OrderClient";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderPage({ params }: { params: { orderId: string } }) {
  const { orderId } = await params;
  await connectToDB();
  
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();
  
  const order = (await Order.findById(orderId).lean()) as OrderLean | null;
  if (!order) notFound();

  const userShopId = session.user.id;

  const role =
    order.originatingShop.toString() === userShopId
      ? "ORIGINATING"
      : order.fulfillingShop.toString() === userShopId
        ? "FULFILLING"
        : null;

  if (!role) notFound();

  const isFulfilling = role === "FULFILLING";
  const isOriginating = role === "ORIGINATING";

  let availableShops: {
    _id: Types.ObjectId;
    shopName: string;
  }[] = [];

  if (isOriginating && order.status === OrderStatus.DECLINED) {
    availableShops = await Shop.find({
      _id: { $ne: order.fulfillingShop },
    })
      .select("_id shopName")
      .lean<{ _id: Types.ObjectId; shopName: string }[]>(); // 👈 ARRAY HERE
  }

  return (
    <OrderClient 
      order={JSON.parse(JSON.stringify(order))}
      availableShops={JSON.parse(JSON.stringify(availableShops))}
      isFulfilling={isFulfilling}
      isOriginating={isOriginating}
    />
  );
}
