import mongoose from "mongoose";
import Order from "@/models/Order";

export const FREE_MONTHLY_SEND_LIMIT = 15;

type MonthlySendUsageParams = {
  shopId: string | mongoose.Types.ObjectId;
  isPro: boolean;
  now?: Date;
};

export type MonthlySendUsage = {
  allowed: boolean;
  isPro: boolean;
  sentThisMonth: number;
  limit: number | null;
  remaining: number | null;
  monthStart: Date;
  nextMonthStart: Date;
};

export function getCalendarMonthRange(now = new Date()) {
  const monthStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1,
      0,
      0,
      0,
      0,
    ),
  );

  const nextMonthStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    ),
  );

  return {
    monthStart,
    nextMonthStart,
  };
}

export async function getMonthlySendUsage({
  shopId,
  isPro,
  now = new Date(),
}: MonthlySendUsageParams): Promise<MonthlySendUsage> {
  const { monthStart, nextMonthStart } =
    getCalendarMonthRange(now);

  const sentThisMonth = await Order.countDocuments({
    originatingShop: shopId,
    createdAt: {
      $gte: monthStart,
      $lt: nextMonthStart,
    },
  });

  if (isPro) {
    return {
      allowed: true,
      isPro: true,
      sentThisMonth,
      limit: null,
      remaining: null,
      monthStart,
      nextMonthStart,
    };
  }

  const remaining = Math.max(
    FREE_MONTHLY_SEND_LIMIT - sentThisMonth,
    0,
  );

  return {
    allowed: sentThisMonth < FREE_MONTHLY_SEND_LIMIT,
    isPro: false,
    sentThisMonth,
    limit: FREE_MONTHLY_SEND_LIMIT,
    remaining,
    monthStart,
    nextMonthStart,
  };
}