import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/lib/auth";
import Shop from "@/models/Shop";
import { connectToDB } from "@/lib/mongoose";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { id: targetShopId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(targetShopId)) {
      return NextResponse.json(
        { error: "Invalid florist ID." },
        { status: 400 },
      );
    }

    if (session.user.id === targetShopId) {
      return NextResponse.json(
        { error: "You cannot favorite your own shop." },
        { status: 400 },
      );
    }

    await connectToDB();

    const [currentShop, targetShop] = await Promise.all([
      Shop.findById(session.user.id).select(
        "isPro isSuspended preferredFlorists",
      ),
      Shop.findById(targetShopId).select(
        "businessName address.zip isPublic isSuspended",
      ),
    ]);

    if (!currentShop) {
      return NextResponse.json(
        { error: "Your shop account could not be found." },
        { status: 404 },
      );
    }

    if (currentShop.isSuspended) {
      return NextResponse.json(
        { error: "This account cannot manage favorite florists." },
        { status: 403 },
      );
    }

    if (!currentShop.isPro) {
      return NextResponse.json(
        {
          error: "Favorite Florists is available with Bloom Pro.",
          upgradeRequired: true,
        },
        { status: 403 },
      );
    }

    if (!targetShop || !targetShop.isPublic || targetShop.isSuspended) {
      return NextResponse.json(
        { error: "This florist is not currently available." },
        { status: 404 },
      );
    }

    const existingFavoriteIndex = currentShop.preferredFlorists.findIndex(
      (favorite: any) => String(favorite) === String(targetShopId),
    );

    let isFavorite: boolean;

    if (existingFavoriteIndex >= 0) {
      currentShop.preferredFlorists.splice(existingFavoriteIndex, 1);

      isFavorite = false;
    } else {
      currentShop.preferredFlorists.push(targetShop._id);

      isFavorite = true;
    }

    await currentShop.save();

    return NextResponse.json({
      success: true,
      isFavorite,
      message: isFavorite
        ? "Florist added to favorites."
        : "Florist removed from favorites.",
    });
  } catch (error) {
    console.error("Favorite florist error:", error);

    return NextResponse.json(
      { error: "Unable to update favorite florist." },
      { status: 500 },
    );
  }
}
