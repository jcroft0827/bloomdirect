import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import OrderMessages from "./OrderMessages";

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDB();

  const shop = await Shop.findById(session.user.id).lean();

  if (!shop) {
    redirect("/onboarding");
  }

  const order = await Order.findById(id);

  if (!order) {
    redirect("/dashboard/incoming");
  }

  const shopId = session?.user?.id.toString() || ""; // Ensure shopId is a string

  const isOriginatingShop = order.originatingShop?.toString() === shopId;

  const isFulfillingShop = order.fulfillingShop?.toString() === shopId;

  if (!isOriginatingShop && !isFulfillingShop) {
    redirect("/dashboard/orders");
  }

  return (
    <div className="max-w-5xl mx-auto p-2">
      <OrderMessages
        orderId={order._id.toString()}
        loggedInShopId={shopId}
        order={JSON.parse(JSON.stringify(order))}
      />
    </div>
  );
}
