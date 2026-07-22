"use client";

import Link from "next/link";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function PaymentMethodRequiredModal({
  open,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-method-required-title"
    >
      <div className="w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-xl">
        <div className="space-y-2">
          <h2
            id="payment-method-required-title"
            className="text-2xl font-bold text-gray-900"
          >
            Payment Method Required
          </h2>

          <p className="text-sm leading-6 text-gray-600">
            You must set up at least one payment method before accepting an
            order.
          </p>

          <p className="text-sm leading-6 text-gray-600">
            Your payment information lets the sending florist know how to pay
            your shop after you accept the order.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <Link
            href="/dashboard/settings"
            className="flex-1 rounded-xl bg-purple-600 py-3 text-center font-bold text-white hover:bg-purple-700"
          >
            Go to Settings
          </Link>
        </div>
      </div>
    </div>
  );
}