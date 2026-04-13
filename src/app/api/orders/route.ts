// app/api/orders/route.ts
import { NextResponse } from "next/server";
import Order from "@/models/Order";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { OrderStatus } from "@/lib/order-status";
import { ApiError } from "@/lib/api-error";

export async function GET(req: Request) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = new URL(req.url).searchParams;

    // Filters
    const statusFilter = query.get("status")?.split(",");
    const roleFilter = query.get("role"); // "originating" | "fulfilling" | undefined

    const startDate = query.get("startDate");
    const endDate = query.get("endDate");
    const dateType = query.get("dateType");

    const baseFilter: any = {
      $or: [
        { originatingShop: session.user.id },
        { fulfillingShop: session.user.id },
      ],
    };

    // Date Range Logic
    if (startDate || endDate) {
      // Map UI label to DB field
      const dbField = dateType === "Delivery Date" ? "deliveryDate" : "createdAt";
      const dateQuery: any = {};

      if (startDate) {
        const s = new Date(startDate);
        s.setUTCHours(0, 0, 0, 0);
        dateQuery.$gte = s;
      }

      if (endDate) {
        const e = new Date(endDate);
        e.setUTCHours(23, 59, 59, 999);
        dateQuery.$lte = e;
      }

      baseFilter[dbField] = dateQuery;
    }

    // Status Logic
    if (statusFilter?.length) {
      baseFilter.status = { $in: statusFilter };
    }

    // Role Logic
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
    
        if (error instanceof ApiError) {
          return NextResponse.json(
            { error: error.message, code: error.code },
            { status: error.status },
          );
        }
    
        return NextResponse.json(
          {
            error: "Something went wrong. Please Contact GetBloomDirect Support.",
            code: "SERVER_ERROR",
          },
          { status: 500 },
        );
      }
}
