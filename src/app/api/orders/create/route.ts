import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import Shop from "@/models/Shop";
import { resend } from "@/lib/resend";

export async function POST(req: Request) {
  await connectToDB();
  const body = await req.json();

  const { originatingShopId, fulfillingShopId, recipient, pricing } = body;

  const order = await Order.create({
    originatingShop: originatingShopId,
    fulfillingShop: fulfillingShopId,
    recipientName: recipient.name,
    recipientAddress: recipient.address,
    recipientCity: recipient.city,
    recipientState: recipient.state,
    recipientZip: recipient.zip,
    cardMessage: recipient.message,
    arrangementValue: pricing.arrangement,
    deliveryFee: pricing.delivery,
    originatingFee: pricing.fee,
    totalCustomerPaid: pricing.total,
  });

  // Populate shops for email
  const [originShop, fulfillShop] = await Promise.all([
    Shop.findById(originatingShopId),
    Shop.findById(fulfillingShopId),
  ]);

  // Send email to fulfilling shop
  await resend.emails.send({
    from: "BloomDirect <orders@bloomdirect.co>",
    to: fulfillShop.email,
    subject: `New Incoming Order from ${originShop.shopName}!`,
    html: `
      <h2>New BloomDirect Order</h2>
      <p><strong>From:</strong> ${originShop.shopName} (${originShop.city}, ${originShop.state})</p>
      <p><strong>Deliver to:</strong> ${recipient.name}<br>
      ${recipient.address}, ${recipient.city}, ${recipient.state} ${recipient.zip}</p>
      <p><strong>Card Message:</strong> ${recipient.message || "None"}</p>
      <p><strong>You receive:</strong> $${pricing.arrangement + pricing.delivery} (full amount)</p>
      <p><strong>Payment:</strong> 
      <a href="https://venmo.com/?txn=pay&recipients=${encodeURIComponent(fulfillShop.phone)}&amount=${pricing.arrangement + pricing.delivery}&note=BloomDirect%20Order%20%23${order._id}">
      Pay with Venmo
      </a> 
      or 
      <a href="https://cash.app/$cashtag?amount=${pricing.arrangement + pricing.delivery}">
      Pay with Cash App
      </a>
      or Zelle to ${fulfillShop.phone}
      </p>
      <p><strong>Deliver by:</strong> As discussed</p>
      <hr>
      <p><a href="http://localhost:3000/dashboard/incoming">View in BloomDirect →</a></p>
    `,
  });

  return NextResponse.json({ success: true, order });
}