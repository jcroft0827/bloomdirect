import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Order from "@/models/Order";
import Shop from "@/models/Shop";
import { Resend } from "resend";
import { getOrderEmailSubject } from "@/lib/order-email-subject";

function generateOrderNumber() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `GBD${date}-${random}`;
}

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // console.log("Created Body: ", body);

    const {
      fulfillingShopId,
      recipient,
      customer,
      logistics,
      pricing,
      products,
      paymentMethods,
    } = body;

    // console.log("Fulfilling Shop ID: ", fulfillingShopId);
    // console.log("Recipient Data: ", recipient);
    // console.log("Customer Data: ", customer);
    // console.log("Logistics Data: ", logistics);
    // console.log("Pricing Data: ", pricing);
    // console.log("Products Data: ", products);
    // console.log("Payment Methods Data: ", paymentMethods);

    const [originShop, fulfillShop] = await Promise.all([
      Shop.findById(session.user.id),
      Shop.findById(fulfillingShopId),
    ]);

    // console.log("Created Variables: ", originShop, " : ", fulfillShop);

    if (!originShop || !fulfillShop)
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      originatingShop: originShop._id,
      originatingShopName: originShop.businessName,
      fulfillingShop: fulfillShop._id,
      fulfillingShopName: fulfillShop.businessName,
      recipient,
      customer,
      logistics,
      products,
      pricing,
      paymentMethods,
      activityLog: [
        {
          action: "CREATED",
          message: `Order created by ${originShop.businessName}`,
          actorShop: originShop._id,
        },
      ],
    });

    // console.log("Created Order: ", order);

    // UPDATE SHOP STATS
    await Promise.all([
      Shop.findByIdAndUpdate(originShop._id, {
        $inc: { "stats.ordersSent": 1 },
      }),
      Shop.findByIdAndUpdate(fulfillShop._id, {
        $inc: { "stats.ordersReceived": 1 },
      }),
    ]);

    // EMAIL NOTIFICATION
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "GetBloomDirect Orders <new-orders@getbloomdirect.com>",
      to: fulfillShop.email,
      subject: `New Order: ${order.orderNumber} from ${originShop.businessName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>New GetBloomDirect Order</title>
          <link href="https://googleapis.com" rel="stylesheet">
        </head>
        <body style="margin:0; padding:0; background-color:#faf8f5; font-family:'Inter', sans-serif; color:#2d1b3d;">
          <!-- Outer Centering Table -->
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#faf8f5;">
            <tr>
              <td align="center" style="padding: 40px 10px;">
                
                <div style="max-width: 640px; width: 100%; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(147,51,234,0.1); text-align: left;">

                  <!-- Header Gradient -->
                  <div style="background: linear-gradient(135deg, #9333ea 0%, #c084fc 100%); padding: 45px 30px; text-align: center; color: white;">
                    <h1 style="margin:0; font-family: 'Playfair Display', serif; font-size: 42px; font-weight: 700; line-height: 1.2;">
                      A New Order Has Bloomed
                    </h1>
                    <p style="margin: 15px 0 0; font-size: 22px; opacity: 0.9; letter-spacing: 1px;">
                      Order #${order.orderNumber}
                    </p>
                  </div>

                  <!-- Content Wrapper -->
                  <div style="padding: 40px 30px;">
                    
                    <!-- From & Delivery -->
                    <div style="margin-bottom: 35px; border-bottom: 1px dashed #e5e7eb; padding-bottom: 25px;">
                      <p style="margin:0; color:#9333ea; font-weight:700; font-size:14px; text-transform: uppercase; letter-spacing: 1px;">From Shop</p>
                      <p style="margin:10px 0 0; font-size:22px; font-weight:600; color:#2d1b3d;">
                        ${originShop.businessName}
                      </p>
                      <p style="margin:4px 0 0; font-size:16px; color:#666;">
                        ${originShop.address.city}, ${originShop.address.state}
                      </p>
                      
                      <div style="margin-top: 25px;">
                        <p style="margin:0; color:#9333ea; font-weight:700; font-size:14px; text-transform: uppercase; letter-spacing: 1px;">Deliver By</p>
                        <p style="margin:10px 0 0; font-size:26px; font-weight:800; color:#2d1b3d;">
                          ${new Date(order.logistics.deliveryDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </p>
                        <div style="margin-top: 12px; padding:10px 20px; background:${order.logistics.deliveryTimeOption === "specific" ? "#fee2e2" : "#ecfdf5"}; color:${order.logistics.deliveryTimeOption === "specific" ? "#991b1b" : "#166534"}; border-radius:50px; display:inline-block; font-weight:700; font-size: 16px;">
                          ${order.logistics.deliveryTimeOption === "specific" ? `⏱ ${order.logistics.deliveryTimeFrom} – ${order.logistics.deliveryTimeTo}` : "☀️ Any time that day"}
                        </div>
                      </div>
                    </div>

                    <!-- Combined Person Info Box -->
                    <div style="background:#f8f4ff; padding:30px; border-radius:20px; margin-bottom:35px; border-left:6px solid #9333ea;">
                      <!-- Recipient -->
                      <div>
                        <h2 style="margin:0 0 10px; color:#9333ea; font-size:18px; text-transform: uppercase; letter-spacing: 1px;">Recipient</h2>
                        <p style="margin:0; font-size:22px; font-weight:700; text-transform: capitalize; color:#2d1b3d;">${order.recipient.fullName}</p>
                        <p style="margin:10px 0; color:#444; line-height:1.6; font-size: 18px;">
                          ${order.recipient.address}<br>
                          ${order.recipient.city}, ${order.recipient.state} ${order.recipient.zip}<br>
                          <strong>Phone:</strong> ${order.recipient.phone || "Not provided"}<br>
                          ${order.recipient.company ? `<strong>Company:</strong> ${order.recipient.company}` : ""}
                        </p>
                      </div>

                      <!-- Spacer -->
                      <div style="height: 40px; border-bottom: 1px solid #e0d5f5; margin-bottom: 30px;"></div>

                      <!-- Customer -->
                      <div>
                        <h2 style="margin:0 0 10px; color:#9333ea; font-size:18px; text-transform: uppercase; letter-spacing: 1px;">Customer (Sender)</h2>
                        <p style="margin:0; font-size:22px; font-weight:700; text-transform: capitalize; color:#2d1b3d;">${order.customer.fullName}</p>
                        <p style="margin:10px 0 0; color:#444; line-height:1.6; font-size: 18px;">
                          <strong>Phone:</strong> ${order.customer.phone || "Not provided"}<br>
                          <strong>Email:</strong> ${order.customer.email || "Not provided"}
                        </p>
                      </div>
                    </div>

                    <!-- Card Message -->
                    ${
                      order.recipient.message
                        ? `
                    <div style="background:#fffbeb; padding:30px; border-radius:20px; margin-bottom:35px; border-left:6px solid #f59e0b;">
                      <h2 style="margin:0 0 12px; color:#92400e; font-size:18px; text-transform: uppercase;">Card Message</h2>
                      <p style="margin:0; font-style:italic; font-size:20px; color:#5f3d00; line-height: 1.5;">
                        “${order.recipient.message}”
                      </p>
                    </div>`
                        : ""
                    }

                    <!-- Order Items -->
                    <div style="margin-bottom: 10px;">
                      <h2 style="margin:0 0 20px; color:#9333ea; font-size:22px; font-weight: 800;">Order Items</h2>
                      
                      ${order.products
                        .map(
                          (product: any) => `
                        <div style="padding: 20px 0; border-bottom: 1px solid #eee;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="vertical-align: top;">
                                <p style="margin:0; font-size:20px; font-weight:700; color:#2d1b3d;">${product.name}</p>
                                <p style="margin:8px 0; font-size:16px; color:#555; line-height:1.4;">${product.description}</p>
                                <p style="margin:0; font-size:16px; font-weight:600; color:#9333ea;">Quantity: ${product.qty}</p>
                              </td>
                              <td style="vertical-align: top; text-align: right; width: 100px;">
                                <p style="margin:0; font-size:20px; font-weight:700; color:#2d1b3d;">
                                  $${(Math.round(product.price * product.qty * 100) / 100).toFixed(2)}
                                </p>
                              </td>
                            </tr>
                          </table>
                        </div>
                      `,
                        )
                        .join("")}
                    </div>

                    <!-- Total Value Summary -->
                    <div style="padding: 25px 0; text-align: right;">
                      <p style="margin:0; font-size:22px; color:#444;">
                        Total Order Value: <span style="color:#16a34a; font-weight:800; font-size: 28px;">$${pricing.customerPays.toFixed(2)}</span>
                      </p>
                    </div>

                    <!-- Special Instructions -->
                    ${
                      order.logistics.specialInstructions
                        ? `
                    <div style="background:#fef3c7; padding:25px; border-radius:16px; margin:20px 0; border-left:6px solid #f59e0b;">
                      <h3 style="margin:0 0 10px; color:#92400e; font-size:18px;">Special Instructions</h3>
                      <p style="margin:0; color:#78350f; line-height:1.6; font-size: 18px;">${order.logistics.specialInstructions}</p>
                    </div>`
                        : ""
                    }

                    <!-- Earnings Section -->
                    <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); padding:40px 30px; border-radius:24px; text-align:center; margin:40px 0; border: 2px dashed #6ee7b7;">
                        <p style="margin:0; color:#065f46; font-size:20px; font-weight:600;">
                          Your payout for this order:
                        </p>
                        <p style="margin:15px 0; color:#059669; font-size:56px; font-weight:900; line-height: 1;">
                          $${pricing.fulfillingShopGets.toFixed(2)}
                        </p>
                        <p style="margin:0; color:#065f46; font-size:16px; font-style: italic;">
                          Payment will be sent by ${originShop.businessName} via ${fulfillShop.paymentMethods.defaultPaymentMethod} once you accept.
                        </p>
                    </div>

                    <!-- CTA -->
                    <div style="text-align:center; margin:50px 0;">
                      <a href="https://www.getbloomdirect.com/dashboard/incoming"
                          style="background-color:#9333ea; color:#ffffff; padding:22px 50px; border-radius:50px; text-decoration:none; font-weight:800; font-size:20px; box-shadow:0 12px 30px rgba(147,51,234,0.3); display:inline-block;">
                        View Order
                      </a>
                    </div>

                    <!-- Footer -->
                    <div style="text-align:center; padding-top:40px; border-top:1px solid #eee; color:#aaa; font-size:15px;">
                      <p style="margin:0;">Thank you for bringing beauty to someone’s day.</p>
                      <p style="margin:12px 0 0; font-weight: 600; color: #9333ea;">GetBloomDirect • The Future for Florists</p>
                    </div>

                  </div>
                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });
    // html: `
    //   <!DOCTYPE html>
    //   <html>
    //   <head>
    //     <meta charset="utf-8">
    //     <meta name="viewport" content="width=device-width, initial-scale=1">
    //     <title>New GetBloomDirect Order</title>
    //     <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
    //   </head>
    //   <body style="margin:0; padding:0; background:#faf8f5; font-family:'Inter', sans-serif; color:#2d1b3d;">
    //   <div style="max-width: 640px; margin: 40px auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(147,51,234,0.1);">

    //     <!-- Header Gradient -->
    //     <div style="background: linear-gradient(135deg, #9333ea 0%, #c084fc 100%); padding: 40px 30px; text-align: center; color: white;">
    //       <h1 style="margin:0; font-family: 'Playfair Display', serif; font-size: 42px; font-weight: 700;">
    //         A New Order Has Bloomed
    //       </h1>
    //       <p style="margin: 12px 0 0; font-size: 20px; opacity: 0.9;">
    //         ${order.orderNumber}
    //       </p>
    //     </div>

    //     <!-- Main Content -->
    //     <div style="padding: 40px 30px; max-width: 600px; margin: auto;">

    //       <!-- From & Delivery -->
    //       <div style="margin-bottom: 32px;">
    //         <p style="margin:0; color:#9333ea; font-weight:600; font-size:15px;">FROM</p>
    //         <p style="margin:8px 0 0; font-size:20px; font-weight:600; color:#2d1b3d;">
    //           ${originShop.businessName}<br>
    //           <span style="font-weight:400; color:#666;">${originShop.address.city}, ${
    //             originShop.address.state
    //           }</span>
    //         </p>
    //       </div>

    //       <div style="display:flex; gap:40px; margin-bottom:40px; flex-wrap:wrap;">
    //         <div>
    //           <p style="margin:0; color:#9333ea; font-weight:600; font-size:15px;">DELIVER BY</p>
    //           <p style="margin:8px 0 0; font-size:24px; font-weight:700; color:#2d1b3d;">
    //             ${new Date(order.logistics.deliveryDate).toLocaleDateString("en-US", {
    //               weekday: "long",
    //               month: "long",
    //               day: "numeric",
    //             })}
    //           </p>
    //           <p style="margin:8px 0 0; padding:8px 16px; background:${
    //             order.logistics.deliveryTimeOption === "specific" ? "#fee2e2" : "#ecfdf5"
    //           }; color:${
    //             order.logistics.deliveryTimeOption === "specific" ? "#991b1b" : "#166534"
    //           }; border-radius:50px; display:inline-block; font-weight:600;">
    //             ${
    //               order.logistics.deliveryTimeOption === "specific"
    //                 ? `${order.logistics.deliveryTimeFrom} – ${order.logistics.deliveryTimeTo}`
    //                 : "Any time that day"
    //             }
    //           </p>
    //         </div>
    //       </div>

    //       <!-- Recipient -->
    //       <div style="background:#f8f4ff; padding:24px; border-radius:16px; margin-bottom:32px; border-left:5px solid #9333ea;">
    //         <h2 style="margin:0 0 12px; color:#9333ea; font-size:20px;">Recipient</h2>
    //         <p style="margin:0; font-size:18px; font-weight:600; text-transform: capitalize;">
    //           ${order.recipient.fullName}
    //         </p>
    //         <p style="margin:8px 0; color:#444; line-height:1.6;">
    //           ${order.recipient.address}<br>
    //           ${order.recipient.city}, ${order.recipient.state} ${
    //             order.recipient.zip
    //           }<br>
    //           ${order.recipient.phone || "Not provided"}<br>
    //           ${order.recipient.company || ""}
    //         </p>
    //       </div>

    //       <!-- Customer -->
    //       <div style="background:#f8f4ff; padding:24px; border-radius:16px; margin-bottom:32px; border-left:5px solid #9333ea;">
    //         <h2 style="margin:0 0 12px; color:#9333ea; font-size:20px;">Customer</h2>
    //         <p style="margin:0; font-size:18px; font-weight:600; text-transform: capitalize;">
    //           ${order.customer.fullName}
    //         </p>
    //         <p style="margin:8px 0; color:#444; line-height:1.6;">
    //           ${order.customer.phone || "Not provided"}<br>
    //           ${order.customer.email || ""}
    //         </p>
    //       </div>

    //       <!-- Card Message -->
    //       ${
    //         order.recipient.message
    //           ? `
    //       <div style="background:#fffbeb; padding:24px; border-radius:16px; margin-bottom:32px; border-left:5px solid #f59e0b;">
    //         <h2 style="margin:0 0 12px; color:#92400e;">Card Message</h2>
    //         <p style="margin:0; font-style:italic; font-size:17px; color:#5f3d00;">
    //           “${order.recipient.message}”
    //         </p>
    //       </div>`
    //           : ""
    //       }

    //       <!-- Products -->
    //       <h2 style="margin:32px 0 12px; color:#9333ea; font-size:20px;">Order Items</h2>

    //       <div style="display:flex; flex-direction:column; gap:1rem; ">
    //         ${order.products.map((product: any) => `
    //             <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid #eee;>
    //               <div style="">
    //                 <p style="margin:0; font-weight:600; color:#2d1b3d;">${product.name}</p>
    //                 <p style="margin:0; margin:4px;"><strong>Description: </strong>${product.description}</p>
    //                 <p style="margin:0; font-size:14px; color:#666;">Qty: ${product.qty}</p>
    //               </div>
    //               <p>
    //                 $${(Math.round(product.price * product.qty * 100) / 100).toFixed(2)}
    //               </p>
    //             </div>
    //         `).join('')}
    //       </div>

    //       <!-- Products Total -->
    //       <div>
    //         <p style="margin:0; font-size:18px; color:#444;">
    //           Total value: <strong style="color:#16a34a;">$${pricing.customerPays.toFixed(
    //             2,
    //           )}</strong>
    //         </p>
    //       </div>

    //       <!-- Special Instructions -->
    //       ${
    //         order.logistics.specialInstructions
    //           ? `
    //       <div style="background:#fef3c7; padding:24px; border-radius:16px; margin:32px 0; border-left:5px solid #f59e0b;">
    //         <h3 style="margin:0 0 12px; color:#92400e;">Special Instructions</h3>
    //         <p style="margin:0; color:#78350f; line-height:1.6;">${order.logistics.specialInstructions}</p>
    //       </div>`
    //           : ""
    //       }

    //       <!-- Earnings -->
    //       <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); padding:32px; border-radius:16px; text-align:center; margin:40px 0;">
    //           <p style="margin:0; color:#166534; font-size:18px; font-weight:600;">
    //             Earnings for this order
    //           </p>
    //           <p style="margin:16px 0 0; color:#166534; font-size:48px; font-weight:800;">
    //             $${pricing.fulfillingShopGets.toFixed(2)}
    //           </p>
    //           <p style="margin:8px 0 0; color:#166534; font-size:16px;">
    //             Payment is requested after you accept this order
    //           </p>
    //       </div>

    //       <!-- CTA Button -->
    //       <div style="text-align:center; margin:48px 0;">
    //         <a href="https://www.getbloomdirect.com/dashboard/incoming"
    //             style="background:#9333ea; color:white; padding:18px 48px; border-radius:50px; text-decoration:none; font-weight:700; font-size:18px; box-shadow:0 10px 25px rgba(147,51,234,0.3); display:inline-block;">
    //           View Full Order Details
    //         </a>
    //       </div>

    //       <!-- Footer -->
    //       <div style="text-align:center; padding-top:40px; border-top:1px solid #eee; color:#999; font-size:14px;">
    //         <p style="margin:0;">Thank you for bringing beauty to someone’s day.</p>
    //         <p style="margin:12px 0 0;">GetBloomDirect • The future of florists</p>
    //       </div>
    //     </div>
    //   </div>
    //   </body>
    //   </html>
    // `,

    // return NextResponse.json({ success: true });
    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("ORDER CREATE ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
