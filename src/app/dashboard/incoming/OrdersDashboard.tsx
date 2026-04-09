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
  const [dateFilter, setDateFilter] = useState({
    start: new Date(), // Or null
    end: new Date(),
  });

  const [declineOrderId, setDeclineOrderId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>("");
  const [declineMessage, setDeclineMessage] = useState<string>("");
  const [declineLoading, setDeclineLoading] = useState(false);

  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  const [mobileFilters, setMobileFilters] = useState(false);
  const [dateSearchType, setDateSearchType] = useState("Order Date");

  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function loadShop() {
      try {
        const res = await fetch("/api/shops/me");
        const data = await res.json();

        if (data && data.shop) {
          if (!data.shop.onboardingComplete) {
            router.push("/dashboard/setup");
          }
        }
      } catch (err) {
        console.error("Failed to load shop data", err);
      }
    }
    loadShop();
  }, []);

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
      toast.error(
        "Unexpected error loading orders. Reload the page. If the problem persists, contact GetBloomDirect support.",
      );
    } finally {
      setLoading(false);
    }
  };

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
      toast.error(
        "Failed to update order. Please try again. If the problem persists, contact GetBloomDirect support.",
      );
    }
  };

  const handleMarkPaid = async (
    orderId: string,
    method: "venmo" | "cashapp" | "zelle" | "paypal",
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
      toast.error(
        "Failed to mark order as paid. Please try again. If the problem persists, contact GetBloomDirect support.",
      );
    }
  };

  const formatDateForInput = (date: any) => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-4 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col mb-4">
            <h1 className="text-4xl font-black text-center text-purple-600">
              Orders
            </h1>
            <p className="text-center text-lg text-gray-700">
              Manage all orders — sent and received
            </p>
          </div>

          <OrderFlowHelper />

          {/* Filters - MOBILE */}
          <div className="flex mb-8 items-center gap-6 px-4 py-2 bg-white rounded-xl shadow-md">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="rounded-xl p-2 border w-full shadow-md"
            >
              <option value="all">All Orders</option>
              <option value="originating">Sent Orders</option>
              <option value="fulfilling">Incoming Orders</option>
            </select>

            <button
              type="button"
              onClick={() => setMobileFilters(true)}
              className="border p-2 rounded-xl shadow-md"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
                />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="hidden mb-8 flex-wrap gap-4 items-center justify-between">
            <div>
              <label></label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="rounded-xl p-2 border"
              >
                <option value="all">All Orders</option>
                <option value="originating">Sent Orders</option>
                <option value="fulfilling">Incoming Orders</option>
              </select>
            </div>
            <div>
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
                  <div className="grid lg:grid-cols-2 gap-8 p-4 lg:py-6 2xl:grid-cols-3 2xl:gap-4">
                    {/* LEFT: Order Info + Order Status */}
                    <div className="space-y-4 text-center lg:col-span-1">
                      {/* Order Info */}
                      <div>
                        {/* Order Number */}
                        <p className="text-xl font-bold text-purple-600">
                          Order #
                          <Link href={`/orders/${order._id}`}>
                            {order.orderNumber}
                          </Link>
                        </p>

                        {/* Order Total */}
                        <p className="text-xl font-bold text-gray-600">
                          Order Total:{" "}
                          <span className="text-emerald-600">
                            ${order.pricing.fulfillingShopGets}
                          </span>
                        </p>
                        {/* Delivery Fee */}
                        <p className="font-bold text-gray-600">
                          Delivery Charge:{" "}
                          <span className="text-emerald-600">
                            ${order.pricing.deliveryFee.toFixed(2)}
                          </span>
                        </p>

                        {/* Who sent the order -- 
                        Turn name into a link later...takes user to that shop's account */}
                        <p className="font-bold text-gray-600">
                          From: {order.originatingShopName}
                        </p>
                      </div>
                      {/* Order Status */}
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
                        {order.status ===
                          OrderStatus.ACCEPTED_AWAITING_PAYMENT &&
                          session?.user?.id === order.originatingShop && (
                            <div className="flex flex-col gap-2 justify-center w-full">
                              <p className="font-bold text-lg capitalize">
                                Preferred Payment Method: {order.paymentMethods.default}
                              </p>
                              <div className="flex flex-wrap gap-2 justify-center w-full">
                                {(
                                  ["venmo", "cashapp", "zelle", "paypal"] as const
                                ).map((method) => (
                                  <button
                                    disabled={actionOrderId === order._id}
                                    key={method}
                                    onClick={() =>
                                      handleMarkPaid(order._id, method)
                                    }
                                    className={`flex-1 max-w-xs py-3 rounded-3xl font-black text-white px-2 ${
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
                            </div>
                          )}

                        {/* Mark Delivered (Fulfilling Shop) */}
                        {order.status ===
                          OrderStatus.PAID_AWAITING_FULFILLMENT &&
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

                    {/* MIDDLE: Delivery Details */}
                    <div className="text-center grid grid-cols-2 gap-y-4 md:max-w-[30rem] md:mx-auto md:gap-x-10 lg:col-span-1 lg:gap-x-4 2xl:gap-0">
                      {/* Logistics */}
                      {/* Del Date */}
                      <p className="text-purple-600 font-bold text-lg">
                        Delivery Date <br />
                        <span className="text-black text-xl font-black">
                            {new Date(order.logistics.deliveryDate).toLocaleDateString("en-US", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                        </span>
                      </p>
                      {/* Del Time Method */}
                      <p className="text-purple-600 font-bold text-lg">
                        Delivery Time <br />
                        <span className="text-black text-xl font-black capitalize">
                          {order.logistics.deliveryTimeOption}
                        </span>
                        {order.logistics.deliveryTimeOption === "specific" && (
                          <span>
                            <br />
                            {order.logistics.deliveryTimeFrom} -{" "}
                            {order.logistics.deliveryTimeTo}
                          </span>
                        )}
                      </p>
                      {/* Recipient */}
                      <div className="text-lg lg:text-base">
                        <p className="text-purple-600 font-bold">Recipient</p>
                        <p className="font-semibold capitalize">
                          {order.recipient.fullName}
                        </p>
                        <p>{order.recipient.address}</p>
                        <p>
                          <span>{order.recipient.city}</span>,{" "}
                          <span>{order.recipient.state}</span>{" "}
                          <span>{order.recipient.zip}</span>
                        </p>
                        <p>{order.recipient.phone}</p>
                        {order.recipient.company != "" && (
                          <p>{order.recipient.company}</p>
                        )}
                      </div>
                      {/* Customer */}
                      <div className="text-sm text-gray-600">
                        <p className="text-purple-600 font-bold text-lg">
                          Customer
                        </p>
                        <p>{order.customer.fullName}</p>
                        <p>{order.customer.email}</p>
                        <p>{order.customer.phone}</p>
                      </div>
                      {/* Card Message */}
                      <div className="col-span-2">
                        <p className="text-purple-600 font-bold text-lg">
                          Card Message
                        </p>
                        <p className="text-black text-sm p-4 rounded-md bg-gray-50">
                          {order.recipient.message || "No message"}
                        </p>
                      </div>
                    </div>

                    {/* RIGHT: View Order Button + Products */}
                    <div className="flex flex-col gap-4 lg:col-span-2 2xl:col-span-1">
                      <Link href={`/orders/${order._id}`}
                        className="self-center px-8 py-1 rounded-md shadow-md bg-purple-600 border border-purple-600 text-white transition-all hover:text-purple-600 hover:bg-white"
                      >
                        View Order
                      </Link>
                      {/* Products */}
                      <div className="overflow-y-scroll max-h-96">
                        {order.products.map((product: any, index: any) => (
                          <div
                            key={product.id || index}
                            className="mb-2 flex gap-2 p-2 rounded-lg bg-gray-50"
                          >
                            {/* Add Image Here */}
                            <div className="min-w-24 max-h-24 min-h-24 border rounded-lg p-1">
                              Image Goes Here
                            </div>
                            <div className="flex flex-col w-full">
                              <span className="text-black text-xl font-bold">
                                {product.name}
                              </span>
                              <div className="flex flex-col justify-between">
                                <p>
                                  <span className="text-sm font-semibold">
                                    Price:
                                  </span>{" "}
                                  <span className="text-emerald-600 font-semibold">
                                    ${product.price.toFixed(2)}
                                  </span>
                                </p>
                                <p>
                                  {product.taxable === true ? (
                                    <span className="px-2 py-[0.1rem] bg-emerald-600 text-white shadow-md rounded-md">
                                      Taxable
                                    </span>
                                  ) : (
                                    <span className="px-2 py-[0.1rem] bg-red-500 text-white shadow-md rounded-md">
                                      Not Taxable
                                    </span>
                                  )}
                                </p>
                              </div>
                              <p>
                                <span className="text-sm font-semibold">
                                  QTY:
                                </span>{" "}
                                {product.qty}
                              </p>
                              <p>
                                <span className="text-sm font-semibold">
                                  Description:
                                </span>{" "}
                                {product.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="fixed inset-10 z-60 bg-white rounded-xl px-4 py-14">
            <button
              type="button"
              onClick={() => setMobileFilters(false)}
              className="absolute top-2 right-4 text-red-500 text-xl"
            >
              X
            </button>
            <h3 className="text-xl font-medium absolute top-2 left-4">
              Order Filters
            </h3>

            <div className="w-full">
              <div className="flex flex-col gap-4 pb-4 mb-4 border-b border-opacity-75">
                <h4 className="font-medium">Date Filters</h4>
                <div className="grid grid-cols-2 items-center w-full gap-y-2">
                  <label className="flex gap-1">
                    <input
                      type="radio"
                      name="dateSearch"
                      checked={dateSearchType === "Order Date"}
                      value={"Order Date"}
                      onChange={(e) => setDateSearchType(e.target.value)}
                    />
                    Order Date
                  </label>
                  <label className="flex gap-1">
                    <input
                      type="radio"
                      name="dateSearch"
                      checked={dateSearchType === "Delivery Date"}
                      value={"Delivery Date"}
                      onChange={(e) => setDateSearchType(e.target.value)}
                    />
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(dateFilter.start)}
                    onChange={(e) =>
                      setDateFilter({
                        ...dateFilter,
                        start: new Date(e.target.value),
                      })
                    }
                    className="border rounded-lg px-2 py-1 w-full col-span-2"
                  />
                  <div className="grid grid-cols-2 gap-2 col-span-2">
                    <button
                      className="w-full border rounded-lg p-2 shadow-md font-medium col-span-2"
                      onClick={() => {
                        const today = new Date();
                        const nextWeek = new Date();
                        nextWeek.setDate(today.getDate() + 7);

                        setDateFilter({
                          start: today,
                          end: nextWeek,
                        });
                      }}
                    >
                      Next 7 Days
                    </button>
                    <button className="w-full border rounded-lg p-2 shadow-md font-medium">
                      Last 7 Days
                    </button>
                    <button className="w-full border rounded-lg p-2 shadow-md font-medium">
                      Last 30 Days
                    </button>
                    <button className="w-full border rounded-lg p-2 shadow-md font-medium col-span-2">
                      Last 6 Months
                    </button>
                    <button className="w-full border rounded-lg p-2 shadow-md font-medium col-span-2">
                      Last 1 Year
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <h4>Order Status Filters</h4>
              </div>
            </div>
          </div>
        </div>
      )}

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
