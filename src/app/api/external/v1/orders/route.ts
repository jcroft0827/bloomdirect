// api/external/v1/orders/route.ts
import { getShopFromApiKey } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { mapOrderForPOS } from "@/lib/map-order-for-pos";
import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import { checkPosApiRateLimit } from "@/lib/pos-api-rate-limit";

export async function GET(req: Request) {
  try {
    await connectToDB();

    const shop = await getShopFromApiKey(req);

    const rateLimit = checkPosApiRateLimit({
      key: `pos-get-orders:${shop._id.toString()}`,
      limit: 60,
    });

    if (!rateLimit.allowed) {
      return apiError(
        "RATE_LIMIT_EXCEEDED",
        "Too many requests. Please wait before trying again.",
        429,
      );
    }

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");

    const limitParam = searchParams.get("limit");

    let limit = 100;

    if (limitParam) {
      const parsedLimit = Number(limitParam);

      if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
        return apiError(
          "INVALID_REQUEST",
          "Limit must be a positive whole number.",
          400,
        );
      }

      limit = Math.min(parsedLimit, 250);
    }

    const query: any = {
      fulfillingShop: shop._id,
    };

    if (since) {
      const sinceDate = new Date(since);
      if (Number.isNaN(sinceDate.getTime())) {
        return apiError("INVALID_REQUEST", "Invalid since value", 400);
      }
      query.updatedAt = { $gt: sinceDate };
    }

    const orders = await Order.find(query)
      .select({
        orderNumber: 1,
        status: 1,
        recipient: 1,
        customer: 1,
        products: 1,
        pricing: 1,
        logistics: 1,
        paidAt: 1,
        acceptedAt: 1,
        declinedAt: 1,
        completedAt: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({
        updatedAt: -1,
        _id: -1,
      })
      .limit(limit)
      .lean();

    return apiSuccess({
      orders: orders.map(mapOrderForPOS),
    });
  } catch (err: any) {
    if (err instanceof Response) {
      return err;
    }

    return apiError("INVALID_REQUEST", "Something went wrong", 500);
  }
}
