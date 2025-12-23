// app/api/orders/route.ts
import { NextResponse } from "next/server";
import Order from "@/models/Order";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { OrderStatus } from "@/lib/order-status";

export async function GET(req: Request) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const query = url.searchParams;

    // Filters
    const statusFilter = query.get("status")?.split(",") as OrderStatus[] | undefined;
    const roleFilter = query.get("role"); // "originating" | "fulfilling" | undefined

    const baseFilter: any = {
      $or: [
        { originatingShop: session.user.id },
        { fulfillingShop: session.user.id },
      ],
    };

    // Apply status filter if provided
    if (statusFilter?.length) {
      baseFilter.status = { $in: statusFilter };
    }

    // Apply role filter if provided
    if (roleFilter === "originating") {
      baseFilter.originatingShop = session.user.id;
      delete baseFilter.$or;
    } else if (roleFilter === "fulfilling") {
      baseFilter.fulfillingShop = session.user.id;
      delete baseFilter.$or;
    }

    const orders = await Order.find(baseFilter)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("ORDERS FETCH ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
