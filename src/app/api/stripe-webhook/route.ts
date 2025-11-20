// src/app/api/stripe-webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop"; // ← your shop/user model

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore — preview version
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.log("Webhook signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const shopId = session.client_reference_id;
    if (!shopId) {
      console.log("No client_reference_id — skipping");
      return new Response("No shopId", { status: 200 });
    }

    await connectToDB();
    await Shop.findByIdAndUpdate(shopId, {
      isPro: true,
      proSince: new Date(),
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
    });

    console.log(`Shop ${shopId} upgraded to Pro!`);
  }

  return new Response("Success", { status: 200 });
}

// Required for Stripe webhooks (raw body)
export const config = {
  api: {
    bodyParser: false,
  },
};