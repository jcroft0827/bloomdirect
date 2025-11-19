// src/app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "STRIPE_SECRET_KEY missing" }, { status: 500 });
  }

  try {
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20" as any,  // ← stable, works with all SDKs
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
      customer_email: session.user.email,
      client_reference_id: session.user.shopId?.toString(),
    });

    // Server-side redirect — works with latest Stripe
    return NextResponse.redirect(checkoutSession.url!);
  } catch (err: any) {
    console.error("Full Stripe error:", err.message);
    return NextResponse.json({ error: `Stripe error: ${err.message}` }, { status: 500 });
  }
}