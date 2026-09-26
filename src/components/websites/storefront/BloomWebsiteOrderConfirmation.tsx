import Link from "next/link";
import {
  CheckCircle2,
  MapPin,
  PackageCheck,
  Store,
} from "lucide-react";
import { notFound } from "next/navigation";

import { connectToDB } from "@/lib/mongoose";
import BloomWebsiteCheckoutAttempt from "@/models/BloomWebsiteCheckoutAttempt";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function BloomWebsiteOrderConfirmation({
  previewSlug,
  attemptId,
  storefrontBasePath,
}: {
  previewSlug: string;
  attemptId: string;
  storefrontBasePath: string;
}) {
  await connectToDB();

  const attempt = await BloomWebsiteCheckoutAttempt.findOne({
    attemptId,
    previewSlug: previewSlug.toLowerCase(),
    status: "order_committed",
  })
    .select("order")
    .lean<any>();

  if (!attempt?.order) {
    notFound();
  }

  const order = await BloomWebsiteOrder.findById(attempt.order).lean<any>();

  if (!order) {
    notFound();
  }

  return (
    <main className="min-h-[70vh] bg-gray-50 px-5 py-10 sm:px-8 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <section className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
          <div
            className="px-6 py-9 text-white sm:px-9"
            style={{ backgroundColor: "var(--bloom-primary)" }}
          >
            <CheckCircle2 size={38} />
            <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] opacity-80">
              Payment confirmed
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Your order is in!
            </h1>
            <p className="mt-3 opacity-85">Order {order.orderNumber}</p>
          </div>

          <div className="space-y-7 p-6 sm:p-9">
            <p className="text-sm leading-6 text-gray-600">
              A confirmation has been sent to{" "}
              <span className="font-bold text-gray-950">
                {order.customer.email}
              </span>
              . The florist has also been notified.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 font-black text-gray-950">
                  {order.fulfillment.type === "pickup" ? (
                    <Store size={18} />
                  ) : (
                    <MapPin size={18} />
                  )}
                  {order.fulfillment.type === "pickup"
                    ? "Pickup"
                    : "Delivery"}
                </div>
                <p className="mt-3 text-sm font-bold text-gray-700">
                  {order.fulfillment.requestedDate}
                </p>
                {order.fulfillment.type === "delivery" ? (
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {[
                      order.fulfillment.deliveryAddress?.address1,
                      order.fulfillment.deliveryAddress?.city,
                      order.fulfillment.deliveryAddress?.state,
                      order.fulfillment.deliveryAddress?.postalCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {order.fulfillment.pickupLocation?.businessName}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 font-black text-gray-950">
                  <PackageCheck size={18} />
                  Order total
                </div>
                <p className="mt-3 text-2xl font-black text-gray-950">
                  {money(order.totals.totalCents)}
                </p>
                <p className="mt-1 text-sm text-gray-500">Paid securely</p>
              </div>
            </div>

            <div className="rounded-2xl bg-gray-50 p-5">
              <p className="font-black text-gray-950">Order summary</p>
              <div className="mt-4 divide-y divide-gray-200">
                {order.items.map((item: any, index: number) => (
                  <div
                    key={`${item.productId}-${item.tier}-${index}`}
                    className="flex items-start justify-between gap-5 py-3"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{item.name}</p>
                      <p className="mt-1 text-xs capitalize text-gray-500">
                        {item.tierLabel} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900">
                      {money(item.lineTotalCents)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href={storefrontBasePath || "/"}
              className="inline-flex min-h-12 items-center justify-center rounded-xl px-6 py-3 text-sm font-black text-white"
              style={{ backgroundColor: "var(--bloom-primary)" }}
            >
              Return to {order.storefront.siteName}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
