"use client";

import {
  Ban,
  Mail,
  MessageSquareText,
  RotateCcw,
  TriangleAlert,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import BloomSpinner from "@/components/BloomSpinner";

import BloomWebsiteRefundBuilder, {
  type BloomWebsiteRefundContext,
} from "@/components/websites/orders/BloomWebsiteRefundBuilder";
import {
  getBloomWebsiteOrderStatusLabel,
  type BloomWebsiteOrderStatus as Status,
  type BloomWebsiteStatusNotificationPolicy,
} from "@/lib/bloom-websites/orders/fulfillment-status";

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

function defaultNotifyForStatus(
  status: Status,
  fulfillmentType: "delivery" | "pickup",
  policy: BloomWebsiteStatusNotificationPolicy,
) {
  if (status === "in_preparation") return policy.designing;
  if (status === "preparation_complete") return policy.ready;
  if (status === "ready_for_pickup") return policy.readyForPickup;
  if (status === "out_for_delivery") return policy.outForDelivery;
  if (status === "delivery_attempted") return policy.deliveryAttempted;
  if (status === "fulfilled") {
    return fulfillmentType === "pickup" ? policy.pickedUp : policy.delivered;
  }
  if (status === "canceled") return policy.canceled;
  return false;
}

export default function BloomWebsiteOrderActions({
  orderId,
  status,
  fulfillmentType,
  workflowMode,
  paymentStatus,
  refundContext,
  defaultNotifications,
  arrangementPhotos,
}: {
  orderId: string;
  status: Status;
  fulfillmentType: "delivery" | "pickup";
  workflowMode: WorkflowMode;
  paymentStatus: string;
  refundContext: BloomWebsiteRefundContext;
  defaultNotifications: BloomWebsiteStatusNotificationPolicy;
  arrangementPhotos: { photoId: string; imageUrl: string; caption?: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [internalNote, setInternalNote] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [notificationPhotoId, setNotificationPhotoId] = useState("");
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelInternalNote, setCancelInternalNote] = useState("");
  const [cancelNotifyCustomer, setCancelNotifyCustomer] = useState(
    defaultNotifications.canceled,
  );

  const completionLabel =
    fulfillmentType === "delivery" ? "Mark Delivered" : "Mark Picked Up";

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
      result.push({ status: "in_preparation", label: "Start Designing" });
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
      result.push(
        fulfillmentType === "delivery"
          ? { status: "preparation_complete", label: "Mark Ready" }
          : { status: "ready_for_pickup", label: "Ready for Pickup" },
      );

      if (fulfillmentType === "delivery") {
        result.push({
          status: "out_for_delivery",
          label: "Out for Delivery",
          tone: "secondary",
        });
      }
    }

    if (status === "preparation_complete") {
      result.push(
        fulfillmentType === "delivery"
          ? { status: "out_for_delivery", label: "Out for Delivery" }
          : { status: "ready_for_pickup", label: "Ready for Pickup" },
      );
    }

    if (status === "out_for_delivery") {
      result.push({
        status: "delivery_attempted",
        label: "Delivery Attempted",
        tone: "secondary",
      });
    }

    if (status === "delivery_attempted") {
      result.push({ status: "out_for_delivery", label: "Retry Delivery" });
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

  const remainingRefundCents = refundContext.remainingRefundableCents;

  const canRefund =
    remainingRefundCents > 0 &&
    (paymentStatus === "paid" || paymentStatus === "partially_refunded");

  const canCancel = !["fulfilled", "canceled"].includes(status);

  useEffect(() => {
    if (!cancelConfirmOpen && !pendingAction) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && busy === null) {
        setCancelConfirmOpen(false);
        setPendingAction(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelConfirmOpen, pendingAction, busy]);

  function openStatusAction(action: Action) {
    setPendingAction(action);
    setInternalNote("");
    setCustomerNote("");
    setNotificationPhotoId("");
    setNotifyCustomer(
      defaultNotifyForStatus(
        action.status,
        fulfillmentType,
        defaultNotifications,
      ),
    );
  }

  async function patchStatus(
    nextStatus: Status,
    options: {
      internalNote?: string;
      customerNote?: string;
      notifyCustomer?: boolean;
      notificationPhotoId?: string;
      cancellationReason?: string;
    } = {},
  ) {
    const response = await fetch(`/api/websites/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, ...options }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || "Unable to update order.");
    }

    return data;
  }

  async function confirmStatusUpdate() {
    if (!pendingAction) return;

    setBusy(pendingAction.status);

    try {
      await patchStatus(pendingAction.status, {
        internalNote,
        customerNote: notifyCustomer ? customerNote : "",
        notifyCustomer,
        notificationPhotoId: notifyCustomer ? notificationPhotoId : "",
      });

      toast.success(
        pendingAction.status === "fulfilled"
          ? fulfillmentType === "delivery"
            ? "Order marked delivered."
            : "Order marked picked up."
          : `${getBloomWebsiteOrderStatusLabel(
              pendingAction.status,
              fulfillmentType,
            )} saved.`,
      );

      setPendingAction(null);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update order.",
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

    setCancelReason("");
    setCancelInternalNote("");
    setCancelNotifyCustomer(defaultNotifications.canceled);
    setCancelConfirmOpen(true);
  }

  async function cancelOrder() {
    const needsRefund = canRefund;
    const reason = cancelReason.trim() || "Order canceled by florist.";

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
              reason,
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

      await patchStatus("canceled", {
        cancellationReason: reason,
        internalNote: cancelInternalNote,
        customerNote: cancelNotifyCustomer ? reason : "",
        notifyCustomer: cancelNotifyCustomer,
      });

      toast.success(
        needsRefund ? "Order refunded and canceled." : "Order canceled.",
      );

      setCancelConfirmOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to cancel order.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <button
          key={`${status}-${action.status}`}
          type="button"
          disabled={busy !== null}
          onClick={() => openStatusAction(action)}
          className={
            action.tone === "secondary"
              ? "inline-flex min-h-11 items-center justify-center rounded-xl border border-purple-200 bg-white px-5 py-3 text-sm font-black text-purple-700 transition hover:bg-purple-50 disabled:opacity-50"
              : "inline-flex min-h-11 items-center justify-center rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-800 disabled:opacity-50"
          }
        >
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
          <Ban size={16} className="mr-2" />
          {canRefund ? "Refund & Cancel" : "Cancel Order"}
        </button>
      )}

      {pendingAction && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-update-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && busy === null) {
              setPendingAction(null);
            }
          }}
        >
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-700">
                  Update Order Status
                </p>
                <h2 id="status-update-title" className="mt-1 text-2xl font-black text-gray-950">
                  {getBloomWebsiteOrderStatusLabel(
                    pendingAction.status,
                    fulfillmentType,
                  )}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Add an internal note for your team, and optionally include a message in the customer email.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close status update"
                disabled={busy !== null}
                onClick={() => setPendingAction(null)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-black text-gray-900">
                  <MessageSquareText size={16} className="text-purple-700" />
                  Internal note
                  <span className="font-semibold text-gray-400">Optional</span>
                </span>
                <textarea
                  value={internalNote}
                  onChange={(event) => setInternalNote(event.target.value)}
                  rows={3}
                  maxLength={5000}
                  placeholder="Example: Left with front desk; designer is Sarah."
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
                <span className="mt-1 block text-xs text-gray-400">
                  Only your shop sees this note.
                </span>
              </label>

              <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
                <label className="flex cursor-pointer items-start justify-between gap-4">
                  <span>
                    <span className="flex items-center gap-2 font-black text-purple-950">
                      <Mail size={16} />
                      Email the customer
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-purple-800">
                      This defaults to the preference saved in Website Order Settings, but you can override it for this update.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notifyCustomer}
                    onChange={(event) => setNotifyCustomer(event.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                  />
                </label>

                {notifyCustomer && arrangementPhotos.length > 0 && ["ready_for_pickup", "preparation_complete", "out_for_delivery", "fulfilled"].includes(pendingAction.status) && (
                  <label className="mt-4 block border-t border-purple-100 pt-4">
                    <span className="text-sm font-black text-purple-950">Arrangement photo in this email</span>
                    <select value={notificationPhotoId} onChange={(event) => setNotificationPhotoId(event.target.value)} className="mt-2 w-full rounded-xl border border-purple-200 bg-white px-3 py-3 text-sm">
                      <option value="">Don't include a photo</option>
                      {arrangementPhotos.map((photo, index) => (
                        <option key={photo.photoId} value={photo.photoId}>Include arrangement photo {index + 1}{photo.caption ? ` — ${photo.caption.slice(0, 48)}` : ""}</option>
                      ))}
                    </select>
                    {notificationPhotoId && <img src={arrangementPhotos.find((photo) => photo.photoId === notificationPhotoId)?.imageUrl} alt="Selected arrangement" className="mt-3 h-28 w-auto rounded-lg object-cover" />}
                    <span className="mt-2 block text-xs text-purple-700">The image appears in the same status email. To send a photo separately, use the arrangement photo section.</span>
                  </label>
                )}

                {notifyCustomer && (
                  <label className="mt-4 block border-t border-purple-100 pt-4">
                    <span className="text-sm font-black text-purple-950">
                      Message to customer <span className="font-semibold text-purple-500">Optional</span>
                    </span>
                    <textarea
                      value={customerNote}
                      onChange={(event) => setCustomerNote(event.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="Example: We attempted delivery, but no one was available. Please call the shop to arrange another attempt."
                      className="mt-2 w-full rounded-2xl border border-purple-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => setPendingAction(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-black text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={confirmStatusUpdate}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800 disabled:opacity-50"
              >
                {busy === pendingAction.status && (
                  <BloomSpinner size={16} />
                )}
                Save Status
              </button>
            </div>
          </div>
        </div>
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
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700">
                  <TriangleAlert size={21} />
                </div>
                <div>
                  <h2 id="cancel-order-title" className="text-xl font-black text-gray-950">
                    {canRefund ? "Refund & cancel order?" : "Cancel order?"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {canRefund
                      ? `Bloom will refund the remaining ${money(remainingRefundCents)} and then cancel this order.`
                      : "This order will be canceled."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close confirmation"
                disabled={busy !== null}
                onClick={() => setCancelConfirmOpen(false)}
                className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <label className="block">
                <span className="text-sm font-black text-gray-900">Cancellation reason</span>
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Explain why the order was canceled."
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-black text-gray-900">
                  Internal note <span className="font-semibold text-gray-400">Optional</span>
                </span>
                <textarea
                  value={cancelInternalNote}
                  onChange={(event) => setCancelInternalNote(event.target.value)}
                  rows={2}
                  maxLength={5000}
                  className="mt-2 w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </label>

              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-red-100 bg-red-50/70 p-4">
                <span>
                  <span className="block font-black text-red-950">Email the customer</span>
                  <span className="mt-1 block text-xs leading-5 text-red-800">
                    The cancellation reason will be included in the message.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={cancelNotifyCustomer}
                  onChange={(event) => setCancelNotifyCustomer(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 rounded border-red-300 text-red-600 focus:ring-red-500"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 p-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => setCancelConfirmOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-black text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={cancelOrder}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white hover:bg-red-800 disabled:opacity-50"
              >
                {busy === "cancel" && <BloomSpinner size={16} />}
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
