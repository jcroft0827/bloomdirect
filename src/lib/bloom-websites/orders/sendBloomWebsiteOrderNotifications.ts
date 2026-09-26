import { getResend } from "@/lib/resend";
import { EmailEvent } from "@/models/EmailEvent";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";
import Shop from "@/models/Shop";

type NotificationKind =
  | "customer_order_confirmation"
  | "florist_new_order"
  | "customer_status_update"
  | "customer_delivery_confirmation"
  | "customer_refund_confirmation";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function quantityLabel(value: unknown) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return "0";
  const rounded = Math.round(quantity * 100) / 100;
  return String(rounded);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function statusLabel(status: string) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "in_preparation":
      return "In preparation";
    case "preparation_complete":
      return "Preparation complete";
    case "ready_for_pickup":
      return "Ready for pickup";
    case "out_for_delivery":
      return "Out for delivery";
    case "fulfilled":
      return "Completed";
    case "canceled":
      return "Canceled";
    default:
      return "Order update";
  }
}

function eventAlreadySent(order: any, kind: NotificationKind, status = "") {
  const statusScoped =
    kind === "customer_status_update" ||
    kind === "customer_refund_confirmation";

  return Array.isArray(order.communications?.events) &&
    order.communications.events.some(
      (event: any) =>
        event.kind === kind &&
        (!statusScoped || event.status === status),
    );
}

