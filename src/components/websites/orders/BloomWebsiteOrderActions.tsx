"use client";

import { Ban, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import BloomWebsiteRefundBuilder, {
  type BloomWebsiteRefundContext,
} from "@/components/websites/orders/BloomWebsiteRefundBuilder";

type Status =
  | "placed"
  | "confirmed"
  | "in_preparation"
  | "preparation_complete"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "fulfilled"
  | "canceled";

type WorkflowMode = "simple" | "detailed";

type Action = {
  status: Status;
  label: string;
  tone?: "primary" | "secondary";
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function makeRequestKey() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `cancel_refund_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}`;
}

export default function BloomWebsiteOrderActions({
  orderId,
  status,
  fulfillmentType,
  workflowMode,
  paymentStatus,
  refundContext,
}: {
  orderId: string;
  status: Status;
  fulfillmentType: "delivery" | "pickup";
  workflowMode: WorkflowMode;
  paymentStatus: string;
  refundContext: BloomWebsiteRefundContext;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);

  const completionLabel =
    fulfillmentType === "delivery"
      ? "Mark Delivered"
      : "Mark Picked Up";

  const actions = useMemo(() => {
    if (["fulfilled", "canceled"].includes(status)) {
      return [] as Action[];
    }

    if (workflowMode === "simple") {
      return [
        {
          status: "fulfilled",
          label: completionLabel,
        },
      ] as Action[];
    }

    const result: Action[] = [];

    if (status === "placed" || status === "confirmed") {
      result.push({
        status: "in_preparation",
        label: "Start Preparation",
      });

      result.push(
        fulfillmentType === "delivery"
          ? {
              status: "out_for_delivery",
              label: "Out for Delivery",
              tone: "secondary",
            }
          : {
              status: "ready_for_pickup",
              label: "Ready for Pickup",
              tone: "secondary",
            },
      );
    }

    if (status === "in_preparation") {
      if (fulfillmentType === "delivery") {
        result.push({
          status: "preparation_complete",
          label: "Preparation Complete",
        });
        result.push({
          status: "out_for_delivery",
          label: "Out for Delivery",
          tone: "secondary",
        });
      } else {
        result.push({
          status: "ready_for_pickup",
          label: "Ready for Pickup",
        });
      }
    }

    if (status === "preparation_complete") {
      result.push(
        fulfillmentType === "delivery"
          ? {
              status: "out_for_delivery",
              label: "Out for Delivery",
            }
          : {
              status: "ready_for_pickup",
              label: "Ready for Pickup",
            },
      );
    }

    if (status !== "fulfilled") {
      result.push({
        status: "fulfilled",
        label: completionLabel,
        tone: result.length ? "secondary" : "primary",
      });
    }

    return result;
  }, [status, fulfillmentType, workflowMode, completionLabel]);

  const remainingRefundCents =
    refundContext.remainingRefundableCents;

  const canRefund =
    remainingRefundCents > 0 &&
    (paymentStatus === "paid" ||
      paymentStatus === "partially_refunded");

  const canCancel = !["fulfilled", "canceled"].includes(status);

  async function patchStatus(nextStatus: Status) {
    const response = await fetch(
      `/api/websites/orders/${orderId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || "Unable to update order.");
    }

    return data;
  }

  async function updateStatus(nextStatus: Status) {
    setBusy(nextStatus);

    try {
      await patchStatus(nextStatus);

      toast.success(
        nextStatus === "fulfilled"
          ? fulfillmentType === "delivery"
            ? "Order marked delivered."
            : "Order marked picked up."
          : "Order updated.",
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update order.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function cancelOrder() {
    if (refundContext.pendingRefundCents > 0) {
      toast.error(
        "Wait for the pending refund to finish before canceling this order.",
      );
      return;
    }

    const needsRefund = canRefund;

    const confirmed = window.confirm(
      needsRefund
        ? `Cancel this order and refund the remaining ${money(
            remainingRefundCents,
          )}?`
        : "Cancel this order?",
    );

    if (!confirmed) return;

    setBusy("cancel");

    try {
      if (needsRefund) {
        const refundResponse = await fetch(
          `/api/websites/orders/${orderId}/refund`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amountCents: remainingRefundCents,
              reason: "Order canceled by florist.",
              idempotencyKey: makeRequestKey(),
            }),
          },
        );

        const refundData = await refundResponse.json().catch(() => null);

        if (!refundResponse.ok) {
          throw new Error(
            refundData?.error ||
              "The refund could not be completed, so the order was not canceled.",
          );
        }
      }

      await patchStatus("canceled");

      toast.success(
        needsRefund
          ? "Order refunded and canceled."
          : "Order canceled.",
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to cancel order.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <button
          key={action.status}
          type="button"
          disabled={busy !== null}
          onClick={() => updateStatus(action.status)}
          className={
            action.tone === "secondary"
              ? "inline-flex min-h-11 items-center justify-center rounded-xl border border-purple-200 bg-white px-5 py-3 text-sm font-black text-purple-700 disabled:opacity-50"
              : "inline-flex min-h-11 items-center justify-center rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
          }
        >
          {busy === action.status && (
            <Loader2 size={16} className="mr-2 animate-spin" />
          )}
          {action.label}
        </button>
      ))}

      {canRefund && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => setRefundOpen(true)}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-black text-red-700 disabled:opacity-50"
        >
          <RotateCcw size={16} className="mr-2" />
          Refund
        </button>
      )}

      {canCancel && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={cancelOrder}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-black text-gray-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        >
          {busy === "cancel" ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            <Ban size={16} className="mr-2" />
          )}
          {canRefund ? "Refund & Cancel" : "Cancel Order"}
        </button>
      )}

      {refundOpen && (
        <BloomWebsiteRefundBuilder
          orderId={orderId}
          context={refundContext}
          onClose={() => setRefundOpen(false)}
          onCompleted={() => router.refresh()}
        />
      )}
    </div>
  );
}
