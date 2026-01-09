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
  const router = useRouter();

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter.length) params.append("status", statusFilter.join(","));
      if (roleFilter !== "all") params.append("role", roleFilter);

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error("Failed to load orders", err);
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
    const res = await fetch("/api/orders/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: newStatus }),
    });

    if (res.ok) {
      toast.success(`Order updated: ${newStatus.replaceAll("_", " ")}`);
      fetchOrders();
    } else {
      const error = await res.json();
      toast.error(error.error || "Failed to update order");
    }
  };

  const handleMarkPaid = async (
    orderId: string,
    method: "venmo" | "cashapp" | "zelle" | "other"
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
      console.error(err);
      toast.error("Failed to mark order as paid");
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
                    Array.from(e.target.selectedOptions).map((o) => o.value)
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
                  className="bg-white rounded-3xl shadow-2xl overflow-hidden border-l-8 border-yellow-500"
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
                            }
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
                      <p className="text-4xl font-black text-gray-700 mb-4">
                        {statusLabels[order.status] ||
                          order.status.replaceAll("_", " ")}
                      </p>

                      {/* Accept / Decline → Only fulfilling shop */}
                      {order.status === OrderStatus.PENDING_ACCEPTANCE &&
                        session?.user?.id === order.fulfillingShop && (
                          <div className="flex flex-col gap-4 w-full">
                            <button
                              onClick={() =>
                                handleStatus(
                                  order._id,
                                  OrderStatus.ACCEPTED_AWAITING_PAYMENT
                                )
                              }
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-2xl py-4 rounded-3xl"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                handleStatus(order._id, OrderStatus.DECLINED)
                              }
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
    </>
  );
}
