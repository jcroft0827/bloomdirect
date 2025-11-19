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
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY missing from env vars" },
      { status: 500 }
    );
  }

  try {
    const stripe = new Stripe(stripeKey, {
      // Use the newest version Stripe shows you in the dropdown (2024-10-07, 2024-11-20, etc.)
      apiVersion: "2025-10-29" as any, // ← change this to whatever is the latest in your Stripe dashboard
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

      // THIS IS THE ONLY LINE YOU NEEDED TO ADD
      client_reference_id: session.user.shopId?.toString(),
      // If your session uses id instead of shopId, use: session.user.id
    });

    return NextResponse.redirect(checkoutSession.url!);
  } catch (err: any) {
    console.error("Full Stripe error:", err.message);
    return NextResponse.json({ error: `Stripe error: ${err.message}` }, { status: 500 });
  }
}



// // src/app/api/checkout/route.ts
// import { NextResponse } from "next/server";
// import Stripe from "stripe";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: "2024-06-20" as any, // ← fixes apiVersion squiggly
// });

// export async function POST(req: Request) {
//   const session = await getServerSession(authOptions);

//   if (!session?.user?.email) {
//     return NextResponse.redirect(new URL("/login", req.url)); // ← req.url fixes "request" squiggly
//   }

//   try {
//     const checkoutSession = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       line_items: [
//         {
//           price: process.env.STRIPE_PRICE_ID!, // ← use env var (add to .env.local)
//           quantity: 1,
//         },
//       ],
//       mode: "subscription",
//       success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?success=true`,
//       cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
//       customer_email: session.user.email,
//     });

//     return NextResponse.redirect(checkoutSession.url!);
//   } catch (err) {
//     return NextResponse.json({ error: "Stripe error" }, { status: 500 });
//   }
// }