async function recordEmail({
  order,
  kind,
  status = "",
  recipient,
  subject,
  payload,
  send,
}: {
  order: any;
  kind: NotificationKind;
  status?: string;
  recipient: string;
  subject: string;
  payload: Record<string, unknown>;
  send: () => Promise<any>;
}) {
  if (!recipient || eventAlreadySent(order, kind, status)) return;

  const statusScoped =
    kind === "customer_status_update" ||
    kind === "customer_refund_confirmation";
  const eventScope = {
    kind,
    ...(statusScoped ? { status } : {}),
  };
  const claimedAt = new Date();

  /*
   * Claim the notification on the canonical order before calling Resend.
   * Two webhook/browser/recovery finalizers can legitimately converge on the
   * same paid order at the same time. The order document is the lock that lets
   * only one of them perform this external side effect.
   */
  const claimed = await BloomWebsiteOrder.findOneAndUpdate(
    {
      _id: order._id,
      "communications.events": {
        $not: {
          $elemMatch: eventScope,
        },
      },
    },
    {
      $push: {
        "communications.events": {
          kind,
          status,
          recipient,
          resendId: "",
          sentAt: claimedAt,
        },
      },
    },
    { new: false },
  );

  if (!claimed) return;

  let result: any;

  try {
    result = await send();

    if (result?.error) {
      throw new Error(result.error.message || "Resend could not send email.");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown transactional email error";

    /*
     * An explicit send failure is safe to retry later. Remove only the empty
     * claim created above. If the process disappears after Resend accepts the
     * email, the claim remains and prevents a duplicate confirmation.
     */
    await BloomWebsiteOrder.updateOne(
      { _id: order._id },
      {
        $pull: {
          "communications.events": {
            ...eventScope,
            recipient,
            resendId: "",
          },
        },
      },
    ).catch(() => null);

    await EmailEvent.create({
      type: `bloomwebsite_${kind}`,
      to: recipient,
      subject,
      status: "failed",
      error: message,
      payload,
    }).catch(() => null);

    console.error(`BloomWebsite ${kind} email failed:`, message);
    return;
  }

  const resendId = result?.data?.id || "";

  /*
   * The claim already protects idempotency, so logging failures after a
   * successful send must never remove it and cause a later duplicate email.
   */
  await BloomWebsiteOrder.updateOne(
    { _id: order._id },
    {
      $set: {
        "communications.events.$[event].resendId": resendId,
        "communications.events.$[event].sentAt": new Date(),
      },
    },
    {
      arrayFilters: [
        {
          "event.kind": kind,
          ...(statusScoped ? { "event.status": status } : {}),
          "event.recipient": recipient,
          "event.resendId": "",
        },
      ],
    },
  ).catch((error) => {
    console.error(`BloomWebsite ${kind} notification claim update failed:`, error);
  });

  await EmailEvent.create({
    type: `bloomwebsite_${kind}`,
    to: recipient,
    subject,
    status: "sent",
    resendId,
    payload,
  }).catch((error) => {
    console.error(`BloomWebsite ${kind} email audit log failed:`, error);
  });
}

export async function sendBloomWebsitePlacedNotifications(orderId: string) {
  const order = await BloomWebsiteOrder.findById(orderId);
  if (!order) return;

  const shop = await Shop.findById(order.shop)
    .select("businessName email contact.email")
    .lean<any>();

  if (!shop) return;

  const resend = getResend();
  const customerName =
    `${order.customer.firstName} ${order.customer.lastName}`.trim();
  const storefrontName =
    order.storefront?.siteName || shop.businessName || "Your florist";

  const itemRows = order.items
    .map(
      (item: any) => `
        <tr>
          <td style="padding:10px 0;color:#111827;font-weight:700;">
            ${escapeHtml(item.name)}
            <div style="font-size:12px;color:#6b7280;font-weight:400;">
              ${escapeHtml(item.tierLabel)} · Qty ${item.quantity}
            </div>
          </td>
          <td style="padding:10px 0;text-align:right;color:#111827;font-weight:700;">
            ${money(item.lineTotalCents)}
          </td>
        </tr>
      `,
    )
    .join("");

  const floristItemRows = order.items
    .map((item: any) => {
      const recipeIngredients = Array.isArray(item.recipe?.ingredients)
        ? item.recipe.ingredients
        : [];

      const recipeHtml =
        recipeIngredients.length > 0 || item.recipe?.designerInstructions
          ? `
            <div style="margin-top:14px;border:1px solid #ede9fe;background:#faf5ff;border-radius:12px;padding:14px;">
              <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#6d28d9;">
                Design recipe · ${escapeHtml(item.tierLabel)}
              </div>
              ${
                recipeIngredients.length
                  ? `<table style="width:100%;border-collapse:collapse;margin-top:10px;">
                      ${recipeIngredients
                        .map((ingredient: any) => {
                          const perItem = Number(ingredient.quantity || 0);
                          const orderTotal =
                            perItem * Number(item.quantity || 1);

                          return `
                            <tr>
                              <td style="padding:7px 0;border-top:1px solid #ede9fe;color:#111827;">
                                <strong>${escapeHtml(ingredient.name)}</strong>
                                <div style="font-size:11px;color:#6b7280;text-transform:capitalize;">
                                  ${escapeHtml(ingredient.kind)}
                                  ${
                                    ingredient.notes
                                      ? ` · ${escapeHtml(ingredient.notes)}`
                                      : ""
                                  }
                                </div>
                              </td>
                              <td style="padding:7px 0;border-top:1px solid #ede9fe;text-align:right;color:#4b5563;font-size:12px;">
                                ${quantityLabel(perItem)} ${escapeHtml(
                                  ingredient.unit || "",
                                )} each
                              </td>
                              <td style="padding:7px 0 7px 12px;border-top:1px solid #ede9fe;text-align:right;color:#111827;font-weight:800;font-size:12px;">
                                ${quantityLabel(orderTotal)} ${escapeHtml(
                                  ingredient.unit || "",
                                )} total
                              </td>
                            </tr>
                          `;
                        })
                        .join("")}
                    </table>`
                  : ""
              }
              ${
                item.recipe?.designerInstructions
                  ? `<div style="margin-top:12px;">
                      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;">Designer instructions</div>
                      <div style="margin-top:5px;font-size:13px;line-height:1.6;color:#374151;white-space:pre-wrap;">${escapeHtml(
                        item.recipe.designerInstructions,
                      )}</div>
                    </div>`
                  : ""
              }
            </div>
          `
          : "";

      return `
        <div style="padding:16px 0;border-top:1px solid #e5e7eb;">
          <div style="display:flex;justify-content:space-between;gap:18px;">
            <div>
              <div style="font-weight:800;color:#111827;">${escapeHtml(
                item.name,
              )}</div>
              <div style="margin-top:3px;font-size:12px;color:#6b7280;">
                ${escapeHtml(item.tierLabel)} · Qty ${item.quantity}
              </div>
            </div>
            <div style="font-weight:800;color:#111827;">${money(
              item.lineTotalCents,
            )}</div>
          </div>
          ${recipeHtml}
        </div>
      `;
    })
    .join("");

  await recordEmail({
    order,
    kind: "customer_order_confirmation",
    recipient: order.customer.email,
    subject: `${storefrontName} order confirmation — ${order.orderNumber}`,
    payload: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      kind: "customer_order_confirmation",
    },
    send: () =>
      resend.emails.send({
        from: "BloomWebsites Orders <orders@getbloomdirect.com>",
        to: order.customer.email,
        subject: `${storefrontName} order confirmation — ${order.orderNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:28px;color:#1f2937;">
            <div style="background:#7c3aed;color:#fff;border-radius:20px;padding:28px;">
              <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;">Order received</div>
              <h1 style="margin:8px 0 0;font-size:30px;">Thank you, ${escapeHtml(customerName || "there")}!</h1>
              <p style="margin:10px 0 0;opacity:.9;">${escapeHtml(storefrontName)} received your order.</p>
            </div>
            <div style="padding:26px 4px;">
              <p><strong>Order:</strong> ${escapeHtml(order.orderNumber)}</p>
              <p><strong>${order.fulfillment.type === "pickup" ? "Pickup" : "Delivery"} date:</strong> ${escapeHtml(order.fulfillment.requestedDate)}</p>
              <table style="width:100%;border-collapse:collapse;margin-top:18px;">
                ${itemRows}
              </table>
              <div style="border-top:1px solid #e5e7eb;margin-top:14px;padding-top:16px;text-align:right;">
                <div style="font-size:18px;font-weight:800;">Total ${money(order.totals.totalCents)}</div>
              </div>
              <p style="margin-top:28px;color:#6b7280;font-size:13px;line-height:1.6;">
                Payment has been confirmed. The florist will contact you if anything about fulfillment requires attention.
              </p>
            </div>
          </div>
        `,
      }),
  });

  const floristEmail = shop.email || shop.contact?.email || "";

  await recordEmail({
    order,
    kind: "florist_new_order",
    recipient: floristEmail,
    subject: `New website order ${order.orderNumber}`,
    payload: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      kind: "florist_new_order",
    },
    send: () =>
      resend.emails.send({
        from: "BloomWebsites Orders <new-orders@getbloomdirect.com>",
        to: floristEmail,
        subject: `New website order ${order.orderNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:28px;color:#1f2937;">
            <div style="background:#111827;color:#fff;border-radius:20px;padding:28px;">
              <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#c4b5fd;">BloomWebsites</div>
              <h1 style="margin:8px 0 0;font-size:30px;">New website order</h1>
              <p style="margin:10px 0 0;color:#e5e7eb;">${escapeHtml(order.orderNumber)} · ${money(order.totals.totalCents)}</p>
            </div>
            <div style="padding:26px 4px;">
              <p><strong>Customer:</strong> ${escapeHtml(customerName)}</p>
              <p><strong>Fulfillment:</strong> ${order.fulfillment.type === "pickup" ? "Pickup" : "Delivery"} on ${escapeHtml(order.fulfillment.requestedDate)}</p>
              <p><strong>Items:</strong> ${order.itemCount}</p>
              <div style="margin-top:18px;">
                ${floristItemRows}
              </div>
              <p style="margin-top:26px;">
                <a href="https://www.getbloomdirect.com/dashboard/websites/orders/${order._id}"
                   style="display:inline-block;background:#7c3aed;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">
                  View Website Order
                </a>
              </p>
            </div>
          </div>
        `,
      }),
  });
}

