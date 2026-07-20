"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

import { formatCurrencyFromCents } from "@/lib/format-currency";

type ReportPreset = "month" | "year" | "all" | "custom";

interface ReportSummary {
  ordersSent: number;
  ordersReceived: number;
  sentOrderValueCents: number;
  fulfillmentValueCents: number;
  averageSentOrderValueCents: number;
  averageFulfillmentOrderCents: number;
}

interface FulfillmentTypes {
  network: number;
  outsideNetwork: number;
}

interface SalesTaxSummary {
  taxableProductSubtotalCents: number;
  nonTaxableProductSubtotalCents: number;
  taxableDeliveryFeesCents: number;
  nonTaxableDeliveryFeesCents: number;
  taxCollectedCents: number;
  grossOrderTotalCents: number;
}

interface ReportResponse {
  filters: {
    startDate: string | null;
    endDate: string | null;
  };

  summary: ReportSummary;

  fulfillmentTypes: FulfillmentTypes;

  salesTax: SalesTaxSummary;
}

function formatLocalDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getPresetDates(preset: ReportPreset) {
  const now = new Date();

  if (preset === "month") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    );

    return {
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end),
    };
  }

  if (preset === "year") {
    const start = new Date(
      now.getFullYear(),
      0,
      1,
    );

    const end = new Date(
      now.getFullYear(),
      11,
      31,
    );

    return {
      startDate: formatLocalDate(start),
      endDate: formatLocalDate(end),
    };
  }

  return {
    startDate: "",
    endDate: "",
  };
}

function getPresetLabel(preset: ReportPreset) {
  if (preset === "month") return "This Month";
  if (preset === "year") return "This Year";
  if (preset === "all") return "All Time";

  return "Custom Range";
}

