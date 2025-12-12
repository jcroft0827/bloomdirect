import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(request: Request) {
  const body = await request.text();
  const headerList = headers();
  const signature = (await headerList).get("stripe-signature");

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const shopId = session.client_reference_id;

      if (shopId) {
        await connectToDB();
        await Shop.findByIdAndUpdate(shopId, {
          isPro: true,
          proSince: new Date(),
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }
}
