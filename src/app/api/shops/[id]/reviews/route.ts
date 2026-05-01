import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDB();

    const { id } = await context.params;

    const { shopName, rating, comment } = await req.json();

    const numericRating = Number(rating);

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5." },
        { status: 400 }
      );
    }

    const updatedShop = await Shop.findByIdAndUpdate(
      id,
      {
        $push: {
          reviews: {
            shopName: shopName || "Anonymous",
            rating: numericRating,
            comment: comment?.trim() || "",
            date: new Date(),
          },
        },
      },
      { new: true }
    ).select("reviews");

    if (!updatedShop) {
      return NextResponse.json(
        { error: "Shop not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      reviews: updatedShop.reviews,
    });
  } catch (err) {
    console.error("Failed to submit review:", err);

    return NextResponse.json(
      { error: "Failed to submit review." },
      { status: 500 }
    );
  }
}