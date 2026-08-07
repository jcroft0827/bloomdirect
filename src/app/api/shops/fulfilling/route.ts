/**
 * Fulfilling Shop API
 *
 * This route retrieves the florist selected to fulfill an order.
 *
 * It exists so the sending-order workflow can load the selected florist's
 * operational information after confirming that the florist is eligible to
 * receive an order from the authenticated sending shop.
 *
 * This route is responsible for:
 * - authenticating the requesting florist
 * - validating the requested fulfilling-shop ID
 * - enforcing centralized receiving-eligibility rules
 * - respecting one-way florist blocking
 * - returning the selected florist's order-related information
 *
 * This route is not responsible for:
 * - creating an order
 * - calculating the final order total
 * - processing payments or settlements
 * - changing either shop's account information
 */

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { getShopReceivingEligibility } from "@/lib/shops/getShopReceivingEligibility";
import Shop from "@/models/Shop";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const data: unknown = await req.json();

    if (
      !data ||
      typeof data !== "object" ||
      !("fulfillShopId" in data) ||
      typeof data.fulfillShopId !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing Shop ID" },
        { status: 400 },
      );
    }

    const { fulfillShopId } = data;

    if (!Types.ObjectId.isValid(fulfillShopId)) {
      return NextResponse.json(
        { error: "Invalid Shop ID" },
        { status: 400 },
      );
    }

    /*
     * Keep the sending shop because the shared eligibility service needs its
     * blocked-florist relationships.
     *
     * We intentionally do not exclude the sending shop from consideration.
     * A florist may legitimately send an order to their own shop.
     */
    const sendingShop = await Shop.findById(session.user.id)
      .select("_id blockedFlorists");

    if (!sendingShop) {
      return NextResponse.json(
        { error: "Sending shop not found" },
        { status: 404 },
      );
    }

    /*
     * Exclude credentials, security tokens, internal billing identifiers,
     * and API credentials from the response.
     */
    const fulfillingShop = await Shop.findById(fulfillShopId).select(
      [
        "-password",
        "-verificationCode",
        "-verificationCodeExpires",
        "-passwordResetToken",
        "-passwordResetExpires",
        "-resetPasswordToken",
        "-resetPasswordExpires",
        "-apiKey",
        "-apiKeys",
        "-stripeCustomerId",
        "-stripeSubscriptionId",
      ].join(" "),
    );

    if (!fulfillingShop) {
      return NextResponse.json(
        { error: "Fulfilling shop not found" },
        { status: 404 },
      );
    }

    const eligibility = getShopReceivingEligibility({
      receivingShop: fulfillingShop.toObject(),
      sendingShop: sendingShop.toObject(),
    });

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error: "This florist is not currently available to receive orders.",
          code: "FULFILLING_SHOP_NOT_ELIGIBLE",
          reasons: eligibility.reasons,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(fulfillingShop.toObject());
  } catch (error) {
    console.error("Failed to retrieve fulfilling shop:", error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 },
    );
  }
}