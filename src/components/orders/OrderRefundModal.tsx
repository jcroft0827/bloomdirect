"use client";

import { useMemo, useState } from "react";
import { formatCurrencyFromCents } from "@/lib/format-currency";
import type { RefundCategory } from "@/types/order";

type OrderRefundModalProps = {
  isOpen: boolean;
  orderId: string;
  orderTotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  remainingRefundableCents: number;
  deliveryFeeAlreadyRefunded: boolean;
  taxAlreadyRefunded: boolean;
  onClose: () => void;
  onRefundCreated: () => void | Promise<void>;
};

type RefundPreset = Exclude<RefundCategory, "custom">;

function centsToInputValue(amountCents: number) {
  return (amountCents / 100).toFixed(2);
}

function parseAmountToCents(value: string) {
  const normalizedValue = value.replace(/[$,\s]/g, "");

  if (!normalizedValue) {
    return null;
  }

  const amount = Number(normalizedValue);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return Math.round(amount * 100);
}

function getTodayDateValue() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export default function OrderRefundModal({
  isOpen,
  orderId,
  orderTotalCents,
  deliveryFeeCents,
  taxCents,
  remainingRefundableCents,
  deliveryFeeAlreadyRefunded,
  taxAlreadyRefunded,
  onClose,
  onRefundCreated,
}: OrderRefundModalProps) {
  const [amount, setAmount] = useState("");
  const [refundDate, setRefundDate] = useState(getTodayDateValue());
  const [category, setCategory] = useState<RefundCategory>("custom");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const amountCents = useMemo(() => parseAmountToCents(amount), [amount]);

  if (!isOpen) {
    return null;
  }

  function applyPreset(preset: RefundPreset, requestedAmountCents: number) {
    const safeAmountCents = Math.min(
      Math.max(0, requestedAmountCents),
      remainingRefundableCents,
    );

    setCategory(preset);
    setAmount(centsToInputValue(safeAmountCents));
    setError("");
  }

  function resetAndClose() {
    if (isSubmitting) {
      return;
    }

    setAmount("");
    setRefundDate(getTodayDateValue());
    setCategory("custom");
    setReason("");
    setNotes("");
    setError("");
    onClose();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (amountCents === null || amountCents <= 0) {
      setError("Enter a valid refund amount.");
      return;
    }

    if (amountCents > remainingRefundableCents) {
      setError("Refund amount cannot exceed the remaining refundable amount.");
      return;
    }

    if (!refundDate) {
      setError("Select the date the refund occurred.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/orders/${orderId}/refunds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountCents,
          refundDate,
          category,
          reason,
          notes,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Unable to record the refund.");
      }

      await onRefundCreated();

      setAmount("");
      setRefundDate(getTodayDateValue());
      setCategory("custom");
      setReason("");
      setNotes("");
      setError("");

      onClose();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to record the refund.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-gray-100 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="refund-modal-title"
                  className="text-2xl font-black text-gray-900"
                >
                  Record Refund
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Record a refund that was issued outside GetBloomDirect.
                </p>
              </div>

              <button
                type="button"
                onClick={resetAndClose}
                disabled={isSubmitting}
                className="rounded-lg px-3 py-1 text-2xl leading-none text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close refund modal"
              >
                ×
              </button>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Order Total
                </p>

                <p className="mt-1 text-lg font-black text-gray-900">
                  {formatCurrencyFromCents(orderTotalCents)}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Remaining Refundable
                </p>

                <p className="mt-1 text-lg font-black text-emerald-800">
                  {formatCurrencyFromCents(remainingRefundableCents)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-black text-gray-900">Quick refund</p>

              <p className="mt-1 text-sm text-gray-500">
                Select a common refund amount or enter a custom amount below.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => applyPreset("delivery_fee", deliveryFeeCents)}
                  disabled={
                    deliveryFeeAlreadyRefunded ||
                    deliveryFeeCents <= 0 ||
                    remainingRefundableCents <= 0
                  }
                  className="rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:border-purple-300 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="block text-sm font-black text-gray-900">
                    Delivery Fee
                  </span>

                  <span className="mt-1 block text-sm text-gray-500">
                    {deliveryFeeAlreadyRefunded
                      ? "Already refunded"
                      : formatCurrencyFromCents(deliveryFeeCents)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset("tax", taxCents)}
                  disabled={
                    taxAlreadyRefunded ||
                    taxCents <= 0 ||
                    remainingRefundableCents <= 0
                  }
                  className="rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:border-purple-300 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="block text-sm font-black text-gray-900">
                    Tax
                  </span>

                  <span className="mt-1 block text-sm text-gray-500">
                    {taxAlreadyRefunded
                      ? "Already refunded"
                      : formatCurrencyFromCents(taxCents)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset("full", remainingRefundableCents)}
                  disabled={remainingRefundableCents <= 0}
                  className="rounded-xl border border-gray-200 px-4 py-3 text-left transition hover:border-purple-300 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="block text-sm font-black text-gray-900">
                    Full Refund
                  </span>

                  <span className="mt-1 block text-sm text-gray-500">
                    {formatCurrencyFromCents(remainingRefundableCents)}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="refund-amount"
                className="text-sm font-black text-gray-900"
              >
                Refund amount
              </label>

              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center font-bold text-gray-500">
                  $
                </span>

                <input
                  id="refund-amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setCategory("custom");
                    setError("");
                  }}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-gray-300 py-3 pl-8 pr-4 font-semibold text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="refund-date"
                className="text-sm font-black text-gray-900"
              >
                Refund date
              </label>

              <input
                id="refund-date"
                type="date"
                value={refundDate}
                max={getTodayDateValue()}
                onChange={(event) => {
                  setRefundDate(event.target.value);
                  setError("");
                }}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 font-semibold text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <p className="mt-2 text-xs text-gray-500">
                Use the date the refund actually occurred.
              </p>
            </div>

            <div>
              <label
                htmlFor="refund-reason"
                className="text-sm font-black text-gray-900"
              >
                Reason
                <span className="ml-1 font-medium text-gray-400">Optional</span>
              </label>

              <input
                id="refund-reason"
                type="text"
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
                placeholder="For example: late delivery"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div>
              <label
                htmlFor="refund-notes"
                className="text-sm font-black text-gray-900"
              >
                Notes
                <span className="ml-1 font-medium text-gray-400">Optional</span>
              </label>

              <textarea
                id="refund-notes"
                value={notes}
                maxLength={2000}
                rows={4}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add any internal details about this refund."
                className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 p-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetAndClose}
              disabled={isSubmitting}
              className="rounded-xl border border-gray-300 px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || remainingRefundableCents <= 0}
              className="rounded-xl bg-purple-600 px-5 py-3 font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
            >
              {isSubmitting ? "Recording Refund..." : "Record Refund"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
