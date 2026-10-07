import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ClipboardList, CreditCard, MapPin, Store, UserRound } from "lucide-react";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";
import BloomWebsiteOrderActions from "@/components/websites/orders/BloomWebsiteOrderActions";
import BloomWebsiteOrderEditButton from "@/components/websites/orders/BloomWebsiteOrderEditButton";
import BloomWebsiteOrderHistory from "@/components/websites/orders/BloomWebsiteOrderHistory";
import TfposOrderExportCard from "@/components/websites/pos/TfposOrderExportCard";
import {
  getBloomWebsiteRefundAvailability,
} from "@/lib/bloom-websites/payments/refundBloomWebsiteOrder";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function label(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function BloomWebsiteOrderDetailPage({
  params,
}: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");

  const { orderId } = await params;
  await connectToDB();

  const order = await BloomWebsiteOrder.findOne({
    _id: orderId,
    shop: session.user.id,
  }).lean<any>();

  if (!order) notFound();

  const website = await BloomWebsite.findById(order.website)
    .select("orderPolicy.fulfillmentWorkflow")
    .lean<any>();

  const workflowMode =
    website?.orderPolicy?.fulfillmentWorkflow === "detailed"
      ? "detailed"
      : "simple";

  const refundContext = getBloomWebsiteRefundAvailability(order);

  const displayStatus =
    order.status === "fulfilled"
      ? order.fulfillment.type === "delivery"
        ? "Delivered"
        : "Picked Up"
      : order.status === "confirmed"
        ? "Placed"
        : label(order.status);

  const editableOrder = {
    customer: {
      firstName: order.customer?.firstName || "",
      lastName: order.customer?.lastName || "",
      email: order.customer?.email || "",
      phone: order.customer?.phone || "",
    },
    recipient: {
      firstName: order.recipient?.firstName || "",
      lastName: order.recipient?.lastName || "",
      phone: order.recipient?.phone || "",
      company: order.recipient?.company || "",
      deliveryInstructions: order.recipient?.deliveryInstructions || "",
    },
    fulfillment: {
      requestedDate: order.fulfillment?.requestedDate || "",
      window: {
        type: (order.fulfillment?.window?.type || "anytime") as
          | "anytime"
          | "morning"
          | "afternoon"
          | "custom",
        from: order.fulfillment?.window?.from || "",
        to: order.fulfillment?.window?.to || "",
      },
      deliveryAddress: {
        address1: order.fulfillment?.deliveryAddress?.address1 || "",
        address2: order.fulfillment?.deliveryAddress?.address2 || "",
        city: order.fulfillment?.deliveryAddress?.city || "",
        state: order.fulfillment?.deliveryAddress?.state || "",
        postalCode: order.fulfillment?.deliveryAddress?.postalCode || "",
        country: order.fulfillment?.deliveryAddress?.country || "US",
      },
    },
    cardMessage: order.cardMessage || "",
    floristInternalNote: order.floristInternalNote || "",
  };

  const canEditOrder = !["fulfilled", "canceled"].includes(order.status);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/dashboard/websites/orders"
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-purple-700"
      >
        <ArrowLeft size={16} />
        Website Orders
      </Link>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-purple-700">
              {displayStatus}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950">
              {order.orderNumber}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Placed {new Date(order.placedAt).toLocaleString("en-US")}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap gap-3 sm:justify-end">
              {canEditOrder && (
                <BloomWebsiteOrderEditButton
                  orderId={String(order._id)}
                  fulfillmentType={order.fulfillment.type}
                  initial={editableOrder}
                />
              )}

              <BloomWebsiteOrderActions
                orderId={String(order._id)}
                status={order.status}
                fulfillmentType={order.fulfillment.type}
                workflowMode={workflowMode}
                paymentStatus={order.payment.status}
                refundContext={refundContext}
              />
            </div>

          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-gray-950">Items</h2>

            <div className="mt-5 divide-y divide-gray-100">
              {order.items.map((item: any) => {
                const recipeIngredients = Array.isArray(item.recipe?.ingredients)
                  ? item.recipe.ingredients
                  : [];
                const hasRecipe =
                  recipeIngredients.length > 0 ||
                  Boolean(item.recipe?.designerInstructions);

                return (
                  <div
                    key={`${item.productId}-${item.tier}`}
                    className="py-5 first:pt-0 last:pb-0"
                  >
                    <div className="flex gap-4">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-24 w-24 shrink-0 rounded-2xl border border-gray-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-xs font-bold text-gray-400">
                          No photo
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-5">
                          <div>
                            <p className="font-black text-gray-950">{item.name}</p>
                            <p className="mt-1 text-sm text-gray-500">
                              {item.tierLabel} · Qty {item.quantity}
                            </p>
                          </div>
                          <p className="shrink-0 font-black text-gray-950">
                            {money(item.lineTotalCents)}
                          </p>
                        </div>

                        {item.addons?.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {item.addons.map((addon: any) => (
                              <p
                                key={String(addon.addonId)}
                                className="text-sm text-gray-500"
                              >
                                + {addon.name} × {addon.quantity}
                              </p>
                            ))}
                          </div>
                        )}

                        {item.arrangementContainerNote && (
                          <div className="mt-3 rounded-xl bg-gray-50 p-3">
                            <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                              Arrangement &amp; container note
                            </p>
                            <p className="mt-1 text-sm leading-6 text-gray-700">
                              {item.arrangementContainerNote}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {hasRecipe && (
                      <div className="mt-5 rounded-2xl border border-purple-100 bg-purple-50/50 p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                          <ClipboardList size={17} className="text-purple-700" />
                          <h3 className="font-black text-gray-950">
                            Design Recipe · {item.tierLabel}
                          </h3>
                        </div>

                        {recipeIngredients.length > 0 && (
                          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
                            <div className="min-w-[520px]">
                            <div className="grid grid-cols-[1fr_100px_110px] gap-3 bg-gray-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-500">
                              <span>Ingredient</span>
                              <span>Per item</span>
                              <span>Order total</span>
                            </div>
                            {recipeIngredients.map((ingredient: any, index: number) => {
                              const perItem = Number(ingredient.quantity || 0);
                              const total = perItem * Number(item.quantity || 1);
                              return (
                                <div
                                  key={`${ingredient.name}-${index}`}
                                  className="grid grid-cols-[1fr_100px_110px] gap-3 border-t border-gray-100 px-4 py-3 text-sm"
                                >
                                  <div>
                                    <p className="font-bold text-gray-900">
                                      {ingredient.name}
                                    </p>
                                    <p className="mt-0.5 text-xs capitalize text-gray-500">
                                      {ingredient.kind}
                                      {ingredient.notes ? ` · ${ingredient.notes}` : ""}
                                    </p>
                                  </div>
                                  <span className="text-gray-700">
                                    {perItem} {ingredient.unit}
                                  </span>
                                  <span className="font-black text-gray-950">
                                    {total} {ingredient.unit}
                                  </span>
                                </div>
                              );
                            })}
                            </div>
                          </div>
                        )}

                        {item.recipe?.designerInstructions && (
                          <div className="mt-4">
                            <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                              Designer instructions
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                              {item.recipe.designerInstructions}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {(order.cardMessage ||
            order.recipient?.deliveryInstructions ||
            order.floristInternalNote) && (
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-gray-950">
                Card & Instructions
              </h2>

              {order.cardMessage && (
                <div className="mt-5">
                  <p className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Card message
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {order.cardMessage}
                  </p>
                </div>
              )}

              {order.recipient?.deliveryInstructions && (
                <div className="mt-5">
                  <p className="text-xs font-black uppercase tracking-wider text-gray-400">
                    Fulfillment instructions
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {order.recipient.deliveryInstructions}
                  </p>
                </div>
              )}

              {order.floristInternalNote && (
                <div className="mt-5 rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-purple-700">
                    Florist internal note
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {order.floristInternalNote}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <UserRound size={18} className="text-purple-700" />
              <h2 className="font-black text-gray-950">Customer</h2>
            </div>
            <p className="mt-4 font-bold text-gray-900">
              {order.customer.firstName} {order.customer.lastName}
            </p>
            <p className="mt-1 text-sm text-gray-500">{order.customer.email}</p>
            {order.customer.phone && (
              <p className="mt-1 text-sm text-gray-500">{order.customer.phone}</p>
            )}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              {order.fulfillment.type === "pickup" ? (
                <Store size={18} className="text-purple-700" />
              ) : (
                <MapPin size={18} className="text-purple-700" />
              )}
              <h2 className="font-black text-gray-950">
                {order.fulfillment.type === "pickup" ? "Pickup" : "Delivery"}
              </h2>
            </div>

            <p className="mt-4 font-bold text-gray-900">
              {order.fulfillment.requestedDate}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">
              {order.fulfillment.window?.type === "custom"
                ? `${order.fulfillment.window?.from || ""}–${order.fulfillment.window?.to || ""}`
                : label(order.fulfillment.window?.type || "anytime")}
            </p>

            {order.fulfillment.type === "delivery" && (
              <>
                <p className="mt-3 text-sm font-bold text-gray-800">
                  {order.recipient.firstName} {order.recipient.lastName}
                </p>
                {order.recipient.company && (
                  <p className="mt-1 text-sm text-gray-500">{order.recipient.company}</p>
                )}
                {order.recipient.phone && (
                  <p className="mt-1 text-sm text-gray-500">{order.recipient.phone}</p>
                )}
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  {[
                    order.fulfillment.deliveryAddress?.address1,
                    order.fulfillment.deliveryAddress?.address2,
                    order.fulfillment.deliveryAddress?.city,
                    order.fulfillment.deliveryAddress?.state,
                    order.fulfillment.deliveryAddress?.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </>
            )}

            {order.fulfillment.type === "pickup" && (
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {order.fulfillment.pickupLocation?.businessName}
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-purple-700" />
              <h2 className="font-black text-gray-950">Payment</h2>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-bold">{money(order.totals.subtotalCents)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Fulfillment</span>
                <span className="font-bold">{money(order.totals.fulfillmentFeeCents)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Tax</span>
                <span className="font-bold">{money(order.totals.taxAmountCents)}</span>
              </div>
              {order.totals.tipCents > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Tip</span>
                  <span className="font-bold">{money(order.totals.tipCents)}</span>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t border-gray-100 pt-3 text-base">
                <span className="font-black text-gray-950">Total</span>
                <span className="font-black text-gray-950">
                  {money(order.totals.totalCents)}
                </span>
              </div>
              {order.totalRefundedCents > 0 && (
                <div className="flex justify-between gap-4 text-red-700">
                  <span className="font-bold">Refunded</span>
                  <span className="font-black">
                    {money(order.totalRefundedCents)}
                  </span>
                </div>
              )}
            </div>

            {Array.isArray(order.refunds) && order.refunds.length > 0 && (
              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="text-xs font-black uppercase tracking-wider text-gray-400">
                  Refund history
                </p>
                <div className="mt-3 space-y-3">
                  {[...order.refunds].reverse().map((refund: any) => (
                    <div
                      key={refund.refundId}
                      className="rounded-xl bg-gray-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-gray-950">
                            {money(refund.amountCents)}
                          </p>
                          <p className="mt-0.5 text-xs capitalize text-gray-500">
                            {label(refund.status)}
                            {refund.createdAt
                              ? ` · ${new Date(
                                  refund.createdAt,
                                ).toLocaleDateString("en-US")}`
                              : ""}
                          </p>
                        </div>
                        <span className="text-xs font-black uppercase tracking-wide text-red-600">
                          Refund
                        </span>
                      </div>

                      {Array.isArray(refund.allocations) &&
                        refund.allocations.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {refund.allocations.map(
                              (allocation: any, index: number) => (
                                <div
                                  key={`${refund.refundId}-${index}`}
                                  className="flex justify-between gap-3 text-xs text-gray-600"
                                >
                                  <span>
                                    {allocation.label}
                                    {allocation.quantity
                                      ? ` · Qty ${allocation.quantity}`
                                      : ""}
                                  </span>
                                  <span className="font-bold">
                                    {money(
                                      allocation.totalAmountCents,
                                    )}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        )}

                      {refund.reason && (
                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          {refund.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-gray-400">
              {order.payment.provider} · {label(order.payment.status)}
            </p>
          </section>

          {order.payment.status === "paid" && (
            <TfposOrderExportCard orderId={String(order._id)} />
          )}
        </aside>
      </div>

      <BloomWebsiteOrderHistory events={order.historyEvents || []} />
    </div>
  );
}
