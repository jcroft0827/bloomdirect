"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrderStatus } from "@/lib/order-status";
import OrderFlowHelper from "@/components/OrderFlowHelper";

export default function OrdersDashboard() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<
    "originating" | "fulfilling" | "all"
  >("all");

  const [declineOrderId, setDeclineOrderId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>("");
  const [declineMessage, setDeclineMessage] = useState<string>("");
  const [declineLoading, setDeclineLoading] = useState(false);

  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  const router = useRouter();

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter.length) params.append("status", statusFilter.join(","));
      if (roleFilter !== "all") params.append("role", roleFilter);

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to load orders.");
        return;
      }

      setOrders(data.orders || []);
    } catch (err) {
      console.error("Failed to load orders", err);
      toast.error("Unexpected error loading orders. Reload the page. If the problem persists, contact GetBloomDirect support.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [statusFilter, roleFilter]);

  const handleStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (actionOrderId === orderId) return; // Prevent duplicate actions


    try {
      setActionOrderId(orderId);
  
      const res = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
  
      setActionOrderId(null);
  
      if (res.ok) {
        toast.success(`Order updated: ${newStatus.replaceAll("_", " ")}`);
        fetchOrders();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to update order");
      }
    } catch (error) {
      console.error("Failed to update order", error);
      toast.error("Failed to update order. Please try again. If the problem persists, contact GetBloomDirect support.");
    }

  };

  const handleMarkPaid = async (
    orderId: string,
    method: "venmo" | "cashapp" | "zelle" | "other",
  ) => {
    try {
      const res = await fetch("/api/orders/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentMethod: method }),
      });
      if (res.ok) {
        toast.success(`Order marked as paid via ${method.toUpperCase()}!`);
        fetchOrders();
      }
    } catch (err) {
      console.error("Failed to mark order as paid", err);
      toast.error("Failed to mark order as paid. Please try again. If the problem persists, contact GetBloomDirect support.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-3xl text-gray-600">Loading orders…</p>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    PENDING_ACCEPTANCE: "Pending Acceptance",
    ACCEPTED_AWAITING_PAYMENT: "Accepted — Awaiting Payment",
    PAID_AWAITING_FULFILLMENT: "Paid — In Production",
    FULFILLED_PENDING_CONFIRMATION: "Delivered — Awaiting Confirmation",
    COMPLETED: "Completed",
    DECLINED: "Declined",
  };

  const statusBadgeStyles: Record<string, string> = {
    PENDING_ACCEPTANCE: "bg-yellow-100 text-yellow-800",
    ACCEPTED_AWAITING_PAYMENT: "bg-blue-100 text-blue-800",
    PAID_AWAITING_FULFILLMENT: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
    DECLINED: "bg-red-100 text-red-700",
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex flex-wrap gap-4 items-center justify-between">
            <Link href="/dashboard">
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 px-10 rounded-3xl text-2xl shadow-xl">
                ← Back to Dashboard
              </button>
            </Link>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="rounded-xl p-2 border"
              >
                <option value="all">All Orders</option>
                <option value="originating">Sent Orders</option>
                <option value="fulfilling">Incoming Orders</option>
              </select>

              <select
                multiple
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    Array.from(e.target.selectedOptions).map((o) => o.value),
                  )
                }
                className="rounded-xl p-2 border"
              >
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <h1 className="text-6xl font-black text-center text-purple-600 mb-4">
            Orders
          </h1>
          <p className="text-center text-2xl text-gray-700 mb-8">
            Manage all orders — sent and received
          </p>

          <OrderFlowHelper />

          {orders.length === 0 ? (
            <div className="text-center py-32">
              <p className="text-3xl text-gray-600">No orders found</p>
            </div>
          ) : (
            <div className="space-y-12">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className={`bg-white rounded-3xl shadow-2xl overflow-hidden border-l-8 ${
                    order.status === OrderStatus.DECLINED
                      ? "border-red-500"
                      : order.status === OrderStatus.COMPLETED
                        ? "border-emerald-500"
                        : "border-yellow-500"
                  }`}
                >
                  <div className="grid lg:grid-cols-3 gap-8 p-8">
                    {/* LEFT: Product & Earnings */}
                    <div className="space-y-6">
                      {order.productPhoto ? (
                        <Image
                          src={order.productPhoto}
                          alt="Product"
                          width={500}
                          height={500}
                          className="rounded-2xl shadow-xl w-full object-cover"
                        />
                      ) : (
                        <div className="bg-gray-200 border-4 border-dashed rounded-2xl w-full h-80 flex items-center justify-center">
                          <span className="text-2xl text-gray-500">
                            No photo
                          </span>
                        </div>
                      )}
                      <Link href={`/orders/${order._id}`}>View Order</Link>

                      <div className="text-center">
                        <p className="text-5xl font-black text-emerald-600">
                          You earn ${order.fulfillingShopGets?.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* MIDDLE: Details */}
                    <div className="space-y-6 text-lg">
                      <div className="flex justify-between items-center">
                        <h3 className="text-3xl font-black text-purple-600">
                          Order #{order.orderNumber}
                        </h3>
                        <span className="font-bold text-gray-600">
                          From: {order.originatingShopName}
                        </span>
                      </div>

                      <div>
                        <p className="font-bold text-purple-700">
                          Delivery Date
                        </p>
                        <p className="text-3xl font-black">
                          {new Date(order.deliveryDate).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold text-purple-700">Recipient</p>
                        <p className="font-semibold">
                          {order.recipient.firstName} {order.recipient.lastName}
                        </p>
                        <p>
                          {order.recipient.address}
                          <br />
                          {order.recipient.city}, {order.recipient.state}{" "}
                          {order.recipient.zip}
                        </p>
                        <p>Phone: {order.recipient.phone}</p>
                      </div>

                      <div>
                        <p className="font-bold text-purple-700">
                          Card Message
                        </p>
                        <p className="italic bg-gray-50 p-4 rounded-xl">
                          “{order.recipient.message || "No message"}”
                        </p>
                      </div>

                      {order.specialInstructions && (
                        <div className="bg-yellow-50 border-4 border-yellow-400 rounded-2xl p-4">
                          <p className="font-bold text-yellow-900">
                            Special Instructions
                          </p>
                          <p>{order.specialInstructions}</p>
                        </div>
                      )}

                      <div className="text-sm opacity-75">
                        Customer: {order.customer?.firstName}{" "}
                        {order.customer?.lastName}
                        <br />
                        {order.customer?.email} • {order.customer?.phone}
                      </div>
                    </div>

                    {/* RIGHT: Actions */}
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <p className="text-xl text-gray-500 uppercase tracking-wide mb-2">
                        Order Status
                      </p>

                      <span
                        className={`px-4 py-2 rounded-full text-sm font-black ${
                          statusBadgeStyles[order.status] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabels[order.status] ||
                          order.status.replaceAll("_", " ")}
                      </span>

                      {order.status === OrderStatus.DECLINED &&
                        session?.user?.id === order.originatingShop && (
                          <div className="mt-3 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
                            <p className="font-bold text-red-700">Declined</p>

                            {order.declineReason && (
                              <p>
                                <span className="font-semibold">Reason:</span>{" "}
                                {order.declineReason.replaceAll("_", " ")}
                              </p>
                            )}

                            {order.declineMessage && (
                              <p className="italic mt-1">
                                “{order.declineMessage}”
                              </p>
                            )}
                          </div>
                        )}

                      {order.status === OrderStatus.DECLINED &&
                        session?.user?.id === order.originatingShop && (
                          <button
                            onClick={() => {
                              const confirmed = confirm(
                                "Reassign this order to another shop?",
                              );
                              if (confirmed) {
                                router.push(`/orders/${order._id}`);
                              }
                            }}
                            className="mt-3 text-sm font-bold text-purple-600 hover:underline"
                          >
                            Reassign this order →
                          </button>
                        )}

                      {/* Accept / Decline → Only fulfilling shop */}
                      {order.status === OrderStatus.PENDING_ACCEPTANCE &&
                        session?.user?.id === order.fulfillingShop && (
                          <div className="flex flex-col gap-4 w-full">
                            <button
                              disabled={actionOrderId === order._id}
                              onClick={() =>
                                handleStatus(
                                  order._id,
                                  OrderStatus.ACCEPTED_AWAITING_PAYMENT,
                                )
                              }
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-2xl py-4 rounded-3xl"
                            >
                              Accept
                            </button>

                            <button
                              disabled={actionOrderId === order._id}
                              onClick={() => {
                                setDeclineOrderId(order._id);
                                setDeclineReason("");
                                setDeclineMessage("");
                              }}
                              className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-2xl py-4 rounded-3xl"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                      {/* Payment buttons → Only originating shop */}
                      {order.status === OrderStatus.ACCEPTED_AWAITING_PAYMENT &&
                        session?.user?.id === order.originatingShop && (
                          <div className="flex flex-wrap gap-2 justify-center w-full">
                            {(
                              ["venmo", "cashapp", "zelle", "other"] as const
                            ).map((method) => (
                              <button
                                disabled={actionOrderId === order._id}
                                key={method}
                                onClick={() =>
                                  handleMarkPaid(order._id, method)
                                }
                                className={`flex-1 max-w-xs py-3 rounded-3xl font-black text-white ${
                                  method === "venmo"
                                    ? "bg-blue-500 hover:bg-blue-600"
                                    : method === "cashapp"
                                      ? "bg-green-500 hover:bg-green-600"
                                      : method === "zelle"
                                        ? "bg-purple-500 hover:bg-purple-600"
                                        : "bg-gray-500 hover:bg-gray-600"
                                }`}
                              >
                                {method.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        )}

                      {/* Mark Delivered (Fulfilling Shop) */}
                      {order.status === OrderStatus.PAID_AWAITING_FULFILLMENT &&
                        session?.user?.id === order.fulfillingShop && (
                          <button
                            disabled={actionOrderId === order._id}
                            onClick={() =>
                              handleStatus(order._id, OrderStatus.COMPLETED)
                            }
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black text-2xl py-4 rounded-3xl"
                          >
                            Mark as Delivered
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Decline Order Modal */}
      {declineOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-3xl p-8 max-w-lg space-y-6 shadow-2xl">
            <h2 className="text-3xl font-black text-red-600">Decline Order</h2>

            <div>
              <label className="block font-bold mb-2">Reason</label>
              <select
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full border rounded-xl p-3"
              >
                <option value="">Select a reason</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="TOO_BUSY">Too Busy</option>
                <option value="DELIVERY_TOO_FAR">Delivery Too Far</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {declineReason === "OTHER" && (
              <div>
                <label className="block font-bold mb-2">
                  Additional details
                </label>

                <textarea
                  value={declineMessage}
                  onChange={(e) => setDeclineMessage(e.target.value)}
                  className="w-full border rounded-xl p-3"
                  rows={4}
                  placeholder="Please explain..."
                />
              </div>
            )}

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeclineOrderId(null)}
                className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-black rounded-xl"
              >
                Cancel
              </button>

              <button
                disabled={
                  !declineReason ||
                  (declineReason === "OTHER" && !declineMessage.trim()) ||
                  declineLoading
                }
                onClick={async () => {
                  setDeclineLoading(true);

                  const res = await fetch("/api/orders/status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      orderId: declineOrderId,
                      status: OrderStatus.DECLINED,
                      declineReason,
                      declineMessage: declineMessage.trim(),
                    }),
                  });

                  setDeclineLoading(false);

                  if (res.ok) {
                    toast.success("Order declined");
                    setDeclineOrderId(null);
                    fetchOrders();
                  } else {
                    const err = await res.json();
                    toast.error(err.error || "Failed to decline order");
                  }
                }}
                className="px-6 py-3 rounded-xl bg-red-600 text-white font-black disabled:opacity-50"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
