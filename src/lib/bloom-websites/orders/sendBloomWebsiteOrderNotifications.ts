import { getOrderCouponSummary } from "@/lib/bloom-websites/coupons/orderCouponSummary";
import { getResend } from "@/lib/resend";
import { EmailEvent } from "@/models/EmailEvent";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";
import Shop from "@/models/Shop";
import { getBloomWebsiteOrderStatusLabel } from "./fulfillment-status";

type NotificationKind =
  | "customer_order_confirmation"
  | "florist_new_order"
  | "customer_status_update"
  | "customer_delivery_confirmation"
  | "customer_refund_confirmation"
  | "customer_arrangement_photo";

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

function statusLabel(status: string, fulfillmentType: "delivery" | "pickup") {
  return getBloomWebsiteOrderStatusLabel(status, fulfillmentType);
}


function eventAlreadySent(
  order: any,
  kind: NotificationKind,
  status = "",
  scope = "",
) {
  const statusScoped =
    kind === "customer_status_update" ||
    kind === "customer_refund_confirmation";

  return (
    Array.isArray(order.communications?.events) &&
    order.communications.events.some((event: any) => {
      if (event.kind !== kind) return false;
      if (scope) return event.scope === scope;
      return !statusScoped || event.status === status;
    })
  );
}

async function recordEmail({
  order,
  kind,
  status = "",
  scope = "",
  recipient,
  subject,
  payload,
  send,
}: {
  order: any;
  kind: NotificationKind;
  status?: string;
  scope?: string;
  recipient: string;
  subject: string;
  payload: Record<string, unknown>;
  send: () => Promise<any>;
}) {
  if (!recipient) return false;
  if (eventAlreadySent(order, kind, status, scope)) return true;

  const statusScoped =
    kind === "customer_status_update" ||
    kind === "customer_refund_confirmation";
  const eventScope = {
    kind,
    ...(scope ? { scope } : statusScoped ? { status } : {}),
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
          scope,
          recipient,
          resendId: "",
          sentAt: claimedAt,
        },
      },
    },
    { new: false },
  );

  if (!claimed) return true;

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
      shopId: order.shop,
      type: `bloomwebsite_${kind}`,
      to: recipient,
      subject,
      status: "failed",
      error: message,
      payload,
    }).catch(() => null);

    console.error(`BloomWebsite ${kind} email failed:`, message);
    return false;
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
          ...(scope
            ? { "event.scope": scope }
            : statusScoped
              ? { "event.status": status }
              : {}),
          "event.recipient": recipient,
          "event.resendId": "",
        },
      ],
    },
  ).catch((error) => {
    console.error(`BloomWebsite ${kind} notification claim update failed:`, error);
  });

  await EmailEvent.create({
    shopId: order.shop,
    type: `bloomwebsite_${kind}`,
    to: recipient,
    subject,
    status: "sent",
    resendId,
    payload,
  }).catch((error) => {
    console.error(`BloomWebsite ${kind} email audit log failed:`, error);
  });

  return true;
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

  const coupon = getOrderCouponSummary(order);
  const financialRows = `
    <div style="font-size:13px;line-height:1.9;margin-top:12px;">
      <div>Merchandise subtotal: <strong>${money(order.totals.subtotalCents)}</strong></div>
      ${coupon ? `<div style="color:#15803d;">Coupon (${escapeHtml(coupon.code)}): <strong>−${money(coupon.discountCents)}</strong></div>` : ""}
      <div>${order.fulfillment.type === "pickup" ? "Pickup" : "Delivery"}: <strong>${money(order.totals.fulfillmentFeeCents)}</strong></div>
      ${order.totals.tipCents > 0 ? `<div>Gratuity: <strong>${money(order.totals.tipCents)}</strong></div>` : ""}
      <div>Sales tax: <strong>${money(order.totals.taxAmountCents)}</strong></div>
    </div>`;

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
                ${financialRows}
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
              ${financialRows}
              <p style="font-size:18px;font-weight:800;">Total paid: ${money(order.totals.totalCents)}</p>
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

function statusArrangementPhotoHtml(order: any, photoId?: string) {
  if (!photoId) return "";
  const photo = Array.isArray(order.arrangementPhotos)
    ? order.arrangementPhotos.find((entry: any) => entry.photoId === photoId)
    : null;
  if (!photo?.imageUrl || !/^https:\/\//i.test(photo.imageUrl)) return "";
  return `<div style="margin:24px 0"><p style="font-size:15px;font-weight:700">A photo of your arrangement</p><img src="${escapeHtml(photo.imageUrl)}" alt="Your floral arrangement" style="display:block;width:100%;max-width:520px;height:auto;border-radius:14px" />${photo.caption ? `<p style="color:#6b7280">${escapeHtml(photo.caption)}</p>` : ""}</div>`;
}

export async function sendBloomWebsiteStatusNotification(
  orderId: string,
  options: { customerNote?: string; scope?: string; notificationPhotoId?: string } = {},
) {
  const order = await BloomWebsiteOrder.findById(orderId);
  if (!order || order.status === "placed") return false;

  const label = statusLabel(order.status, order.fulfillment.type);
  const storefrontName = order.storefront?.siteName || "Your florist";
  const resend = getResend();
  const customerNote = String(options.customerNote || "").trim();
  const selectedPhotoHtml = statusArrangementPhotoHtml(order, options.notificationPhotoId);

  return recordEmail({
    order,
    kind: "customer_status_update",
    status: order.status,
    scope: options.scope || "",
    recipient: order.customer.email,
    subject: `${storefrontName}: ${label} — ${order.orderNumber}`,
    payload: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      kind: "customer_status_update",
      status: order.status,
      customerNote,
      ...(selectedPhotoHtml ? { notificationPhotoId: options.notificationPhotoId } : {}),
    },
    send: () =>
      resend.emails.send({
        from: "BloomWebsites Orders <orders@getbloomdirect.com>",
        to: order.customer.email,
        subject: `${storefrontName}: ${label} — ${order.orderNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:28px;color:#1f2937;">
            <div style="background:#111827;color:#fff;border-radius:20px;padding:28px;">
              <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#c4b5fd;">Order update</div>
              <h1 style="font-size:28px;margin:8px 0 0;">${escapeHtml(label)}</h1>
            </div>
            <div style="padding:24px 4px;">
              <p style="font-size:16px;line-height:1.6;">
                Your order <strong>${escapeHtml(order.orderNumber)}</strong> from
                ${escapeHtml(storefrontName)} is now <strong>${escapeHtml(label.toLowerCase())}</strong>.
              </p>
              ${selectedPhotoHtml}
              ${
                customerNote
                  ? `<div style="margin:18px 0;padding:16px 18px;border-radius:14px;background:#f5f3ff;color:#4c1d95;line-height:1.6;"><strong>Note from the florist:</strong><br>${escapeHtml(customerNote).replaceAll("\n", "<br>")}</div>`
                  : ""
              }
              <p style="color:#6b7280;font-size:13px;">
                ${order.fulfillment.type === "pickup" ? "Pickup" : "Delivery"} date:
                ${escapeHtml(order.fulfillment.requestedDate)}
              </p>
            </div>
          </div>
        `,
      }),
  });
}


