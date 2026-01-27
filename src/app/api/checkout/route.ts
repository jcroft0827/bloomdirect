// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore — preview version (your account uses 2025-11-17.clover)
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  // Get the logged-in user from NextAuth
  const userSession = await getServerSession(authOptions);

  if (!userSession?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Read the priceId from the form POST (sent by your button)
  const formData = await req.formData();
  const priceId = formData.get("priceId") as string;

  if (!priceId) {
    return NextResponse.json({ error: "Missing price ID" }, { status: 400 });
  }

  try {
    // Create the Stripe Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?canceled=true`,
      customer_email: userSession.user.email,
      // This is what your webhook uses to know which shop paid
      client_reference_id: userSession.user.id,
    });

    // Redirect the user to Stripe Checkout
    return NextResponse.redirect(checkoutSession.url!, 303);
  } catch (error: any) {
    console.error("CHECKOUT ERROR:", error);

    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error: "Something went wrong. Please try again.",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
