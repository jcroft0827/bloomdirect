"use client";

import { Ban, Loader2, RotateCcw, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

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

  useEffect(() => {
    if (!cancelConfirmOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && busy === null) {
        setCancelConfirmOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelConfirmOpen, busy]);

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

  function openCancelConfirmation() {
    if (refundContext.pendingRefundCents > 0) {
      toast.error(
        "Wait for the pending refund to finish before canceling this order.",
      );
      return;
    }

    setCancelConfirmOpen(true);
  }

  async function cancelOrder() {
    const needsRefund = canRefund;

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

      setCancelConfirmOpen(false);
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
          onClick={openCancelConfirmation}
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

      {cancelConfirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-order-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && busy === null) {
              setCancelConfirmOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                  <TriangleAlert size={21} />
                </div>

                <div>
                  <h2
                    id="cancel-order-title"
                    className="text-xl font-black text-gray-950"
                  >
                    {canRefund ? "Refund & cancel order?" : "Cancel order?"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {canRefund
                      ? `Bloom will refund the remaining ${money(remainingRefundCents)} and then cancel this order. This action cannot be undone.`
                      : "This order will be canceled. This action cannot be undone."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close confirmation"
                disabled={busy !== null}
                onClick={() => setCancelConfirmOpen(false)}
                className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
              >
                <X size={19} />
              </button>
            </div>

            <div className="flex flex-col-reverse gap-3 p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => setCancelConfirmOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Keep Order
              </button>

              <button
                type="button"
                disabled={busy !== null}
                onClick={cancelOrder}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:opacity-50"
              >
                {busy === "cancel" && (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                )}
                {canRefund ? "Refund & Cancel" : "Cancel Order"}
              </button>
            </div>
          </div>
        </div>
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
