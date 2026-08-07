"use client";

import { formatCurrencyFromCents } from "@/lib/format-currency";
import type { OrderRefund } from "@/types/order";
import { useEffect, useState } from "react";

type VoidRefundModalProps = {
  isOpen: boolean;
  refund: OrderRefund | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

export default function VoidRefundModal({
  isOpen,
  refund,
  isSubmitting,
  onClose,
  onConfirm,
}: VoidRefundModalProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen, refund?._id]);

  if (!isOpen || !refund) {
    return null;
  }

  const normalizedReason = reason.trim();
  const canSubmit = normalizedReason.length > 0 && !isSubmitting;

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    setReason("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    await onConfirm(normalizedReason);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="void-refund-title"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div>
          <h2
            id="void-refund-title"
            className="text-2xl font-black text-gray-900"
          >
            Void Refund
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            This will remove the refund from the order&apos;s active financial
            totals while preserving it in the refund history.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-red-700">
            Refund amount
          </p>

          <p className="mt-1 text-2xl font-black text-red-700">
            -{formatCurrencyFromCents(refund.amountCents)}
          </p>
        </div>

        <div className="mt-5">
          <label
            htmlFor="void-refund-reason"
            className="block text-sm font-black text-gray-800"
          >
            Reason for voiding
          </label>

          <textarea
            id="void-refund-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={isSubmitting}
            maxLength={500}
            rows={4}
            placeholder="Explain why this refund is being voided."
            className="mt-2 w-full resize-none rounded-2xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100"
          />

          <div className="mt-1 flex items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              A reason is required for the audit history.
            </p>

            <p className="shrink-0 text-xs font-semibold text-gray-400">
              {reason.length}/500
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl border border-gray-300 px-5 py-2.5 font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-xl bg-red-600 px-5 py-2.5 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
          >
            {isSubmitting ? "Voiding Refund..." : "Void Refund"}
          </button>
        </div>
      </div>
    </div>
  );
}