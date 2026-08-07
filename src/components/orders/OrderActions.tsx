// components/orders/OrderActions.tsx

"use client";

import { useState } from "react";
import { OrderStatus } from "@/lib/order-status";
import DeclineOrderModal from "./DeclineOrderModal";
import type { DeclineReason } from "@/lib/decline-reasons";

type Props = {
  role: "originating" | "fulfilling";
  status: OrderStatus;
  onAccept?: () => void;
  onDecline?: (data: { reason: DeclineReason; message?: string }) => void;
  onDelivered?: () => void;
};

export default function OrderActions({
  role,
  status,
  onAccept,
  onDecline,
  onDelivered,
}: Props) {
  const [showDecline, setShowDecline] = useState(false);

  return (
    <>
      <section className="bg-white rounded-2xl shadow-md p-6 space-y-4">
        {/* FULFILLING SHOP */}
        {role === "fulfilling" && status === OrderStatus.PENDING_ACCEPTANCE && (
          <div className="space-y-4">
            <button
              onClick={onAccept}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl"
            >
              Accept Order
            </button>

            <button
              onClick={() => setShowDecline(true)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl"
            >
              Decline Order
            </button>
          </div>
        )}

        {role === "fulfilling" &&
          [
            OrderStatus.ACCEPTED,
            OrderStatus.ACCEPTED_AWAITING_PAYMENT,
            OrderStatus.PAID_AWAITING_FULFILLMENT,
          ].includes(status) && (
            <button
              onClick={onDelivered}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl"
            >
              Mark as Delivered
            </button>
          )}

        {status === OrderStatus.COMPLETED && (
          <p className="text-center font-semibold text-green-700">
            Order completed 🎉
          </p>
        )}
      </section>

      <DeclineOrderModal
        open={showDecline}
        onClose={() => setShowDecline(false)}
        onConfirm={(data) => {
          setShowDecline(false);
          onDecline?.(data);
        }}
      />
    </>
  );
}