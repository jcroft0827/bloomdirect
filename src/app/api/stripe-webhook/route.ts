// src/app/api/stripe-webhook/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop"; // Your user model

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
    console.log(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") {
        await connectToDB();
        // Update your shop/user model
        await Shop.findByIdAndUpdate(
          session.client_reference_id, // Pass shopId as client_reference_id in checkout creation
          { isPro: true, proSince: new Date() }
        );
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}