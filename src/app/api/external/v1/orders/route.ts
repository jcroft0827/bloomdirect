// api/external/v1/orders/route.ts
import { getShopFromApiKey } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { mapOrderForPOS } from "@/lib/map-order-for-pos";
import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";

export async function GET(req: Request) {
  try {
    await connectToDB();

    const shop = await getShopFromApiKey(req);

    const { searchParams } = new URL(req.url);
    const since = searchParams.get("since");

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

    const orders = await Order.find(query).sort({ updatedAt: -1 });

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
