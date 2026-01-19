"use client";

import { useState } from "react";
import { DECLINE_REASONS, DeclineReason } from "@/lib/decline-reasons";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    reason: DeclineReason;
    message?: string;
  }) => void;
};

export default function DeclineOrderModal({
  open,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState<DeclineReason | "">("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  function handleSubmit() {
    if (!reason) {
      setError("Please select a reason.");
      return;
    }

    if (reason === "OTHER" && message.trim().length === 0) {
      setError("Please provide a message for this reason.");
      return;
    }

    onConfirm({
      reason,
      message: message.trim() || undefined,
    });

    // reset
    setReason("");
    setMessage("");
    setError("");
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5">
        <h2 className="text-2xl font-bold">Decline Order</h2>

        <p className="text-gray-600 text-sm">
          Please select a reason for declining this order. This will be shared
          with the originating shop.
        </p>

        <div className="space-y-3">
          <label className="block text-sm font-semibold">
            Reason
          </label>
          <select
            value={reason}
            onChange={(e) => {
              setReason(e.target.value as DeclineReason);
              setError("");
            }}
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="">Select a reason</option>
            {DECLINE_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {reason === "OTHER" && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 resize-none"
              rows={4}
              placeholder="Provide additional context..."
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 font-semibold">{error}</p>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border py-3 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold py-3"
          >
            Decline Order
          </button>
        </div>
      </div>
    </div>
  );
}