export async function sendBloomWebsiteDeliveryConfirmation(
  orderId: string,
  options: { customerNote?: string; scope?: string; notificationPhotoId?: string } = {},
) {
  const order = await BloomWebsiteOrder.findById(orderId);
  if (
    !order ||
    order.status !== "fulfilled" ||
    order.fulfillment.type !== "delivery"
  ) {
    return false;
  }

  const storefrontName = order.storefront?.siteName || "Your florist";
  const recipientName = [
    order.recipient?.firstName,
    order.recipient?.lastName,
  ]
    .filter(Boolean)
    .join(" ");
  const resend = getResend();
  const customerNote = String(options.customerNote || "").trim();
  const selectedPhotoHtml = statusArrangementPhotoHtml(order, options.notificationPhotoId);

  return recordEmail({
    order,
    kind: "customer_delivery_confirmation",
    scope: options.scope || "",
    recipient: order.customer.email,
    subject: `${storefrontName}: Your order has been delivered — ${order.orderNumber}`,
    payload: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      kind: "customer_delivery_confirmation",
      status: "fulfilled",
      customerNote,
      ...(selectedPhotoHtml ? { notificationPhotoId: options.notificationPhotoId } : {}),
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
              ${selectedPhotoHtml}
              ${
                customerNote
                  ? `<div style="margin:18px 0;padding:16px 18px;border-radius:14px;background:#f5f3ff;color:#4c1d95;line-height:1.6;"><strong>Note from the florist:</strong><br>${escapeHtml(customerNote).replaceAll("\n", "<br>")}</div>`
                  : ""
              }
              <p style="margin-top:26px;color:#6b7280;font-size:13px;line-height:1.6;">
                Thank you for ordering from ${escapeHtml(storefrontName)}.
              </p>
            </div>
          </div>
        `,
      }),
  });
}


export async function sendBloomWebsiteArrangementPhoto(
  orderId: string,
  photoId: string,
) {
  const order = await BloomWebsiteOrder.findById(orderId);
  if (!order) return false;

  const photo = Array.isArray(order.arrangementPhotos)
    ? order.arrangementPhotos.find((entry: any) => entry.photoId === photoId)
    : null;

  if (!photo) return false;

  const storefrontName = order.storefront?.siteName || "Your florist";
  const resend = getResend();
  const caption = String(photo.caption || "").trim();

  return recordEmail({
    order,
    kind: "customer_arrangement_photo",
    status: order.status,
    scope: photoId,
    recipient: order.customer.email,
    subject: `${storefrontName}: A photo of your arrangement — ${order.orderNumber}`,
    payload: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      kind: "customer_arrangement_photo",
      photoId,
      imageUrl: photo.imageUrl,
      caption,
    },
    send: () =>
      resend.emails.send({
        from: "BloomWebsites Orders <orders@getbloomdirect.com>",
        to: order.customer.email,
        subject: `${storefrontName}: A photo of your arrangement — ${order.orderNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:28px;color:#1f2937;">
            <div style="background:#111827;color:#fff;border-radius:20px;padding:28px;">
              <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#c4b5fd;">From your florist</div>
              <h1 style="margin:8px 0 0;font-size:30px;">Here’s a photo of your arrangement</h1>
            </div>
            <div style="padding:24px 4px;">
              <p style="font-size:16px;line-height:1.6;">
                ${escapeHtml(storefrontName)} shared a photo from order
                <strong>${escapeHtml(order.orderNumber)}</strong>.
              </p>
              <img src="${escapeHtml(photo.imageUrl)}" alt="Arrangement for ${escapeHtml(order.orderNumber)}" style="display:block;width:100%;max-width:560px;height:auto;margin:20px auto;border-radius:18px;" />
              ${
                caption
                  ? `<p style="margin:18px 0;padding:16px 18px;border-radius:14px;background:#f9fafb;line-height:1.6;">${escapeHtml(caption).replaceAll("\n", "<br>")}</p>`
                  : ""
              }
              <p style="margin-top:24px;color:#6b7280;font-size:13px;line-height:1.6;">
                This photo is a courtesy update from your florist. Natural flowers and substitutions can vary slightly from photographs.
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
