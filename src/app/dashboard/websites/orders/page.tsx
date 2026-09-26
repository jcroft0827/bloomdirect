import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  PackageCheck,
  ShoppingBag,
} from "lucide-react";

import BloomWebsiteOrderFilters from "@/components/websites/orders/BloomWebsiteOrderFilters";
import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function statusLabel(value: string, fulfillmentType?: string) {
  if (value === "fulfilled") {
    return fulfillmentType === "pickup" ? "Picked Up" : "Delivered";
  }
  if (value === "confirmed") return "Placed";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClasses(value: string) {
  if (value === "fulfilled") return "bg-emerald-100 text-emerald-700";
  if (value === "canceled") return "bg-red-100 text-red-700";
  if (value === "out_for_delivery" || value === "ready_for_pickup") {
    return "bg-blue-100 text-blue-700";
  }
  if (value === "in_preparation" || value === "preparation_complete") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-purple-100 text-purple-700";
}

function formatDateOnly(value: string) {
  if (!value) return "Date not set";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatPlacedAt(value: Date | string, timezone?: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };

  try {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      timeZone: timezone || "America/New_York",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }
}

function dollarsToCents(value: string) {
  if (!value.trim()) return null;

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;

  return Math.round(amount * 100);
}

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    fulfillment?: string;
    product?: string;
    minTotal?: string;
    maxTotal?: string;
    orderFrom?: string;
    orderTo?: string;
    deliveryFrom?: string;
    deliveryTo?: string;
    from?: string;
    to?: string;
    sort?: string;
  }>;
};

export default async function BloomWebsiteOrdersPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const fulfillment =
    params.fulfillment === "delivery" || params.fulfillment === "pickup"
      ? params.fulfillment
      : "";
  const product = typeof params.product === "string" ? params.product : "";
  const minTotal =
    typeof params.minTotal === "string" ? params.minTotal.trim() : "";
  const maxTotal =
    typeof params.maxTotal === "string" ? params.maxTotal.trim() : "";
  const orderFrom =
    typeof params.orderFrom === "string" ? params.orderFrom : "";
  const orderTo =
    typeof params.orderTo === "string" ? params.orderTo : "";
  const deliveryFrom =
    typeof params.deliveryFrom === "string"
      ? params.deliveryFrom
      : typeof params.from === "string"
        ? params.from
        : "";
  const deliveryTo =
    typeof params.deliveryTo === "string"
      ? params.deliveryTo
      : typeof params.to === "string"
        ? params.to
        : "";
  const sort = typeof params.sort === "string" ? params.sort : "newest";

  await connectToDB();

  const query: Record<string, any> = { shop: session.user.id };

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    query.$or = [
      { orderNumber: regex },
      { "customer.firstName": regex },
      { "customer.lastName": regex },
      { "customer.email": regex },
      { "customer.phone": regex },
      { "recipient.firstName": regex },
      { "recipient.lastName": regex },
      { "recipient.phone": regex },
      { "fulfillment.deliveryAddress.address1": regex },
      { "fulfillment.deliveryAddress.city": regex },
      { "fulfillment.deliveryAddress.postalCode": regex },
    ];
  }

  if (status) {
    query.status = status === "placed" ? { $in: ["placed", "confirmed"] } : status;
  }

  if (fulfillment) {
    query["fulfillment.type"] = fulfillment;
  }

  if (product) {
    query["items.productId"] = product;
  }

  const minTotalCents = dollarsToCents(minTotal);
  const maxTotalCents = dollarsToCents(maxTotal);

  if (minTotalCents !== null || maxTotalCents !== null) {
    const totalRange: Record<string, number> = {};

    if (minTotalCents !== null && maxTotalCents !== null) {
      totalRange.$gte = Math.min(minTotalCents, maxTotalCents);
      totalRange.$lte = Math.max(minTotalCents, maxTotalCents);
    } else if (minTotalCents !== null) {
      totalRange.$gte = minTotalCents;
    } else if (maxTotalCents !== null) {
      totalRange.$lte = maxTotalCents;
    }

    query["totals.totalCents"] = totalRange;
  }

  if (deliveryFrom || deliveryTo) {
    query["fulfillment.requestedDate"] = {};
    if (deliveryFrom) {
      query["fulfillment.requestedDate"].$gte = deliveryFrom;
    }
    if (deliveryTo) {
      query["fulfillment.requestedDate"].$lte = deliveryTo;
    }
  }

  if (orderFrom || orderTo) {
    const localOrderDate = {
      $dateToString: {
        format: "%Y-%m-%d",
        date: "$placedAt",
        timezone: "$fulfillment.timezone",
      },
    };

    const orderDateExpressions: Record<string, any>[] = [];

    if (orderFrom) {
      orderDateExpressions.push({
        $gte: [localOrderDate, orderFrom],
      });
    }

    if (orderTo) {
      orderDateExpressions.push({
        $lte: [localOrderDate, orderTo],
      });
    }

    query.$expr =
      orderDateExpressions.length === 1
        ? orderDateExpressions[0]
        : { $and: orderDateExpressions };
  }

  const sortSpec: Record<string, 1 | -1> =
    sort === "oldest"
      ? { placedAt: 1 }
      : sort === "delivery_soonest"
        ? { "fulfillment.requestedDate": 1, placedAt: 1 }
        : sort === "delivery_latest"
          ? { "fulfillment.requestedDate": -1, placedAt: -1 }
          : sort === "total_high"
            ? { "totals.totalCents": -1, placedAt: -1 }
            : sort === "total_low"
              ? { "totals.totalCents": 1, placedAt: -1 }
              : { placedAt: -1 };

  const [orders, products] = await Promise.all([
    BloomWebsiteOrder.find(query)
      .sort(sortSpec)
      .limit(250)
      .select(
        "orderNumber customer recipient fulfillment totals status payment placedAt itemCount",
      )
      .lean<any[]>(),
    BloomWebsiteProduct.find({
      shop: session.user.id,
    })
      .sort({ name: 1 })
      .select("_id name isActive")
      .lean<any[]>(),
  ]);

  const openOrders = orders.filter(
    (order) => !["fulfilled", "canceled"].includes(order.status),
  ).length;
  const paidTotalCents = orders.reduce(
    (sum, order) => sum + Number(order.totals?.totalCents || 0),
    0,
  );
  const hasFilters = Boolean(
    q ||
      status ||
      fulfillment ||
      product ||
      minTotal ||
      maxTotal ||
      orderFrom ||
      orderTo ||
      deliveryFrom ||
      deliveryTo ||
      sort !== "newest",
  );
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.16em] text-purple-700">
          BloomWebsites
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950">
          Website Orders
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Search, organize, and fulfill paid ecommerce orders placed directly
          through your BloomWebsite.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <ShoppingBag size={20} className="text-purple-700" />
          <p className="mt-3 text-2xl font-black text-gray-950">{orders.length}</p>
          <p className="text-sm text-gray-500">
            {hasFilters ? "Matching orders" : "Website orders"}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <PackageCheck size={20} className="text-purple-700" />
          <p className="mt-3 text-2xl font-black text-gray-950">{openOrders}</p>
          <p className="text-sm text-gray-500">Need fulfillment</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <CalendarDays size={20} className="text-purple-700" />
          <p className="mt-3 text-2xl font-black text-gray-950">
            {money(paidTotalCents)}
          </p>
          <p className="text-sm text-gray-500">
            {hasFilters ? "Matching order value" : "Order value"}
          </p>
        </div>
      </div>

      <BloomWebsiteOrderFilters
        initial={{
          q,
          status,
          fulfillment,
          product,
          minTotal,
          maxTotal,
          orderFrom,
          orderTo,
          deliveryFrom,
          deliveryTo,
          sort,
        }}
        products={products.map((item) => ({
          id: String(item._id),
          name: item.name,
          isActive: item.isActive !== false,
        }))}
      />

      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        {orders.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ShoppingBag className="mx-auto text-gray-300" size={34} />
            <h2 className="mt-4 text-xl font-black text-gray-950">
              {hasFilters ? "No matching orders" : "No website orders yet"}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {hasFilters
                ? "Try clearing or changing your search and filters."
                : "Your first paid BloomWebsite order will appear here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.map((order) => (
              <Link
                key={String(order._id)}
                href={`/dashboard/websites/orders/${order._id}`}
                className="grid gap-4 px-5 py-5 transition hover:bg-purple-50/40 sm:grid-cols-[1.2fr_0.9fr_0.85fr_auto] sm:items-center sm:px-7"
              >
                <div className="min-w-0">
                  <p className="font-black text-gray-950">{order.orderNumber}</p>
                  <p className="mt-1 truncate text-sm text-gray-600">
                    {order.customer.firstName} {order.customer.lastName}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-400">
                    Ordered {formatPlacedAt(order.placedAt, order.fulfillment?.timezone)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold capitalize text-gray-800">
                    {order.fulfillment.type}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDateOnly(order.fulfillment.requestedDate)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-black text-gray-950">
                    {money(order.totals.totalCents)}
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-black ${statusClasses(order.status)}`}
                  >
                    {statusLabel(order.status, order.fulfillment.type)}
                  </span>
                </div>

                <ArrowRight size={18} className="text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