export async function sendBloomWebsiteStatusNotification(orderId: string) {
  const order = await BloomWebsiteOrder.findById(orderId);
  if (!order || order.status === "placed") return;

  const label =
    order.status === "fulfilled" && order.fulfillment.type === "pickup"
      ? "Picked up"
      : statusLabel(order.status);
  const storefrontName = order.storefront?.siteName || "Your florist";
  const resend = getResend();

  await recordEmail({
    order,
    kind: "customer_status_update",
    status: order.status,
    recipient: order.customer.email,
    subject: `${storefrontName}: ${label} — ${order.orderNumber}`,
    payload: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      kind: "customer_status_update",
      status: order.status,
    },
    send: () =>
      resend.emails.send({
        from: "BloomWebsites Orders <orders@getbloomdirect.com>",
        to: order.customer.email,
        subject: `${storefrontName}: ${label} — ${order.orderNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:28px;color:#1f2937;">
            <h1 style="font-size:28px;margin:0;">${escapeHtml(label)}</h1>
            <p style="font-size:16px;line-height:1.6;">
              Your order <strong>${escapeHtml(order.orderNumber)}</strong> from
              ${escapeHtml(storefrontName)} is now <strong>${escapeHtml(label.toLowerCase())}</strong>.
            </p>
            <p style="color:#6b7280;font-size:13px;">
              ${order.fulfillment.type === "pickup" ? "Pickup" : "Delivery"} date:
              ${escapeHtml(order.fulfillment.requestedDate)}
            </p>
          </div>
        `,
      }),
  });
}


