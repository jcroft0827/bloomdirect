import authOptions from "@/lib/auth";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { connectToDB } from "@/lib/mongoose";
import { EmailEvent } from "@/models/EmailEvent";

const resend = new Resend(process.env.RESEND_API_KEY);

function money(value: unknown) {
  return `$${(Number(value) || 0).toFixed(2)}`;
}

function escapeHtml(value: unknown) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string) {
  if (!value) return "Not provided";

  return new Date(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    await connectToDB();
    
    const originShop = await Shop.findById(session?.user?.id).select(
      "businessName email",
    );

    if (!originShop) {
      return NextResponse.json(
        { error: "Origin shop not found." },
        { status: 404 },
      );
    }

    const body = await req.json();

    const {
      orderId,
      toEmail,
      outsideFlorist,
      recipient,
      customer,
      logistics,
      manualOrder,
      cardMessage,
      manualNotes,
    } = body;

    if (!toEmail) {
      return NextResponse.json(
        { error: "Florist email is required." },
        { status: 400 },
      );
    }

    if (!outsideFlorist?.name) {
      return NextResponse.json(
        { error: "Outside florist name is required." },
        { status: 400 },
      );
    }

    if (
      !recipient?.fullName &&
      (!recipient?.firstName || !recipient?.lastName)
    ) {
      return NextResponse.json(
        { error: "Recipient information is required." },
        { status: 400 },
      );
    }

    if (!manualOrder?.items?.length) {
      return NextResponse.json(
        { error: "At least one order item is required." },
        { status: 400 },
      );
    }

    const sendingShopName = escapeHtml(originShop.businessName);

    const recipientName = escapeHtml(
      recipient.fullName ||
        `${recipient.firstName || ""} ${recipient.lastName || ""}`.trim(),
    );

    const customerName = escapeHtml(
      customer?.fullName ||
        `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim(),
    );

    const deliveryTime =
      logistics?.deliveryTimeOption === "specific"
        ? `${escapeHtml(logistics.deliveryTimeFrom)} - ${escapeHtml(
            logistics.deliveryTimeTo,
          )}`
        : "Anytime";

    const itemsHtml = manualOrder.items
      .map(
        (item: any) => `
          <tr>
            <td style="padding:10px;border-bottom:1px solid #eee;">
              <strong>${escapeHtml(item.name)}</strong>
              ${
                item.description
                  ? `<div style="color:#666;font-size:13px;margin-top:3px;">${escapeHtml(
                      item.description,
                    )}</div>`
                  : ""
              }
            </td>
            <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">
              ${Number(item.qty) || 1}
            </td>
            <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">
              ${money(item.price)}
            </td>
            <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">
              ${money(item.lineTotal)}
            </td>
          </tr>
        `,
      )
      .join("");

    const html = `
      <div style="margin:0;padding:0;background:#f6f3fb;font-family:Arial,Helvetica,sans-serif;color:#222;">
        <div style="max-width:720px;margin:0 auto;padding:28px 16px;">
          <div style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e6def5;">
            <div style="background:#7c3aed;color:white;padding:24px 28px;">
              <h1 style="margin:0;font-size:24px;">Flower Order Details</h1>
              <p style="margin:8px 0 0;font-size:15px;opacity:.95;">
                Sent by ${sendingShopName} through GetBloomDirect
              </p>
            </div>

            <div style="padding:26px 28px;">
              <p style="font-size:16px;line-height:1.5;margin-top:0;">
                Hello ${escapeHtml(outsideFlorist.name)},
              </p>

              <p style="font-size:15px;line-height:1.6;color:#444;">
                ${sendingShopName} is sending over the details for an outside-network flower order.
                Please review the information below and contact the sending shop if anything needs to be confirmed.
              </p>

              <div style="margin:22px 0;padding:16px;border-radius:14px;background:#f8f5ff;border:1px solid #e6def5;">
                <h2 style="margin:0 0 10px;font-size:18px;color:#5b21b6;">Recipient</h2>
                <p style="margin:4px 0;"><strong>${recipientName}</strong></p>
                <p style="margin:4px 0;">${escapeHtml(recipient.address)} ${
                  recipient.apt ? `, ${escapeHtml(recipient.apt)}` : ""
                }</p>
                <p style="margin:4px 0;">${escapeHtml(recipient.city)}, ${escapeHtml(
                  recipient.state,
                )} ${escapeHtml(recipient.zip)}</p>
                <p style="margin:4px 0;">Phone: ${escapeHtml(recipient.phone)}</p>
                ${
                  recipient.company
                    ? `<p style="margin:4px 0;">Company/Event: ${escapeHtml(
                        recipient.company,
                      )}</p>`
                    : ""
                }
              </div>

              <div style="margin:22px 0;padding:16px;border-radius:14px;background:#ffffff;border:1px solid #eee;">
                <h2 style="margin:0 0 10px;font-size:18px;color:#5b21b6;">Delivery</h2>
                <p style="margin:4px 0;">Date: ${formatDate(logistics.deliveryDate)}</p>
                <p style="margin:4px 0;">Time: ${deliveryTime}</p>
                ${
                  logistics.specialInstructions
                    ? `<p style="margin:8px 0 0;"><strong>Special Instructions:</strong><br />${escapeHtml(
                        logistics.specialInstructions,
                      )}</p>`
                    : ""
                }
              </div>

              ${
                cardMessage
                  ? `
                    <div style="margin:22px 0;padding:16px;border-radius:14px;background:#fff7ed;border:1px solid #fed7aa;">
                      <h2 style="margin:0 0 10px;font-size:18px;color:#9a3412;">Card Message</h2>
                      <p style="margin:0;white-space:pre-line;">${escapeHtml(cardMessage)}</p>
                    </div>
                  `
                  : ""
              }

              <h2 style="margin:24px 0 10px;font-size:18px;color:#5b21b6;">Order Items</h2>

              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead>
                  <tr style="background:#f3f0fa;">
                    <th style="padding:10px;text-align:left;">Item</th>
                    <th style="padding:10px;text-align:center;">Qty</th>
                    <th style="padding:10px;text-align:right;">Price</th>
                    <th style="padding:10px;text-align:right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div style="margin-top:22px;border-top:1px solid #eee;padding-top:16px;">
                <table style="width:100%;font-size:15px;">
                  <tr>
                    <td style="padding:5px 0;">Product Total</td>
                    <td style="padding:5px 0;text-align:right;">${money(
                      manualOrder.productTotal,
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;">Delivery Fee</td>
                    <td style="padding:5px 0;text-align:right;">${money(
                      manualOrder.deliveryFee,
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;">Tax ${
                      manualOrder.taxPercent
                        ? `(${Number(manualOrder.taxPercent).toFixed(2)}%)`
                        : ""
                    }</td>
                    <td style="padding:5px 0;text-align:right;">${money(
                      manualOrder.taxAmount,
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:17px;"><strong>Total Customer Pays</strong></td>
                    <td style="padding:8px 0;text-align:right;font-size:17px;"><strong>${money(
                      manualOrder.orderTotal,
                    )}</strong></td>
                  </tr>
                </table>
              </div>

              ${
                customerName || customer?.phone || customer?.email
                  ? `
                    <div style="margin:22px 0;padding:16px;border-radius:14px;background:#f9fafb;border:1px solid #eee;">
                      <h2 style="margin:0 0 10px;font-size:18px;color:#5b21b6;">Customer</h2>
                      ${
                        customerName
                          ? `<p style="margin:4px 0;"><strong>${customerName}</strong></p>`
                          : ""
                      }
                      ${
                        customer?.phone
                          ? `<p style="margin:4px 0;">Phone: ${escapeHtml(
                              customer.phone,
                            )}</p>`
                          : ""
                      }
                      ${
                        customer?.email
                          ? `<p style="margin:4px 0;">Email: ${escapeHtml(
                              customer.email,
                            )}</p>`
                          : ""
                      }
                    </div>
                  `
                  : ""
              }

              ${
                manualNotes
                  ? `
                    <div style="margin:22px 0;padding:16px;border-radius:14px;background:#f9fafb;border:1px solid #eee;">
                      <h2 style="margin:0 0 10px;font-size:18px;color:#5b21b6;">Order Notes</h2>
                      <p style="margin:0;white-space:pre-line;">${escapeHtml(manualNotes)}</p>
                    </div>
                  `
                  : ""
              }

              <div style="margin-top:28px;padding:16px;border-radius:14px;background:#f3f0fa;text-align:center;">
                <p style="margin:0 0 8px;font-size:14px;color:#444;">
                  This order was organized through GetBloomDirect.
                </p>
                <a href="https://getbloomdirect.com"
                   style="display:inline-block;margin-top:4px;color:#6d28d9;font-weight:bold;text-decoration:none;">
                  Learn more about joining GetBloomDirect
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const subject = `Flower Order Details for ${recipientName}`;

    const emailResult = await resend.emails.send({
      from: "GetBloomDirect <orders@getbloomdirect.com>",
      to: toEmail,
      subject,
      html,
    });

    await EmailEvent.create({
      type: "outside_network_order_email",
      to: toEmail,
      subject,
      status: "sent",
      resendId: emailResult.data?.id || "",
      payload: {
        orderId: orderId || null,
        outsideFlorist,
        recipient,
        customer,
        logistics,
        manualOrder,
        cardMessage,
        manualNotes,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("OUTSIDE NETWORK EMAIL ERROR:", error);

    return NextResponse.json(
      { error: error.message || "Failed to send outside-network order email." },
      { status: 500 },
    );
  }
}
