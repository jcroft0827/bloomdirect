import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  ChevronDown,
  Download,
  Package,
  ReceiptText,
  RefreshCcw,
  ShoppingBag,
  Truck,
} from "lucide-react";

import BloomWebsiteReportPrintButton from "@/components/websites/reports/BloomWebsiteReportPrintButton";
import authOptions from "@/lib/auth";
import {
  getBloomWebsiteReport,
  normalizeBloomWebsiteReportRange,
} from "@/lib/bloom-websites/reports/getBloomWebsiteReport";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";

type PageProps = {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
  }>;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function number(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function localDateKey(value: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(value);

    const year = parts.find((part) => part.type === "year")?.value || "";
    const month = parts.find((part) => part.type === "month")?.value || "";
    const day = parts.find((part) => part.type === "day")?.value || "";

    return `${year}-${month}-${day}`;
  } catch {
    return value.toISOString().slice(0, 10);
  }
}

function prettyDate(value: string) {
  if (!value) return "All time";
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function generatedLabel(value: Date, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(value);
  } catch {
    return value.toLocaleString("en-US");
  }
}

function statusLabel(value: string) {
  if (value === "fulfilled") return "Fulfilled";
  if (value === "confirmed" || value === "placed") return "Placed";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function exportHref(
  report: "orders" | "sales" | "refunds" | "tax" | "products",
  startDate: string,
  endDate: string,
) {
  const params = new URLSearchParams({ report });
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  return `/api/websites/reports/export?${params.toString()}`;
}

function rangeHref(startDate: string, endDate: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const query = params.toString();
  return query
    ? `/dashboard/websites/reports?${query}`
    : "/dashboard/websites/reports?startDate=&endDate=";
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="report-keep rounded-2xl border border-gray-200 bg-white p-5 shadow-sm print:rounded-none print:border-gray-300 print:p-3 print:shadow-none">
      <p className="text-xs font-black uppercase tracking-[0.11em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black tracking-tight text-gray-950 print:text-xl">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-xs leading-5 text-gray-500 print:text-[9pt]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export default async function BloomWebsiteReportsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  await connectToDB();

  const [shop, website] = await Promise.all([
    Shop.findById(session.user.id)
      .select("businessName isSuspended address.timezone")
      .lean<any>(),
    BloomWebsite.findOne({ shop: session.user.id })
      .select("_id siteName")
      .lean<any>(),
  ]);

  if (!shop) redirect("/login");
  if (shop.isSuspended) redirect("/dashboard");
  if (!website) redirect("/dashboard/websites");

  const timezone = shop?.address?.timezone || "America/New_York";
  const params = await searchParams;
  const today = localDateKey(new Date(), timezone);
  const defaultStart = `${today.slice(0, 7)}-01`;
  const hasExplicitRange =
    params.startDate !== undefined || params.endDate !== undefined;

  let range;
  try {
    range = normalizeBloomWebsiteReportRange({
      startDate: hasExplicitRange ? params.startDate || "" : defaultStart,
      endDate: hasExplicitRange ? params.endDate || "" : today,
      timezone,
    });
  } catch {
    redirect(
      `/dashboard/websites/reports?startDate=${defaultStart}&endDate=${today}`,
    );
  }

  const report = await getBloomWebsiteReport({
    shopId: session.user.id,
    range,
  });

  const generatedAt = new Date();
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const rangeLabel =
    range.startDate && range.endDate
      ? `${prettyDate(range.startDate)} – ${prettyDate(range.endDate)}`
      : range.startDate
        ? `${prettyDate(range.startDate)} – present`
        : range.endDate
          ? `Through ${prettyDate(range.endDate)}`
          : "All time";

  const ordersNewestFirst = [...report.orders].reverse();
  const productRows = report.products.filter((row) => row.kind === "product");
  const addonRows = report.products.filter((row) => row.kind === "addon");
  const taxComponentCoverageComplete =
    report.summary.orderCount === 0 ||
    report.summary.taxLineCoverageOrderCount === report.summary.orderCount;

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: letter;
            margin: 0.45in;
          }

          html,
          body {
            background: #ffffff !important;
            overflow: visible !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .bloom-business-report {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #111827 !important;
          }

          .bloom-business-report .report-keep {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .bloom-business-report .report-page-break {
            break-before: page;
            page-break-before: always;
          }

          .bloom-business-report table {
            width: 100%;
            border-collapse: collapse;
          }

          .bloom-business-report thead {
            display: table-header-group;
          }

          .bloom-business-report tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .bloom-business-report a {
            color: inherit !important;
            text-decoration: none !important;
          }
        }
      `}</style>

      <div className="bloom-business-report mx-auto max-w-7xl space-y-7 print:space-y-5">
        <div className="print:hidden">
          <Link
            href="/dashboard/websites"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-purple-700"
          >
            <ArrowLeft size={16} />
            BloomWebsites
          </Link>
        </div>

        <section className="report-keep overflow-visible rounded-3xl border border-gray-200 bg-white shadow-sm print:rounded-none print:border-0 print:border-b print:border-gray-400 print:shadow-none">
          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between print:flex-row print:items-end print:justify-between print:p-0 print:pb-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-purple-700 print:text-[9pt] print:text-gray-700">
                BloomWebsites Business Report
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 print:text-2xl">
                {shop.businessName}
              </h1>
              {website.siteName && website.siteName !== shop.businessName ? (
                <p className="mt-1 text-sm font-semibold text-gray-500">
                  {website.siteName}
                </p>
              ) : null}
              <p className="mt-4 text-lg font-black text-gray-800 print:mt-2 print:text-base">
                {rangeLabel}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Generated {generatedLabel(generatedAt, timezone)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <BloomWebsiteReportPrintButton />

              <details className="relative">
                <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-800 transition hover:border-purple-300 hover:text-purple-800 [&::-webkit-details-marker]:hidden">
                  <Download size={17} />
                  Export data
                  <ChevronDown size={15} />
                </summary>
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                  {[
                    ["Orders CSV", "orders"],
                    ["Sales CSV", "sales"],
                    ["Refunds CSV", "refunds"],
                    ["Tax CSV", "tax"],
                    ["Products CSV", "products"],
                  ].map(([label, kind]) => (
                    <a
                      key={kind}
                      href={exportHref(
                        kind as "orders" | "sales" | "refunds" | "tax" | "products",
                        range.startDate,
                        range.endDate,
                      )}
                      className="block rounded-xl px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-purple-50 hover:text-purple-800"
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm print:hidden">
          <div className="flex flex-wrap gap-2">
            <Link
              href={rangeHref(defaultStart, today)}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-purple-300 hover:text-purple-800"
            >
              This month
            </Link>
            <Link
              href={rangeHref(yearStart, today)}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-purple-300 hover:text-purple-800"
            >
              This year
            </Link>
            <Link
              href={rangeHref("", "")}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-purple-300 hover:text-purple-800"
            >
              All time
            </Link>
          </div>

          <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="text-sm font-bold text-gray-700">
              Start date
              <input
                type="date"
                name="startDate"
                defaultValue={range.startDate}
                className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </label>
            <label className="text-sm font-bold text-gray-700">
              End date
              <input
                type="date"
                name="endDate"
                defaultValue={range.endDate}
                className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-gray-800"
            >
              <RefreshCcw size={16} />
              Apply
            </button>
          </form>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-gray-950 print:text-lg">
                Executive summary
              </h2>
              <p className="mt-1 text-sm text-gray-500 print:text-[9pt]">
                At-a-glance website commerce activity for the selected period.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4 print:gap-2">
            <Metric
              label="Gross collected"
              value={money(report.summary.totalChargedCents)}
              detail="Payments charged on orders placed in this period"
            />
            <Metric
              label="Refunds issued"
              value={money(report.summary.successfulRefundsCents)}
              detail="Successful refunds processed during this period"
            />
            <Metric
              label="Net payment activity"
              value={money(report.summary.netPaymentActivityCents)}
              detail="Gross collected less refunds issued in this period"
            />
            <Metric
              label="Paid orders"
              value={number(report.summary.orderCount)}
              detail={`Average order ${money(report.summary.averageOrderCents)}`}
            />
          </div>
        </section>

        <section className="report-keep rounded-3xl border border-gray-200 bg-white p-6 shadow-sm print:rounded-none print:border-gray-300 print:p-4 print:shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-gray-950 print:text-base">
                Accounting & reconciliation
              </h2>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-gray-500 print:text-[9pt] print:leading-4">
                A payment-activity view designed to reconcile BloomWebsites charges and refunds without rewriting the original paid order snapshots. Refunds are recognized on the date they were processed.
              </p>
            </div>
            <ReceiptText size={22} className="text-purple-700 print:text-gray-700" />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2 print:mt-3 print:grid-cols-2 print:gap-3">
            <div className="rounded-2xl border border-gray-200 p-5 print:rounded-none print:p-3">
              <h3 className="font-black text-gray-950 print:text-[10pt]">Accounting summary</h3>
              <dl className="mt-3 divide-y divide-gray-100 text-sm print:text-[9pt]">
                {[
                  ["Gross sales", money(report.summary.grossSalesCents)],
                  ["Tips / gratuities", money(report.summary.tipsCents)],
                  ["Gross receipts before tax", money(report.summary.grossReceiptsBeforeTaxCents)],
                  ["Sales tax collected", money(report.summary.taxCollectedCents)],
                  ["Total charged", money(report.summary.totalChargedCents)],
                  ["Refunds excluding tax", money(report.summary.successfulRefundsExcludingTaxCents)],
                  ["Tax refunded", money(report.summary.taxRefundedCents)],
                  ["Net receipts before tax", money(report.summary.netReceiptsBeforeTaxCents)],
                  ["Net tax", money(report.summary.netTaxCents)],
                  ["Net payment activity", money(report.summary.netPaymentActivityCents)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-2.5 print:py-1">
                    <dt className="font-semibold text-gray-600">{label}</dt>
                    <dd className="font-black text-gray-950">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs leading-5 text-gray-500 print:text-[8pt] print:leading-4">
                Gross sales are merchandise plus delivery charges and exclude tips and tax. Net payment activity equals total charged for orders placed in this period minus successful refunds processed in this period.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 p-5 print:rounded-none print:p-3">
              <h3 className="font-black text-gray-950 print:text-[10pt]">Refund classification</h3>
              <dl className="mt-3 divide-y divide-gray-100 text-sm print:text-[9pt]">
                {[
                  ["Merchandise refunded", money(report.summary.refundedMerchandiseCents)],
                  ["Delivery refunded", money(report.summary.refundedDeliveryCents)],
                  ["Tips refunded", money(report.summary.refundedTipsCents)],
                  ["Tax refunded", money(report.summary.taxRefundedCents)],
                  ["Custom / goodwill refunds", money(report.summary.customRefundsCents)],
                  ["Unclassified legacy refunds", money(report.summary.unclassifiedRefundsCents)],
                  ["Successful refunds", money(report.summary.successfulRefundsCents)],
                  ["Pending refunds", money(report.summary.pendingRefundsCents)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-2.5 print:py-1">
                    <dt className="font-semibold text-gray-600">{label}</dt>
                    <dd className="font-black text-gray-950">{value}</dd>
                  </div>
                ))}
              </dl>
              {(report.summary.customRefundsCents > 0 || report.summary.unclassifiedRefundsCents > 0) ? (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 print:rounded-none print:border print:border-gray-300 print:bg-white print:text-[8pt] print:leading-4 print:text-gray-700">
                  Custom/goodwill or unclassified refunds cannot be assigned to a specific original sale component. Review those refund records before posting category-level adjustments.
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-gray-600 print:mt-3 print:rounded-none print:border print:border-gray-300 print:bg-white print:p-3 print:text-[8.5pt] print:leading-4">
            <p className="font-black text-gray-900">Payment processor reconciliation</p>
            <p className="mt-1">
              BloomWebsites reports customer charges and Bloom-recorded refunds. Stripe processing fees, disputes/chargebacks, reserves, and payout timing are not deducted here. Reconcile bank deposits against Stripe payout/balance reports rather than expecting this report to equal a bank deposit.
            </p>
            {report.summary.disputedOrderCount > 0 ? (
              <p className="mt-2 font-bold text-gray-900">
                This period includes {number(report.summary.disputedOrderCount)} disputed {report.summary.disputedOrderCount === 1 ? "order" : "orders"}. Review those transactions in Stripe because dispute deductions are not represented as Bloom refunds unless a refund record also exists.
              </p>
            ) : null}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2 print:grid-cols-2 print:gap-3">
          <div className="report-keep rounded-3xl border border-gray-200 bg-white p-6 shadow-sm print:rounded-none print:border-gray-300 print:p-4 print:shadow-none">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-gray-950 print:text-base">
                  Sales summary
                </h2>
                <p className="mt-1 text-sm text-gray-500 print:text-[9pt]">
                  Revenue components from paid orders placed in this period.
                </p>
              </div>
              <Banknote size={22} className="text-purple-700 print:text-gray-700" />
            </div>

            <dl className="mt-5 divide-y divide-gray-100 text-sm print:mt-3 print:text-[9pt]">
              {[
                ["Merchandise", money(report.summary.merchandiseSalesCents)],
                ["Delivery fees", money(report.summary.deliverySalesCents)],
                ["Tips / gratuities", money(report.summary.tipsCents)],
                ["Tax collected", money(report.summary.taxCollectedCents)],
                ["Gross collected", money(report.summary.totalChargedCents)],
                ["Average order", money(report.summary.averageOrderCents)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3 print:py-1.5">
                  <dt className="font-semibold text-gray-600">{label}</dt>
                  <dd className="font-black text-gray-950">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="report-keep rounded-3xl border border-gray-200 bg-white p-6 shadow-sm print:rounded-none print:border-gray-300 print:p-4 print:shadow-none">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-gray-950 print:text-base">
                  Order & fulfillment summary
                </h2>
                <p className="mt-1 text-sm text-gray-500 print:text-[9pt]">
                  How website orders were fulfilled during the period.
                </p>
              </div>
              <Truck size={22} className="text-purple-700 print:text-gray-700" />
            </div>

            <dl className="mt-5 divide-y divide-gray-100 text-sm print:mt-3 print:text-[9pt]">
              <div className="flex items-center justify-between gap-4 py-3 print:py-1.5">
                <dt className="font-semibold text-gray-600">Delivery orders</dt>
                <dd className="font-black text-gray-950">
                  {number(report.summary.deliveryOrders)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3 print:py-1.5">
                <dt className="font-semibold text-gray-600">Pickup orders</dt>
                <dd className="font-black text-gray-950">
                  {number(report.summary.pickupOrders)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3 print:py-1.5">
                <dt className="font-semibold text-gray-600">Orders with refunds</dt>
                <dd className="font-black text-gray-950">
                  {number(report.summary.refundedOrderCount)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3 print:py-1.5">
                <dt className="font-semibold text-gray-600">Pending refunds</dt>
                <dd className="font-black text-gray-950">
                  {money(report.summary.pendingRefundsCents)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="report-keep rounded-3xl border border-gray-200 bg-white p-6 shadow-sm print:rounded-none print:border-gray-300 print:p-4 print:shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-gray-950 print:text-base">
                Tax summary
              </h2>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-gray-500 print:text-[9pt] print:leading-4">
                Based on immutable tax snapshots stored with each paid order. Tax refunds are recognized when the successful refund occurred; filing treatment can vary by jurisdiction.
              </p>
            </div>
            <ReceiptText size={22} className="text-purple-700 print:text-gray-700" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 print:mt-3 print:grid-cols-5 print:gap-2">
            {[
              ["Taxable charges", money(report.summary.taxableSalesCents)],
              ["Non-taxable charges", money(report.summary.nonTaxableSalesCents)],
              ["Tax collected", money(report.summary.taxCollectedCents)],
              ["Tax refunded", money(report.summary.taxRefundedCents)],
              ["Net tax", money(report.summary.netTaxCents)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-gray-50 p-4 print:rounded-none print:border print:border-gray-200 print:bg-white print:p-2.5">
                <p className="text-xs font-black uppercase tracking-wide text-gray-500 print:text-[8pt]">
                  {label}
                </p>
                <p className="mt-2 text-lg font-black text-gray-950 print:mt-1 print:text-[11pt]">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-x-auto print:mt-3 print:overflow-visible">
            <table className="min-w-full text-left text-sm print:text-[9pt]">
              <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 print:text-[8pt]">
                <tr>
                  <th className="px-3 py-3 print:px-1 print:py-1.5">Charge type</th>
                  <th className="px-3 py-3 text-right print:px-1 print:py-1.5">Gross charges</th>
                  <th className="px-3 py-3 text-right print:px-1 print:py-1.5">Taxable</th>
                  <th className="px-3 py-3 text-right print:px-1 print:py-1.5">Non-taxable</th>
                  <th className="px-3 py-3 text-right print:px-1 print:py-1.5">Tax collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  [
                    "Merchandise",
                    report.summary.merchandiseSalesCents,
                    report.summary.merchandiseTaxableCents,
                    report.summary.merchandiseNonTaxableCents,
                    report.summary.merchandiseTaxCents,
                  ],
                  [
                    "Delivery",
                    report.summary.deliverySalesCents,
                    report.summary.deliveryTaxableCents,
                    report.summary.deliveryNonTaxableCents,
                    report.summary.deliveryTaxCents,
                  ],
                  [
                    "Tips / gratuities",
                    report.summary.tipsCents,
                    report.summary.tipsTaxableCents,
                    report.summary.tipsNonTaxableCents,
                    report.summary.tipsTaxCents,
                  ],
                ].map(([label, gross, taxable, nonTaxable, tax]) => (
                  <tr key={String(label)}>
                    <td className="px-3 py-3 font-bold text-gray-900 print:px-1 print:py-1.5">{label}</td>
                    <td className="px-3 py-3 text-right text-gray-700 print:px-1 print:py-1.5">{money(Number(gross))}</td>
                    <td className="px-3 py-3 text-right text-gray-700 print:px-1 print:py-1.5">{money(Number(taxable))}</td>
                    <td className="px-3 py-3 text-right text-gray-700 print:px-1 print:py-1.5">{money(Number(nonTaxable))}</td>
                    <td className="px-3 py-3 text-right font-black text-gray-950 print:px-1 print:py-1.5">{money(Number(tax))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500 print:mt-2 print:text-[8.5pt]">
            <p>
              Tax-exempt orders: <span className="font-black text-gray-800">{number(report.summary.exemptOrderCount)}</span>
            </p>
            <p>
              Component tax detail: <span className="font-black text-gray-800">{number(report.summary.taxLineCoverageOrderCount)} of {number(report.summary.orderCount)} orders</span>
            </p>
          </div>

          {!taxComponentCoverageComplete ? (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 print:rounded-none print:border print:border-gray-300 print:bg-white print:text-[8pt] print:leading-4 print:text-gray-700">
              Some historical orders do not contain charge-level tax lines. The period-level taxable charges and tax totals above remain authoritative; the merchandise/delivery/tip component table only reflects orders with stored component detail.
            </p>
          ) : null}

          {report.taxJurisdictions.length > 0 ? (
            <div className="mt-5 overflow-x-auto print:mt-3 print:overflow-visible">
              <h3 className="mb-2 font-black text-gray-900 print:text-[10pt]">Stored jurisdiction detail</h3>
              <table className="min-w-full text-left text-sm print:text-[9pt]">
                <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 print:text-[8pt]">
                  <tr>
                    <th className="px-3 py-3 print:px-1 print:py-1.5">Jurisdiction</th>
                    <th className="px-3 py-3 print:px-1 print:py-1.5">Code</th>
                    <th className="px-3 py-3 text-right print:px-1 print:py-1.5">Rate</th>
                    <th className="px-3 py-3 text-right print:px-1 print:py-1.5">Taxable charges</th>
                    <th className="px-3 py-3 text-right print:px-1 print:py-1.5">Tax collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.taxJurisdictions.map((row) => (
                    <tr key={row.key}>
                      <td className="px-3 py-3 font-semibold text-gray-800 print:px-1 print:py-1.5">
                        {[row.city, row.county, row.state, row.country]
                          .filter(Boolean)
                          .join(", ") || "Recorded jurisdiction"}
                      </td>
                      <td className="px-3 py-3 text-gray-600 print:px-1 print:py-1.5">
                        {row.jurisdictionCode || "—"}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-600 print:px-1 print:py-1.5">
                        {row.rate === null
                          ? "—"
                          : `${(row.rate > 1 ? row.rate : row.rate * 100)
                              .toFixed(3)
                              .replace(/0+$/, "")
                              .replace(/\.$/, "")}%`}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-700 print:px-1 print:py-1.5">
                        {row.taxableSalesCents === null ? "—" : money(row.taxableSalesCents)}
                      </td>
                      <td className="px-3 py-3 text-right font-black text-gray-950 print:px-1 print:py-1.5">
                        {money(row.taxCollectedCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.taxJurisdictions.some((row) => row.taxableSalesCents === null) ? (
                <p className="mt-2 text-xs leading-5 text-gray-500 print:text-[8pt] print:leading-4">
                  A blank taxable-charge amount means the stored provider snapshot did not allocate the taxable base across multiple jurisdictions. Bloom does not estimate that allocation.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-xs leading-5 text-gray-500 print:mt-2 print:text-[8pt] print:leading-4">
              No jurisdiction-level allocation is stored for these orders. Bloom&apos;s native tax engine preserves authoritative order and charge-level tax amounts but does not invent county/city allocations that were not part of the original tax snapshot.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm print:rounded-none print:border-gray-300 print:p-4 print:shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-gray-950 print:text-base">
                Product performance
              </h2>
              <p className="mt-1 text-sm text-gray-500 print:text-[9pt]">
                Quantity sold and gross merchandise sales from orders placed in this period.
              </p>
            </div>
            <Package size={22} className="text-purple-700 print:text-gray-700" />
          </div>

          {productRows.length === 0 && addonRows.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-gray-50 p-5 text-sm text-gray-500 print:mt-3 print:rounded-none print:border print:border-gray-200 print:bg-white print:p-3 print:text-[9pt]">
              No product sales in this range.
            </p>
          ) : (
            <div className="mt-5 grid gap-6 lg:grid-cols-2 print:mt-3 print:grid-cols-2 print:gap-5">
              <div>
                <h3 className="font-black text-gray-900 print:text-[10pt]">Products</h3>
                <div className="mt-2 divide-y divide-gray-100">
                  {productRows.map((row) => (
                    <div key={row.key} className="report-keep flex items-center justify-between gap-4 py-3 text-sm print:py-1.5 print:text-[9pt]">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900">{row.name}</p>
                        <p className="text-xs text-gray-500 print:text-[8pt]">
                          {row.detail || "Product"} · Qty {number(row.quantity)}
                        </p>
                      </div>
                      <p className="shrink-0 font-black text-gray-950">
                        {money(row.grossSalesCents)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-black text-gray-900 print:text-[10pt]">Add-ons</h3>
                {addonRows.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500 print:text-[9pt]">
                    No add-on sales in this range.
                  </p>
                ) : (
                  <div className="mt-2 divide-y divide-gray-100">
                    {addonRows.map((row) => (
                      <div key={row.key} className="report-keep flex items-center justify-between gap-4 py-3 text-sm print:py-1.5 print:text-[9pt]">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900">{row.name}</p>
                          <p className="text-xs text-gray-500 print:text-[8pt]">
                            Qty {number(row.quantity)}
                          </p>
                        </div>
                        <p className="shrink-0 font-black text-gray-950">
                          {money(row.grossSalesCents)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="report-page-break rounded-3xl border border-gray-200 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:pt-1 print:shadow-none">
          <div>
            <h2 className="text-xl font-black text-gray-950 print:text-base">
              Refund activity
            </h2>
            <p className="mt-1 text-sm text-gray-500 print:text-[9pt]">
              Refunds appear by refund date, even when the original sale occurred in an earlier period.
            </p>
          </div>

          {report.refunds.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-gray-50 p-5 text-sm text-gray-500 print:mt-3 print:rounded-none print:border print:border-gray-200 print:bg-white print:p-3 print:text-[9pt]">
              No refund activity in this range.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto print:mt-3 print:overflow-visible">
              <table className="min-w-full text-left text-sm print:text-[8.5pt]">
                <thead className="border-b border-gray-300 text-xs uppercase tracking-wide text-gray-500 print:text-[7.5pt]">
                  <tr>
                    <th className="px-3 py-3 print:px-1 print:py-1.5">Date</th>
                    <th className="px-3 py-3 print:px-1 print:py-1.5">Order</th>
                    <th className="px-3 py-3 print:px-1 print:py-1.5">Status</th>
                    <th className="px-3 py-3 print:px-1 print:py-1.5">Reason / components</th>
                    <th className="px-3 py-3 text-right print:px-1 print:py-1.5">Tax</th>
                    <th className="px-3 py-3 text-right print:px-1 print:py-1.5">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.refunds.map((row) => (
                    <tr key={`${row.orderId}:${row.refundId}`}>
                      <td className="px-3 py-3 text-gray-600 print:px-1 print:py-1.5">
                        {prettyDate(row.date)}
                      </td>
                      <td className="px-3 py-3 font-bold text-gray-900 print:px-1 print:py-1.5">
                        {row.orderNumber}
                      </td>
                      <td className="px-3 py-3 capitalize text-gray-700 print:px-1 print:py-1.5">
                        {row.status}
                      </td>
                      <td className="max-w-md px-3 py-3 text-gray-600 print:px-1 print:py-1.5">
                        <p>{row.reason || "No reason entered"}</p>
                        <p className="mt-1 text-xs text-gray-400 print:text-[7.5pt]">
                          {row.allocationSummary}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right text-gray-700 print:px-1 print:py-1.5">
                        {money(row.taxAmountCents)}
                      </td>
                      <td className="px-3 py-3 text-right font-black text-gray-950 print:px-1 print:py-1.5">
                        {money(row.amountCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:pt-3 print:shadow-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-gray-950 print:text-base">
                Detailed order ledger
              </h2>
              <p className="mt-1 text-sm text-gray-500 print:text-[9pt]">
                Paid website orders placed within the selected order-date range.
              </p>
            </div>
            <ShoppingBag size={22} className="text-purple-700 print:text-gray-700" />
          </div>

          {ordersNewestFirst.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-gray-50 p-5 text-sm text-gray-500 print:mt-3 print:rounded-none print:border print:border-gray-200 print:bg-white print:p-3 print:text-[9pt]">
              No paid website orders in this range.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto print:mt-3 print:overflow-visible">
              <table className="min-w-full text-left text-sm print:text-[8pt]">
                <thead className="border-b border-gray-300 text-xs uppercase tracking-wide text-gray-500 print:text-[7pt]">
                  <tr>
                    <th className="px-3 py-3 print:px-1 print:py-1.5">Date</th>
                    <th className="px-3 py-3 print:px-1 print:py-1.5">Order</th>
                    <th className="px-3 py-3 print:px-1 print:py-1.5">Customer</th>
                    <th className="px-3 py-3 print:px-1 print:py-1.5">Fulfillment</th>
                    <th className="px-3 py-3 print:px-1 print:py-1.5">Status</th>
                    <th className="px-3 py-3 text-right print:px-1 print:py-1.5">Tax</th>
                    <th className="px-3 py-3 text-right print:px-1 print:py-1.5">Total</th>
                    <th className="px-3 py-3 text-right print:px-1 print:py-1.5">Refunded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ordersNewestFirst.map((row) => (
                    <tr key={row.orderId}>
                      <td className="px-3 py-3 text-gray-600 print:px-1 print:py-1.5">
                        {prettyDate(row.placedDate)}
                      </td>
                      <td className="px-3 py-3 print:px-1 print:py-1.5">
                        <Link
                          href={`/dashboard/websites/orders/${row.orderId}`}
                          className="font-black text-purple-700 hover:text-purple-900 print:text-gray-950"
                        >
                          {row.orderNumber}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-gray-700 print:px-1 print:py-1.5">
                        {row.customerName || row.customerEmail}
                      </td>
                      <td className="px-3 py-3 capitalize text-gray-700 print:px-1 print:py-1.5">
                        {row.fulfillmentType}
                      </td>
                      <td className="px-3 py-3 text-gray-700 print:px-1 print:py-1.5">
                        {statusLabel(row.status)}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-700 print:px-1 print:py-1.5">
                        {money(row.taxCents)}
                      </td>
                      <td className="px-3 py-3 text-right font-black text-gray-950 print:px-1 print:py-1.5">
                        {money(row.totalCents)}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-700 print:px-1 print:py-1.5">
                        {money(row.lifetimeRefundedCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="report-keep rounded-2xl bg-gray-50 p-4 text-xs leading-5 text-gray-500 print:mt-5 print:rounded-none print:border-t print:border-gray-300 print:bg-white print:px-0 print:py-3 print:text-[8pt] print:leading-4">
          <p className="font-bold text-gray-700">
            {shop.businessName} · BloomWebsites Business Report · {rangeLabel}
          </p>
          <p className="mt-1">
            Reporting source: canonical BloomWebsite paid-order and refund snapshots. Net payment activity equals customer charges on orders placed in this period minus successful refunds issued in this period. Because refunds can relate to earlier sales, this is a period payment-activity report rather than a restatement of historical revenue.
          </p>
          <p className="mt-1">
            Processor fees, chargebacks/disputes, reserves, and payout timing are not deducted unless represented by a Bloom refund record. Reconcile bank deposits with Stripe payout/balance reporting. This report supports bookkeeping but does not replace jurisdiction-specific tax filing or professional tax advice.
          </p>
          <p className="mt-2 text-gray-400">
            Generated by BloomWebsites on {generatedLabel(generatedAt, timezone)}.
          </p>
        </footer>
      </div>
    </>
  );
}