export async function sendBloomWebsiteDeliveryConfirmation(orderId: string) {
  const order = await BloomWebsiteOrder.findById(orderId);
  if (
    !order ||
    order.status !== "fulfilled" ||
    order.fulfillment.type !== "delivery"
  ) {
    return;
  }

  const storefrontName = order.storefront?.siteName || "Your florist";
  const recipientName = [
    order.recipient?.firstName,
    order.recipient?.lastName,
  ]
    .filter(Boolean)
    .join(" ");
  const resend = getResend();

  await recordEmail({
    order,
    kind: "customer_delivery_confirmation",
    recipient: order.customer.email,
    subject: `${storefrontName}: Your order has been delivered — ${order.orderNumber}`,
    payload: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      kind: "customer_delivery_confirmation",
      status: "fulfilled",
    },
    send: () =>
      resend.emails.send({
        from: "BloomWebsites Orders <orders@getbloomdirect.com>",
        to: order.customer.email,
        subject: `${storefrontName}: Your order has been delivered — ${order.orderNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:28px;color:#1f2937;">
            <div style="background:#111827;color:#fff;border-radius:20px;padding:28px;">
              <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#c4b5fd;">Delivery confirmation</div>
              <h1 style="margin:8px 0 0;font-size:30px;">Your order has been delivered</h1>
            </div>
            <div style="padding:26px 4px;">
              <p style="font-size:16px;line-height:1.6;">
                Order <strong>${escapeHtml(order.orderNumber)}</strong> from
                ${escapeHtml(storefrontName)} has been marked delivered.
              </p>
              ${
                recipientName
                  ? `<p><strong>Recipient:</strong> ${escapeHtml(recipientName)}</p>`
                  : ""
              }
              <p><strong>Delivery date:</strong> ${escapeHtml(order.fulfillment.requestedDate)}</p>
              <p style="margin-top:26px;color:#6b7280;font-size:13px;line-height:1.6;">
                Thank you for ordering from ${escapeHtml(storefrontName)}.
              </p>
            </div>
          </div>
        `,
      }),
  });
}


export async function sendBloomWebsiteRefundNotification(
  orderId: string,
  refundId: string,
) {
  const order = await BloomWebsiteOrder.findById(orderId);
  if (!order) return;

  const refund = order.refunds?.find(
    (entry: any) => entry.refundId === refundId,
  );

  if (!refund || refund.status !== "succeeded") return;

  const storefrontName =
    order.storefront?.siteName || "Your florist";
  const resend = getResend();

  const allocationRows = Array.isArray(refund.allocations)
    ? refund.allocations
        .map(
          (allocation: any) => `
            <tr>
              <td style="padding:8px 0;color:#374151;">
                ${escapeHtml(allocation.label || "Refund")}
                ${
                  allocation.quantity
                    ? `<div style="font-size:12px;color:#6b7280;">Qty ${allocation.quantity}</div>`
                    : ""
                }
              </td>
              <td style="padding:8px 0;text-align:right;font-weight:700;color:#111827;">
                ${money(allocation.totalAmountCents || 0)}
              </td>
            </tr>
          `,
        )
        .join("")
    : "";

  await recordEmail({
    order,
    kind: "customer_refund_confirmation",
    status: refundId,
    recipient: order.customer.email,
    subject: `${storefrontName}: Refund issued — ${order.orderNumber}`,
    payload: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      refundId,
      amountCents: refund.amountCents,
      kind: "customer_refund_confirmation",
    },
    send: () =>
      resend.emails.send({
        from: "BloomWebsites Orders <orders@getbloomdirect.com>",
        to: order.customer.email,
        subject: `${storefrontName}: Refund issued — ${order.orderNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:28px;color:#1f2937;">
            <div style="background:#111827;color:#fff;border-radius:20px;padding:28px;">
              <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#c4b5fd;">Refund confirmation</div>
              <h1 style="margin:8px 0 0;font-size:30px;">${money(refund.amountCents)} refunded</h1>
            </div>
            <div style="padding:26px 4px;">
              <p>
                A refund has been issued for order
                <strong>${escapeHtml(order.orderNumber)}</strong> from
                ${escapeHtml(storefrontName)}.
              </p>
              ${
                allocationRows
                  ? `<table style="width:100%;border-collapse:collapse;margin-top:18px;">${allocationRows}</table>`
                  : ""
              }
              ${
                refund.reason
                  ? `<p style="margin-top:18px;"><strong>Reason:</strong> ${escapeHtml(refund.reason)}</p>`
                  : ""
              }
              <p style="margin-top:24px;color:#6b7280;font-size:13px;line-height:1.6;">
                The time it takes for the refund to appear depends on your card issuer or bank.
              </p>
            </div>
          </div>
        `,
      }),
  });
}
