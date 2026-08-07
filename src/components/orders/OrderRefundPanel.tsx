"use client";

import { formatCurrencyFromCents } from "@/lib/format-currency";
import type { OrderRefund, OrderRefundStatus } from "@/types/order";

type OrderRefundPanelProps = {
  orderTotalCents: number;
  totalRefundedCents?: number;
  refundStatus?: OrderRefundStatus;
  refunds?: OrderRefund[];
  canRecordRefund: boolean;
  onAddRefund: () => void;
  onVoidRefund: (refund: OrderRefund) => void;
};

function formatRefundDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getCategoryLabel(category: OrderRefund["category"]) {
  switch (category) {
    case "delivery_fee":
      return "Delivery fee";

    case "tax":
      return "Tax";

    case "full":
      return "Full refund";

    case "custom":
    default:
      return "Custom refund";
  }
}

function getRefundStatusLabel(status: OrderRefundStatus) {
  switch (status) {
    case "partial":
      return "Partially Refunded";

    case "full":
      return "Fully Refunded";

    case "none":
    default:
      return "Not Refunded";
  }
}

export default function OrderRefundPanel({
  orderTotalCents,
  totalRefundedCents = 0,
  refundStatus = "none",
  refunds = [],
  canRecordRefund,
  onAddRefund,
  onVoidRefund,
}: OrderRefundPanelProps) {
  const hasRefundHistory = refunds.length > 0;

  const remainingRefundableCents = Math.max(
    0,
    orderTotalCents - totalRefundedCents,
  );

  const netOrderTotalCents = Math.max(0, orderTotalCents - totalRefundedCents);

  return (
    <section className="space-y-5 rounded-3xl bg-white p-6 shadow-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Refunds</h2>

          <p className="mt-1 text-sm text-gray-500">
            Record and review financial adjustments for this order.
          </p>
        </div>

        {refundStatus !== "none" && (
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
              refundStatus === "full"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {getRefundStatusLabel(refundStatus)}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Order Total
          </p>

          <p className="mt-1 text-lg font-black text-gray-900">
            {formatCurrencyFromCents(orderTotalCents)}
          </p>
        </div>

        <div className="rounded-2xl bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
            Refund Total
          </p>

          <p className="mt-1 text-lg font-black text-amber-800">
            -{formatCurrencyFromCents(totalRefundedCents)}
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            Net Order Value
          </p>

          <p className="mt-1 text-lg font-black text-emerald-800">
            {formatCurrencyFromCents(netOrderTotalCents)}
          </p>
        </div>
      </div>

      {hasRefundHistory ? (
        <div className="space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-500">
            Refund History
          </h3>

          <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200">
            {refunds.map((refund) => {
              const isVoided = refund.status === "voided";

              return (
                <div
                  key={refund._id}
                  className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between ${
                    isVoided ? "bg-gray-50 opacity-75" : "bg-white"
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`font-black ${
                          isVoided
                            ? "text-gray-500 line-through"
                            : "text-gray-900"
                        }`}
                      >
                        {getCategoryLabel(refund.category)}
                      </p>

                      {refund.source === "manual" && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          Manual
                        </span>
                      )}

                      {isVoided && (
                        <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-black text-gray-700">
                          VOIDED
                        </span>
                      )}
                    </div>

                    <p
                      className={`mt-1 text-lg font-black ${
                        isVoided ? "text-gray-500 line-through" : "text-red-700"
                      }`}
                    >
                      -{formatCurrencyFromCents(refund.amountCents)}
                    </p>

                    {refund.reason && (
                      <p
                        className={`mt-2 text-sm font-semibold ${
                          isVoided ? "text-gray-500" : "text-gray-700"
                        }`}
                      >
                        {refund.reason}
                      </p>
                    )}

                    {refund.notes && (
                      <p className="mt-1 text-sm text-gray-500">
                        {refund.notes}
                      </p>
                    )}

                    {isVoided && (
                      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                        <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                          Void reason
                        </p>

                        <p className="mt-1 text-sm font-semibold text-gray-700">
                          {refund.voidReason || "No reason recorded."}
                        </p>

                        {refund.voidedAt && (
                          <p className="mt-1 text-xs font-semibold text-gray-500">
                            Voided {formatRefundDate(refund.voidedAt)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                    <p className="text-sm font-semibold text-gray-500">
                      {formatRefundDate(refund.refundDate)}
                    </p>

                    {canRecordRefund && !isVoided && (
                      <button
                        type="button"
                        onClick={() => onVoidRefund(refund)}
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
                      >
                        Void Refund
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-center">
          <p className="font-bold text-gray-700">
            No refunds have been recorded.
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Refund history will appear here when an adjustment is recorded.
          </p>
        </div>
      )}

      {canRecordRefund && remainingRefundableCents > 0 && (
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Remaining refundable amount:{" "}
            <span className="font-black text-gray-900">
              {formatCurrencyFromCents(remainingRefundableCents)}
            </span>
          </p>

          <button
            type="button"
            onClick={onAddRefund}
            className="rounded-xl bg-purple-600 px-5 py-2.5 font-bold text-white transition hover:bg-purple-700"
          >
            Add Refund
          </button>
        </div>
      )}

      {refundStatus === "full" && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          This order has been fully refunded.
        </div>
      )}
    </section>
  );
}
