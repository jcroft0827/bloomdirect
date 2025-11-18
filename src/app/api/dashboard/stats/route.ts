// src/app/api/dashboard/stats/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Order from "@/models/Order";
import { connectToDB } from "@/lib/mongoose";

export async function GET() {
  await connectToDB();
  const session = await getServerSession(authOptions);

  if (!session?.user?.shopId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shopId = session.user.shopId;

  // 1. Orders I sent (originatingShop = me)
  const sentOrders = await Order.find({ originatingShop: shopId });
  const ordersSent = sentOrders.length;

  // 2. Orders sent to me (fulfillingShop = me)
  const incomingOrders = await Order.find({ fulfillingShop: shopId });
  const ordersReceived = incomingOrders.length;

  // 3. Profit = 20% of totalAmount on EVERY sent order (even pending!)
  const profit = sentOrders.reduce((sum, order) => {
    const amount = order.totalCustomerPaid || 0;
    return sum + (amount * 0.20);
  }, 0);

  return NextResponse.json({
    profit: Math.round(profit),
    ordersSent,
    ordersReceived,
  });
}




// // src/app/api/dashboard/stats/route.ts
// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import Order from "@/models/Order";
// import { connectToDB } from "@/lib/mongoose";

// export async function GET() {
//   try {
//     await connectToDB();
//     const session = await getServerSession(authOptions);

//     if (!session?.user?.shopId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const shopId = session.user.shopId;

//     // 1. Orders Sent (originatingShop = me)
//     const sentOrders = await Order.find({ originatingShop: shopId });
//     const ordersSent = sentOrders.length;

//     // 2. Incoming Orders (fulfillingShop = me)
//     const incomingOrders = await Order.find({ fulfillingShop: shopId });
//     const ordersReceived = incomingOrders.length;

//     // 3. Profit Kept = originating shop gets 20% of totalAmount on accepted orders
//     const profit = sentOrders
//       .filter((o) => o.status === "accepted")
//       .reduce((sum, order) => sum + (order.totalAmount * 0.20), 0);

//     return NextResponse.json({
//       profit: Math.round(profit),
//       ordersSent,
//       ordersReceived,
//     });
//   } catch (error) {
//     console.error("Stats error:", error);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }