// app/api/orders/route.ts
import { NextResponse } from "next/server";
import Order from "@/models/Order";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { ApiError } from "@/lib/api-error";
import { mapOrderForDashboard } from "@/lib/map-order-for-dashboard";
import { OrderStatus } from "@/lib/order-status";

export async function GET(req: Request) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = new URL(req.url).searchParams;

    const rawStatusFilter = query.get("status")?.split(",") ?? [];
    const validStatuses = Object.values(OrderStatus);

    const statusFilter = rawStatusFilter.filter((status) =>
      validStatuses.includes(status as OrderStatus),
    );

    const rawRoleFilter = query.get("role");
    const roleFilter =
      rawRoleFilter === "originating" || rawRoleFilter === "fulfilling"
        ? rawRoleFilter
        : undefined;

    const rawDateType = query.get("dateType");
    const dateType =
      rawDateType === "Delivery Date" || rawDateType === "Order Date"
        ? rawDateType
        : "Order Date";

    const startDate = query.get("startDate");
    const endDate = query.get("endDate");

    const baseFilter: any = {
      $or: [
        { originatingShop: session.user.id },
        { fulfillingShop: session.user.id },
      ],
    };

    if (startDate || endDate) {
      const dbField =
        dateType === "Delivery Date" ? "logistics.deliveryDate" : "createdAt";

      const dateQuery: any = {};

      if (startDate) {
        const s = new Date(startDate);
        if (!Number.isNaN(s.getTime())) {
          s.setUTCHours(0, 0, 0, 0);
          dateQuery.$gte = s;
        }
      }

      if (endDate) {
        const e = new Date(endDate);
        if (!Number.isNaN(e.getTime())) {
          e.setUTCHours(23, 59, 59, 999);
          dateQuery.$lte = e;
        }
      }

      if (Object.keys(dateQuery).length) {
        baseFilter[dbField] = dateQuery;
      }
    }

    if (statusFilter.length) {
      baseFilter.status = { $in: statusFilter };
    }

    if (roleFilter === "originating") {
      baseFilter.originatingShop = session.user.id;
      delete baseFilter.$or;
    } else if (roleFilter === "fulfilling") {
      baseFilter.fulfillingShop = session.user.id;
      delete baseFilter.$or;
    }

    const orders = await Order.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      orders: orders.map(mapOrderForDashboard),
    });
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
