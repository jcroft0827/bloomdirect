import { NextResponse } from "next/server";
import Stripe from "stripe";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

export const config = {
  api: {
    bodyParser: false, // Stripe requires raw body
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Connect DB once per event
  await connectToDB();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;

      const shopId = session.client_reference_id; // we fixed this above

      if (!shopId) {
        console.error("Missing shopId in checkout.session.completed");
        break;
      }

      await Shop.findByIdAndUpdate(shopId, {
        isPro: true,
        proSince: new Date(),
      });

      console.log("🔥 Shop upgraded:", shopId);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const shopId = sub.metadata?.shopId;

      if (!shopId) break;

      await Shop.findByIdAndUpdate(shopId, {
        isPro: false,
      });

      console.log("⛔ Subscription canceled for:", shopId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