export default function ReportsClient() {
  const initialDates = getPresetDates("month");

  const [preset, setPreset] =
    useState<ReportPreset>("month");

  const [startDate, setStartDate] = useState(
    initialDates.startDate,
  );

  const [endDate, setEndDate] = useState(
    initialDates.endDate,
  );

  const [appliedStartDate, setAppliedStartDate] =
    useState(initialDates.startDate);

  const [appliedEndDate, setAppliedEndDate] =
    useState(initialDates.endDate);

  const [report, setReport] =
    useState<ReportResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const loadReport = async (
    signal?: AbortSignal,
  ) => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (appliedStartDate) {
        params.set("startDate", appliedStartDate);
      }

      if (appliedEndDate) {
        params.set("endDate", appliedEndDate);
      }

      const queryString = params.toString();

      const res = await fetch(
        `/api/reports/summary${
          queryString ? `?${queryString}` : ""
        }`,
        {
          signal,
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Unable to load reporting data.",
        );
      }

      setReport(data);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }

      console.error(
        "Failed to load reporting data:",
        error,
      );

      toast.error(
        error?.message ||
          "Unable to load Bloom Pro reporting.",
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    loadReport(controller.signal);

    return () => controller.abort();
  }, [appliedStartDate, appliedEndDate]);

  const applyPreset = (nextPreset: ReportPreset) => {
    setPreset(nextPreset);

    if (nextPreset === "custom") {
      return;
    }

    const dates = getPresetDates(nextPreset);

    setStartDate(dates.startDate);
    setEndDate(dates.endDate);

    setAppliedStartDate(dates.startDate);
    setAppliedEndDate(dates.endDate);
  };

  const applyCustomRange = () => {
    if (!startDate || !endDate) {
      toast.error(
        "Choose both a start date and end date.",
      );
      return;
    }

    const start = new Date(
      `${startDate}T00:00:00`,
    );

    const end = new Date(
      `${endDate}T23:59:59`,
    );

    if (start > end) {
      toast.error(
        "The start date must be before the end date.",
      );
      return;
    }

    setPreset("custom");
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  const summary = report?.summary;
  const fulfillmentTypes = report?.fulfillmentTypes;
  const salesTax = report?.salesTax;

  const totalSentOrders =
    (fulfillmentTypes?.network ?? 0) +
    (fulfillmentTypes?.outsideNetwork ?? 0);

  const networkPercentage =
    totalSentOrders > 0
      ? Math.round(
          ((fulfillmentTypes?.network ?? 0) /
            totalSentOrders) *
            100,
        )
      : 0;

  const outsideNetworkPercentage =
    totalSentOrders > 0
      ? Math.round(
          ((fulfillmentTypes?.outsideNetwork ?? 0) /
            totalSentOrders) *
            100,
        )
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-emerald-50">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-purple-600">
              Bloom Pro
            </p>

            <h1 className="mt-1 text-4xl font-black text-slate-900">
              Reporting
            </h1>

            <p className="mt-2 max-w-2xl text-slate-600">
              Review order activity, fulfillment value,
              outside-network usage, and sales-tax totals.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Date Controls */}
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl md:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              {[
                {
                  value: "month" as const,
                  label: "This Month",
                },
                {
                  value: "year" as const,
                  label: "This Year",
                },
                {
                  value: "all" as const,
                  label: "All Time",
                },
                {
                  value: "custom" as const,
                  label: "Custom Range",
                },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    applyPreset(option.value)
                  }
                  className={[
                    "rounded-xl px-4 py-2 text-sm font-bold transition-colors",
                    preset === option.value
                      ? "bg-purple-600 text-white shadow-md"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-purple-50 hover:text-purple-700",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {preset === "custom" && (
              <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-slate-700">
                    Start Date
                  </span>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) =>
                      setStartDate(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-slate-700">
                    End Date
                  </span>

                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) =>
                      setEndDate(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </label>

                <button
                  type="button"
                  onClick={applyCustomRange}
                  className="rounded-xl bg-purple-600 px-6 py-2.5 font-bold text-white transition hover:bg-purple-700"
                >
                  Apply Dates
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Current Report Range */}
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-black text-slate-900">
            {getPresetLabel(preset)}
          </h2>

          {appliedStartDate && appliedEndDate && (
            <p className="text-sm font-medium text-slate-500">
              {new Date(
                `${appliedStartDate}T00:00:00`,
              ).toLocaleDateString()}{" "}
              –{" "}
              {new Date(
                `${appliedEndDate}T00:00:00`,
              ).toLocaleDateString()}
            </p>
          )}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-xl">
            <p className="text-lg font-semibold text-slate-500">
              Loading your reports...
            </p>
          </div>
        ) : !report ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
            <p className="font-bold text-red-700">
              Reporting data could not be loaded.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Order Overview */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-black text-slate-900">
                  Order Overview
                </h2>

                <p className="text-sm text-slate-500">
                  Sent and received activity for the selected
                  period.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Orders Sent"
                  value={String(
                    summary?.ordersSent ?? 0,
                  )}
                  description="Network and outside-network orders created."
                />

                <MetricCard
                  label="Orders Received"
                  value={String(
                    summary?.ordersReceived ?? 0,
                  )}
                  description="Network orders received for fulfillment."
                />

                <MetricCard
                  label="Sent Order Value"
                  value={formatCurrencyFromCents(
                    summary?.sentOrderValueCents ?? 0,
                  )}
                  description="Total customer-facing value tracked."
                />

                <MetricCard
                  label="Fulfillment Value"
                  value={formatCurrencyFromCents(
                    summary?.fulfillmentValueCents ??
                      0,
                  )}
                  description="Expected payout from received orders."
                />
              </div>
            </section>

            {/* Average Order Values */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-black text-slate-900">
                  Average Order Values
                </h2>

                <p className="text-sm text-slate-500">
                  Average value per applicable order.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <MetricCard
                  label="Average Sent Order"
                  value={formatCurrencyFromCents(
                    summary
                      ?.averageSentOrderValueCents ??
                      0,
                  )}
                  description="Average customer-facing value per sent order."
                />

                <MetricCard
                  label="Average Fulfillment Order"
                  value={formatCurrencyFromCents(
                    summary
                      ?.averageFulfillmentOrderCents ??
                      0,
                  )}
                  description="Average expected payout per received order."
                />
              </div>
            </section>

            {/* Network Breakdown */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900">
                  Sent Order Breakdown
                </h2>

                <p className="text-sm text-slate-500">
                  Compare orders sent through the
                  GetBloomDirect network with outside-network
                  orders.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <BreakdownCard
                  label="In-Network Orders"
                  count={
                    fulfillmentTypes?.network ?? 0
                  }
                  percentage={networkPercentage}
                  badgeClass="bg-emerald-100 text-emerald-700"
                />

                <BreakdownCard
                  label="Outside-Network Orders"
                  count={
                    fulfillmentTypes?.outsideNetwork ??
                    0
                  }
                  percentage={outsideNetworkPercentage}
                  badgeClass="bg-amber-100 text-amber-700"
                />
              </div>
            </section>

            {/* Sales Tax Report */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900">
                  Sales Tax Summary
                </h2>

                <p className="text-sm text-slate-500">
                  Calculated from orders originated by your
                  shop. Verify figures with your accounting
                  records before filing.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <TaxMetric
                  label="Taxable Product Subtotal"
                  value={
                    salesTax
                      ?.taxableProductSubtotalCents ??
                    0
                  }
                />

                <TaxMetric
                  label="Non-Taxable Product Subtotal"
                  value={
                    salesTax
                      ?.nonTaxableProductSubtotalCents ??
                    0
                  }
                />

                <TaxMetric
                  label="Taxable Delivery Fees"
                  value={
                    salesTax
                      ?.taxableDeliveryFeesCents ?? 0
                  }
                />

                <TaxMetric
                  label="Non-Taxable Delivery Fees"
                  value={
                    salesTax
                      ?.nonTaxableDeliveryFeesCents ??
                    0
                  }
                />

                <TaxMetric
                  label="Tax Collected"
                  value={
                    salesTax?.taxCollectedCents ?? 0
                  }
                  emphasized
                />

                <TaxMetric
                  label="Gross Order Total"
                  value={
                    salesTax?.grossOrderTotalCents ??
                    0
                  }
                  emphasized
                />
              </div>
            </section>

            {/* Order List Link */}
            <div className="flex justify-center">
              <Link
                href={
                  appliedStartDate && appliedEndDate
                    ? `/dashboard/incoming?role=originating&startDate=${appliedStartDate}&endDate=${appliedEndDate}`
                    : "/dashboard/incoming?role=originating"
                }
                className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-white px-5 py-3 font-bold text-purple-700 shadow-sm transition hover:bg-purple-50"
              >
                View Orders for This Report
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
      <p className="text-sm font-bold uppercase tracking-wider text-purple-600">
        {label}
      </p>

      <p className="mt-4 break-words text-4xl font-black text-slate-900">
        {value}
      </p>

      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        {description}
      </p>
    </div>
  );
}

function BreakdownCard({
  label,
  count,
  percentage,
  badgeClass,
}: {
  label: string;
  count: number;
  percentage: number;
  badgeClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-slate-800">
            {label}
          </p>

          <p className="mt-2 text-4xl font-black text-slate-900">
            {count}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-sm font-bold ${badgeClass}`}
        >
          {percentage}%
        </span>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-purple-600 transition-all"
          style={{
            width: `${Math.min(
              Math.max(percentage, 0),
              100,
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

function TaxMetric({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: number;
  emphasized?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-5",
        emphasized
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50",
      ].join(" ")}
    >
      <p
        className={[
          "text-sm font-bold",
          emphasized
            ? "text-emerald-700"
            : "text-slate-600",
        ].join(" ")}
      >
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-900">
        {formatCurrencyFromCents(value)}
      </p>
    </div>
  );
}