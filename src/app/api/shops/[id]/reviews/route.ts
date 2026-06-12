import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid Shop ID" }, { status: 400 });
    }

    if (session.user.id === id) {
      return NextResponse.json(
        { error: "You cannot review your own shop." },
        { status: 400 },
      );
    }

    const { rating, comment } = await req.json();

    const numericRating = Number(rating);

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5." },
        { status: 400 },
      );
    }

    const reviewerShop = await Shop.findById(session.user.id).select(
      "businessName",
    );

    if (!reviewerShop) {
      return NextResponse.json(
        { error: "Reviewer shop not found." },
        { status: 404 },
      );
    }

    const updatedShop = await Shop.findByIdAndUpdate(
      id,
      {
        $push: {
          reviews: {
            order: null,
            reviewerShop: session.user.id,
            reviewerShopName: reviewerShop.businessName,
            reviewedShopRole: "profile",
            source: "profile",
            rating: numericRating,
            comment: comment?.trim() || "",
            date: new Date(),
          },
        },
      },
      { new: true },
    ).select("reviews");

    if (!updatedShop) {
      return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      reviews: updatedShop.reviews,
    });

  } catch (error) {
    console.error("Failed to submit profile review: ", error);

    return NextResponse.json(
      { error: "Failed to submit review." },
      { status: 500 },
    );
  }
}