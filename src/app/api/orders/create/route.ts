// app/api/orders/create/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Order from "@/models/Order";
import Shop from "@/models/Shop";
import { Resend } from "resend";

/**
 * Generates a readable BloomDirect order number
 * Example: BD250918-4821
 */
function generateOrderNumber() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BD${date}-${random}`;
}

export async function POST(req: Request) {
  try {
    await connectToDB();

    // 1️⃣ Get logged-in shop (shop === user)
    const session = await getServerSession(authOptions);
    const originatingShopId = session?.user?.id;

    if (!originatingShopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Read request payload
    const body = await req.json();

    const {
      fulfillingShopId,
      recipient,
      customer,
      deliveryDate,
      pricing,
      productDescription = "Designer’s Choice",
      productName = "",
      productPhoto = null,
      specialInstructions = "",
      deliveryTimeOption = "anytime",
      deliveryTimeFrom = null,
      deliveryTimeTo = null,
    } = body;

    // 3️⃣ Validate critical IDs
    if (!fulfillingShopId) {
      return NextResponse.json(
        { error: "Missing fulfilling shop" },
        { status: 400 }
      );
    }

    // 4️⃣ Calculate money
    const totalCustomerPaid =
      pricing.arrangement + pricing.delivery + pricing.fee;

    const bloomDirectFee = Math.round(totalCustomerPaid * 0.2 * 100) / 100;
    const fulfillingShopGets = totalCustomerPaid - bloomDirectFee;

    // 5️⃣ Load shops
    const [originShop, fulfillShop] = await Promise.all([
      Shop.findById(originatingShopId),
      Shop.findById(fulfillingShopId),
    ]);

    if (!originShop) {
      return NextResponse.json(
        { error: "Originating shop not found" },
        { status: 404 }
      );
    }

    if (!fulfillShop) {
      return NextResponse.json(
        { error: "Fulfilling shop not found" },
        { status: 404 }
      );
    }

    // 6️⃣ Create order
    const order = await Order.create({
      orderNumber: generateOrderNumber(),

      originatingShop: originShop._id,
      originatingShopName: originShop.shopName,

      fulfillingShop: fulfillShop._id,
      fulfillingShopName: fulfillShop.shopName,

      recipient: {
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        fullName: `${recipient.firstName} ${recipient.lastName}`.trim(),
        address: recipient.address,
        city: recipient.city,
        state: recipient.state,
        zip: recipient.zip,
        phone: recipient.phone,
        email: recipient.email || null,
        message: recipient.message || "",
      },

      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
      },

      deliveryDate: new Date(deliveryDate),

      productDescription,
      productName: productName || productDescription,
      productPhoto,
      specialInstructions,

      deliveryTimeOption,
      deliveryTimeFrom:
        deliveryTimeOption === "specific" ? deliveryTimeFrom : null,
      deliveryTimeTo:
        deliveryTimeOption === "specific" ? deliveryTimeTo : null,

      totalCustomerPaid,
      bloomDirectFee,
      fulfillingShopGets,

      // legacy fields
      arrangementValue: pricing.arrangement,
      deliveryFee: pricing.delivery,
      originatingFee: pricing.fee,
    });

    // 7️⃣ Email fulfilling shop
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "BloomDirect Orders <new-orders@getbloomdirect.com>",
      to: fulfillShop.email,
      subject: `New Order • ${order.orderNumber} • ${originShop.shopName}`,
html: `
 <!DOCTYPE html>
 <html>
 <head>
 <meta charset="utf-8">
 <meta name="viewport" content="width=device-width, initial-scale=1">
 <title>New BloomDirect Order</title>
 <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
 </head>
 <body style="margin:0; padding:0; background:#faf8f5; font-family:'Inter', sans-serif; color:#2d1b3d;">
 <div style="max-width: 640px; margin: 40px auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(147,51,234,0.1);">

   <!-- Header Gradient -->
   <div style="background: linear-gradient(135deg, #9333ea 0%, #c084fc 100%); padding: 40px 30px; text-align: center; color: white;">
     <h1 style="margin:0; font-family: 'Playfair Display', serif; font-size: 42px; font-weight: 700;">
       A New Order Has Bloomed
     </h1>
     <p style="margin: 12px 0 0; font-size: 20px; opacity: 0.9;">
       ${order.orderNumber}
     </p>
   </div>

   <!-- Main Content -->
   <div style="padding: 40px 30px;">
  
     <!-- From & Delivery -->
     <div style="margin-bottom: 32px;">
       <p style="margin:0; color:#9333ea; font-weight:600; font-size:15px;">FROM</p>
       <p style="margin:8px 0 0; font-size:20px; font-weight:600; color:#2d1b3d;">
         ${originShop.shopName}<br>
         <span style="font-weight:400; color:#666;">${originShop.city}, ${
       originShop.state
     }</span>
       </p>
     </div>

     <div style="display:flex; gap:40px; margin-bottom:40px; flex-wrap:wrap;">
       <div>
         <p style="margin:0; color:#9333ea; font-weight:600; font-size:15px;">DELIVER BY</p>
         <p style="margin:8px 0 0; font-size:24px; font-weight:700; color:#2d1b3d;">
           ${new Date(order.deliveryDate).toLocaleDateString("en-US", {
             weekday: "long",
             month: "long",
             day: "numeric",
           })}
         </p>
         <p style="margin:8px 0 0; padding:8px 16px; background:${
           order.deliveryTimeOption === "specific" ? "#fee2e2" : "#ecfdf5"
         }; color:${
       order.deliveryTimeOption === "specific" ? "#991b1b" : "#166534"
     }; border-radius:50px; display:inline-block; font-weight:600;">
           ${
             order.deliveryTimeOption === "specific"
               ? `${order.deliveryTimeFrom} – ${order.deliveryTimeTo}`
               : "Any time that day"
           }
         </p>
       </div>
     </div>

     <!-- Recipient -->
     <div style="background:#f8f4ff; padding:24px; border-radius:16px; margin-bottom:32px; border-left:5px solid #9333ea;">
       <h2 style="margin:0 0 12px; color:#9333ea; font-size:20px;">Recipient</h2>
       <p style="margin:0; font-size:18px; font-weight:600;">
         ${order.recipient.firstName} ${order.recipient.lastName}
       </p>
       <p style="margin:8px 0; color:#444; line-height:1.6;">
         ${order.recipient.address}<br>
         ${order.recipient.city}, ${order.recipient.state} ${
       order.recipient.zip
     }<br>
         Phone: ${order.recipient.phone || "Not provided"}
       </p>
     </div>

     <!-- Card Message -->
     ${
       order.recipient.message
         ? `
     <div style="background:#fffbeb; padding:24px; border-radius:16px; margin-bottom:32px; border-left:5px solid #f59e0b;">
       <h2 style="margin:0 0 12px; color:#92400e;">Card Message</h2>
       <p style="margin:0; font-style:italic; font-size:17px; color:#5f3d00;">
         “${order.recipient.message}”
       </p>
     </div>`
         : ""
     }

     <!-- Product -->
     ${
       order.productPhoto
         ? `
       <div style="text-align:center; margin:32px 0;">
         <img src="${order.productPhoto}" alt="${
             order.productName || "Arrangement"
           }" style="max-width:100%; height:auto; border-radius:16px; box-shadow:0 10px 30px rgba(0,0,0,0.1);">
       </div>`
         : ""
     }
    
     <h2 style="margin:32px 0 12px; color:#9333ea; font-size:20px;">
       ${
         order.productName
           ? `Product: ${order.productName}`
           : "Designer’s Choice Arrangement"
       }
     </h2>
     <p style="margin:0; font-size:18px; color:#444;">
       Total value: <strong style="color:#16a34a;">$${totalCustomerPaid.toFixed(
         2
       )}</strong>
     </p>

     <!-- Special Instructions -->
     ${
       order.specialInstructions
         ? `
     <div style="background:#fef3c7; padding:24px; border-radius:16px; margin:32px 0; border-left:5px solid #f59e0b;">
       <h3 style="margin:0 0 12px; color:#92400e;">Special Instructions</h3>
       <p style="margin:0; color:#78350f; line-height:1.6;">${order.specialInstructions}</p>
     </div>`
         : ""
     }

     <!-- Earnings -->
     <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); padding:32px; border-radius:16px; text-align:center; margin:40px 0;">
       <p style="margin:0; color:#166534; font-size:18px; font-weight:600;">You earn today</p>
       <p style="margin:16px 0 0; color:#166534; font-size:48px; font-weight:800; font-family:'Playfair Display', serif;">
         $${order.fulfillingShopGets.toFixed(2)}
       </p>
       <p style="margin:8px 0 0; color:#166534; font-size:16px;">80% of order • paid instantly</p>
     </div>

     <!-- Payment Options -->
     <div style="margin:40px 0;">
       <p style="margin:0 0 16px; font-weight:600; color:#2d1b3d;">Get paid instantly via:</p>
       <div style="display:flex; gap:16px; flex-wrap:wrap; justify-content:center;">
         <a href="https://venmo.com/?txn=pay&recipients=${encodeURIComponent(
           fulfillShop.phone
         )}&amount=${order.fulfillingShopGets.toFixed(2)}&note=BloomDirect%20${
       order.orderNumber
     }"
            style="background:#008CFF; color:white; padding:14px 28px; border-radius:12px; text-decoration:none; font-weight:600;">
           Venmo
         </a>
         <a href="https://cash.app/$cashtag?amount=${order.fulfillingShopGets.toFixed(
           2
         )}"
            style="background:#00C244; color:white; padding:14px 28px; border-radius:12px; text-decoration:none; font-weight:600;">
           Cash App
         </a>
       </div>
       <p style="margin:20px 0 0; text-align:center; color:#666;">
         Or Zelle to: <strong>${fulfillShop.phone}</strong>
       </p>
     </div>

     <!-- CTA Button -->
     <div style="text-align:center; margin:48px 0;">
       <a href="https://www.getbloomdirect.com/dashboard/incoming"
          style="background:#9333ea; color:white; padding:18px 48px; border-radius:50px; text-decoration:none; font-weight:700; font-size:18px; box-shadow:0 10px 25px rgba(147,51,234,0.3); display:inline-block;">
         View Full Order Details
       </a>
     </div>

     <!-- Footer -->
     <div style="text-align:center; padding-top:40px; border-top:1px solid #eee; color:#999; font-size:14px;">
       <p style="margin:0;">Thank you for bringing beauty to someone’s day.</p>
       <p style="margin:12px 0 0;">BloomDirect • The future of florists</p>
     </div>
   </div>
 </div>
 </body>
 </html>
 `,
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("ORDER CREATE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
};