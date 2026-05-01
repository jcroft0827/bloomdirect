// /app/dashboard/incoming/OrdersDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrderStatus } from "@/lib/order-status";
import OrderFlowHelper from "@/components/OrderFlowHelper";
import { formatCurrencyFromCents } from "@/lib/format-currency";

import {
  getAvailablePaymentMethods,
  getPreferredPaymentMethod,
  PaymentMethod,
} from "@/lib/order-payment-methods";

export default function OrdersDashboard() {
  const { data: session, status } = useSession();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeFilters, setActiveFilters] = useState({
    status: [] as string[],
    role: "all" as "originating" | "fulfilling" | "all",
    dateRange: { start: "", end: "" }, // Use empty strings instead of null/Date
    dateType: "Order Date",
    preset: "",
  });

  const [draftFilters, setDraftFilters] = useState(activeFilters);

  const [declineOrderId, setDeclineOrderId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState<string>("");
  const [declineMessage, setDeclineMessage] = useState<string>("");
  const [declineLoading, setDeclineLoading] = useState(false);

  const [actionOrderId, setActionOrderId] = useState<string | null>(null);

  const [mobileFilters, setMobileFilters] = useState(false);
  const [desktopFilters, setDesktopFilters] = useState(false);

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
      setLoading(true);
      const params = new URLSearchParams();

      // Pull from activeFilters object
      const { status, role, dateRange, dateType } = activeFilters;

      if (status.length) params.append("status", status.join(","));
      if (role !== "all") params.append("role", role);

      // Date Filters
      if (dateRange.start) {
        const start = new Date(`${dateRange.start}T00:00:00`);
        params.append("startDate", start.toISOString());
      }
      if (dateRange.end) {
        const end = new Date(`${dateRange.end}T23:59:59`);
        params.append("endDate", end.toISOString());
      }

      params.append("dateType", dateType);

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setOrders(data.orders || []);
      } else {
        toast.error(data.error || "Failed to load orders.");
        return;
      }
    } catch (err) {
      console.error("Failed to load orders", err);
      toast.error(
        "Unexpected error loading orders. Reload the page. If the problem persists, contact GetBloomDirect support.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Runs when filters change
  useEffect(() => {
    fetchOrders();
  }, [activeFilters]);

  // Runs once (polling)
  // useEffect(() => {
  //   const interval = setInterval(fetchOrders, 15000);
  //   return () => clearInterval(interval);
  // }, []);

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
    if (actionOrderId === orderId) return;
    
    try {
      setActionOrderId(orderId);

      const res = await fetch("/api/orders/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentMethodUsed: method }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Order marked as paid via ${method.toUpperCase()}!`);
        fetchOrders();
      } else {
        toast.error(data.error || "Failed to mark order as paid");
      }
    } catch (err) {
      console.error("Failed to mark order as paid", err);
      toast.error(
        "Failed to mark order as paid. Please try again. If the problem persists, contact GetBloomDirect support.",
      );
    } finally {
      setActionOrderId(null);
    }
  };

  const handleApply = () => {
    setActiveFilters(draftFilters);
    setMobileFilters(false);
    setDesktopFilters(false);
  };

  const handleCancel = () => {
    setDraftFilters(activeFilters);
    setMobileFilters(false);
    setDesktopFilters(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-3xl text-gray-600">Loading orders…</p>
      </div>
    );
  }

  const getButtonStyle = (presetName: string) => {
    const isActive = draftFilters.preset === presetName;
    return `w-full border rounded-lg p-2 lg:p-1 shadow-md font-medium transition-colors ${
      isActive
        ? "bg-emerald-600 text-white border-emerald-600"
        : "bg-white text-gray-700 border-gray-200"
    }`;
  };

  const clearFilters = () => {
    const resetFilters = {
      status: [],
      role: "all" as const,
      dateRange: { start: "", end: "" },
      dateType: "Order Date",
      preset: "",
    };
    setActiveFilters(resetFilters);
    setDraftFilters(resetFilters);
  };

  const statusLabels: Record<string, string> = {
    PENDING_ACCEPTANCE: "Pending Acceptance",
    ACCEPTED_AWAITING_PAYMENT: "Accepted — Awaiting Payment",
    PAID_AWAITING_FULFILLMENT: "Paid — In Production",
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
            <p className="text-center text-xl text-gray-700">
              Showing <b>{orders.length}</b> Orders
            </p>
          </div>

          <OrderFlowHelper />

          {/* Filters */}
          <div className="mb-8 px-4 py-2 bg-white rounded-xl shadow-md transition-all duration-300">
            <div className="flex items-center gap-6">
              <select
                value={activeFilters.role}
                onChange={(e) =>
                  setActiveFilters({
                    ...activeFilters,
                    role: e.target.value as any,
                  })
                }
                className="rounded-xl p-2 border w-full shadow-md"
              >
                <option value="all">All Orders</option>
                <option value="originating">Sent Orders</option>
                <option value="fulfilling">Incoming Orders</option>
              </select>

              {/* Mobile Filters Button */}
              <button
                type="button"
                onClick={() => setMobileFilters(true)}
                className="border p-2 rounded-xl shadow-md lg:hidden"
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
              {/* Desktop Filters Button */}
              <button
                type="button"
                onClick={() => setDesktopFilters(true)}
                className="border p-2 rounded-xl shadow-md hidden lg:block"
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

            {/* Desktop Filters */}
            <div
              className={`grid transition-all duration-500 ease-in-out overflow-hidden
                    ${desktopFilters ? "grid-row-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
                  `}
            >
              <div className="min-h-0">
                <div className="pt-4 border-t border-gray-200 mt-2 text-gray-600 text-sm space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <h3 className="text-xl font-medium">Order Filters</h3>
                      <button
                        onClick={clearFilters}
                        className="text-indigo-700 text-xl"
                      >
                        Clear Filters
                      </button>
                    </div>
                    {/* Apply + Cancel Button */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApply}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-semibold rounded-lg w-full"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-lg font-semibold rounded-lg w-full"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                  {/* Date Filters */}
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-center gap-6">
                      <h4 className="font-medium">Date Filters</h4>
                      <label className="flex gap-1">
                        <input
                          type="radio"
                          name="dateSearch"
                          checked={draftFilters.dateType === "Order Date"}
                          value={"Order Date"}
                          onChange={(e) =>
                            setDraftFilters({
                              ...draftFilters,
                              dateType: e.target.value,
                            })
                          }
                        />
                        Order Date
                      </label>
                    </div>
                    {/* Filters */}
                    <div className="flex flex-col w-full gap-2">
                      {/* Start Date + End Date */}
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-500 ml-1">
                            Start Date
                          </span>
                          <input
                            type="date"
                            value={draftFilters.dateRange.start}
                            onChange={(e) =>
                              setDraftFilters({
                                ...draftFilters,
                                preset: "",
                                dateRange: {
                                  ...draftFilters.dateRange,
                                  start: e.target.value,
                                },
                              })
                            }
                            className="border rounded-lg px-2 py-1 w-full"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-500 ml-1">
                            End Date
                          </span>
                          <input
                            type="date"
                            value={draftFilters.dateRange.end}
                            onChange={(e) =>
                              setDraftFilters({
                                ...draftFilters,
                                preset: "", // Clear preset highlight
                                dateRange: {
                                  ...draftFilters.dateRange,
                                  end: e.target.value,
                                },
                              })
                            }
                            className="border rounded-lg px-2 py-1 w-full"
                          />
                        </div>
                      </div>
                      {/* Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          className={`${getButtonStyle("next7")}`}
                          onClick={(e) => {
                            const today = new Date();
                            const nextWeek = new Date();
                            nextWeek.setDate(today.getDate() + 7);

                            setDraftFilters({
                              ...draftFilters,
                              preset: "next7",
                              dateRange: {
                                start: today.toISOString().split("T")[0],
                                end: nextWeek.toISOString().split("T")[0],
                              },
                            });
                          }}
                        >
                          Next 7 Days
                        </button>
                        <button
                          className={`${getButtonStyle("last7")}`}
                          onClick={(e) => {
                            const end = new Date();
                            const start = new Date();
                            start.setDate(end.getDate() - 7);

                            setDraftFilters({
                              ...draftFilters,
                              preset: "last7",
                              dateRange: {
                                start: start.toISOString().split("T")[0],
                                end: end.toISOString().split("T")[0],
                              },
                            });
                          }}
                        >
                          Last 7 Days
                        </button>
                        <button
                          className={`${getButtonStyle("last30")}`}
                          onClick={(e) => {
                            const end = new Date();
                            const start = new Date();
                            start.setDate(end.getDate() - 30);

                            setDraftFilters({
                              ...draftFilters,
                              preset: "last30",
                              dateRange: {
                                start: start.toISOString().split("T")[0],
                                end: end.toISOString().split("T")[0],
                              },
                            });
                          }}
                        >
                          Last 30 Days
                        </button>
                        <button
                          className={`${getButtonStyle("last6months")} col-span-2`}
                          onClick={(e) => {
                            const end = new Date();
                            const start = new Date();
                            start.setMonth(end.getMonth() - 6);

                            setDraftFilters({
                              ...draftFilters,
                              preset: "last6months",
                              dateRange: {
                                start: start.toISOString().split("T")[0],
                                end: end.toISOString().split("T")[0],
                              },
                            });
                          }}
                        >
                          Last 6 Months
                        </button>
                        <button
                          className={`${getButtonStyle("last1year")}`}
                          onClick={(e) => {
                            const end = new Date();
                            const start = new Date();
                            start.setFullYear(end.getFullYear() - 1);

                            setDraftFilters({
                              ...draftFilters,
                              preset: "last1year",
                              dateRange: {
                                start: start.toISOString().split("T")[0],
                                end: end.toISOString().split("T")[0],
                              },
                            });
                          }}
                        >
                          Last 1 Year
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Order Status Filters */}
                  <div className="space-y-2">
                    <h4>Order Status Filters</h4>
                    <div className="flex items-center gap-y-2 gap-x-4 flex-wrap">
                      {Object.entries(statusLabels).map(([key, label]) => (
                        <label
                          key={key}
                          className="flex gap-2 items-center cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded accent-emerald-600"
                            checked={draftFilters.status.includes(key)}
                            onChange={() => {
                              const isSelected =
                                draftFilters.status.includes(key);
                              const nextStatus = isSelected
                                ? draftFilters.status.filter((s) => s !== key) // Remove if already there
                                : [...draftFilters.status, key]; // Add if not there

                              setDraftFilters({
                                ...draftFilters,
                                status: nextStatus,
                              });
                            }}
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          {/* <div className="hidden mb-8 flex-wrap gap-4 items-center justify-between">
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
          </div> */}

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
                            {formatCurrencyFromCents(
                              order.pricing.orderTotalCents,
                            )}
                          </span>
                        </p>
                        {/* Delivery Fee */}
                        <p className="font-bold text-gray-600">
                          Delivery Charge:{" "}
                          <span className="text-emerald-600">
                            {formatCurrencyFromCents(
                              order.pricing.deliveryFeeCents,
                            )}
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
                        {order.status === OrderStatus.ACCEPTED_AWAITING_PAYMENT &&
                          session?.user?.id === order.originatingShop && (() => {
                            const availablePaymentMethods = getAvailablePaymentMethods(order.paymentMethods);
                            const preferredPaymentMethod = getPreferredPaymentMethod(order.paymentMethods);

                            return (
                              <div className="flex flex-col gap-2 justify-center w-full">
                                <p className="font-bold text-lg capitalize">
                                  Preferred Payment Method:{" "}
                                  <span className="text-lg uppercase text-emerald-600">
                                    {preferredPaymentMethod ? preferredPaymentMethod : "None Available"}
                                  </span>
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center w-full">
                                  {availablePaymentMethods.map((method) => (
                                    <button
                                      disabled={actionOrderId === order._id}
                                      key={method}
                                      onClick={() => handleMarkPaid(order._id, method)}
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
                                      <div>{method.toUpperCase()}</div>
                                      <div className="text-xs font-medium opacity-90 break-all">
                                        {order.paymentMethods?.[method]}
                                      </div>
                                    </button>
                                  ))}
                                </div>

                                {availablePaymentMethods.length === 0 && (
                                  <p className="text-sm text-red-600 font-semibold">
                                    No payment methods are available for this order.
                                  </p>
                                )}
                              </div>
                            );
                          })()}

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
                          {new Date(
                            order.logistics.deliveryDate,
                          ).toLocaleDateString("en-US", {
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
                      <div className="flex gap-4 justify-center">
                        <Link
                          href={`/orders/${order._id}`}
                          className="self-center px-8 py-1 rounded-md shadow-md bg-purple-600 border border-purple-600 text-white transition-all hover:text-purple-600 hover:bg-white"
                        >
                          View Order
                        </Link>
                        <Link
                          href={`/dashboard/orders/messages/${order._id}`}
                          className="self-center px-8 py-1 rounded-md shadow-md bg-purple-600 border border-purple-600 text-white transition-all hover:text-purple-600 hover:bg-white"
                        >
                          Messages
                        </Link>
                      </div>
                      {/* Products */}
                      <div className="overflow-y-scroll max-h-96">
                        {order.products.map((product: any, index: any) => (
                          <div
                            key={product.id || index}
                            className="mb-2 flex gap-2 p-2 rounded-lg bg-gray-50"
                          >
                            {product.photo ? (
                              <div className="w-24 h-24 border rounded-lg p-1 overflow-hidden">
                                <img
                                  src={product.photo}
                                  alt={product.name}
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="min-w-24 max-h-24 min-h-24 border rounded-lg p-1">
                                No Image
                              </div>
                            )}
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
                                    {formatCurrencyFromCents(
                                      product.priceCents,
                                    )}
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
          <div className="fixed inset-10 z-60 bg-white rounded-xl p-4 flex flex-col">
            <h3 className="text-xl font-medium mb-2">Order Filters</h3>

            <div>
              <button
                onClick={clearFilters}
                className="text-indigo-700 text-xl"
              >
                Clear Filters
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 my-4 pr-2">
              {/* Date Filters */}
              <div className="flex flex-col gap-4 pb-4 mb-4 border-b border-opacity-75">
                <h4 className="font-medium">Date Filters</h4>
                <div className="grid grid-cols-2 items-center w-full gap-y-2">
                  <label className="flex gap-1">
                    <input
                      type="radio"
                      name="dateSearch"
                      checked={draftFilters.dateType === "Order Date"}
                      value={"Order Date"}
                      onChange={(e) =>
                        setDraftFilters({
                          ...draftFilters,
                          dateType: e.target.value,
                        })
                      }
                    />
                    Order Date
                  </label>
                  {/* <label className="flex gap-1">
                    <input
                      type="radio"
                      name="dateSearch"
                      checked={draftFilters.dateType === "Delivery Date"}
                      value={"Delivery Date"}
                      onChange={(e) =>
                        setDraftFilters({
                          ...draftFilters,
                          dateType: e.target.value,
                        })
                      }
                    />
                    Delivery Date
                  </label> */}
                  <div className="grid grid-cols-1 items-center w-full gap-2 col-span-2">
                    {/* Start Date */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500 ml-1">
                        Start Date
                      </span>
                      <input
                        type="date"
                        value={draftFilters.dateRange.start}
                        onChange={(e) =>
                          setDraftFilters({
                            ...draftFilters,
                            preset: "",
                            dateRange: {
                              ...draftFilters.dateRange,
                              start: e.target.value,
                            },
                          })
                        }
                        className="border rounded-lg px-2 py-1 w-full"
                      />
                    </div>

                    {/* End Date */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500 ml-1">
                        End Date
                      </span>
                      <input
                        type="date"
                        value={draftFilters.dateRange.end}
                        onChange={(e) =>
                          setDraftFilters({
                            ...draftFilters,
                            preset: "", // Clear preset highlight
                            dateRange: {
                              ...draftFilters.dateRange,
                              end: e.target.value,
                            },
                          })
                        }
                        className="border rounded-lg px-2 py-1 w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 col-span-2">
                    <button
                      className={`${getButtonStyle("next7")} col-span-2`}
                      onClick={(e) => {
                        const today = new Date();
                        const nextWeek = new Date();
                        nextWeek.setDate(today.getDate() + 7);

                        setDraftFilters({
                          ...draftFilters,
                          preset: "next7",
                          dateRange: {
                            start: today.toISOString().split("T")[0],
                            end: nextWeek.toISOString().split("T")[0],
                          },
                        });
                      }}
                    >
                      Next 7 Days
                    </button>
                    <button
                      className={`${getButtonStyle("last7")}`}
                      onClick={(e) => {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(end.getDate() - 7);

                        setDraftFilters({
                          ...draftFilters,
                          preset: "last7",
                          dateRange: {
                            start: start.toISOString().split("T")[0],
                            end: end.toISOString().split("T")[0],
                          },
                        });
                      }}
                    >
                      Last 7 Days
                    </button>
                    <button
                      className={`${getButtonStyle("last30")}`}
                      onClick={(e) => {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(end.getDate() - 30);

                        setDraftFilters({
                          ...draftFilters,
                          preset: "last30",
                          dateRange: {
                            start: start.toISOString().split("T")[0],
                            end: end.toISOString().split("T")[0],
                          },
                        });
                      }}
                    >
                      Last 30 Days
                    </button>
                    <button
                      className={`${getButtonStyle("last6months")} col-span-2`}
                      onClick={(e) => {
                        const end = new Date();
                        const start = new Date();
                        start.setMonth(end.getMonth() - 6);

                        setDraftFilters({
                          ...draftFilters,
                          preset: "last6months",
                          dateRange: {
                            start: start.toISOString().split("T")[0],
                            end: end.toISOString().split("T")[0],
                          },
                        });
                      }}
                    >
                      Last 6 Months
                    </button>
                    <button
                      className={`${getButtonStyle("last1year")} col-span-2`}
                      onClick={(e) => {
                        const end = new Date();
                        const start = new Date();
                        start.setFullYear(end.getFullYear() - 1);

                        setDraftFilters({
                          ...draftFilters,
                          preset: "last1year",
                          dateRange: {
                            start: start.toISOString().split("T")[0],
                            end: end.toISOString().split("T")[0],
                          },
                        });
                      }}
                    >
                      Last 1 Year
                    </button>
                  </div>
                </div>
              </div>
              {/* Order Status Filters */}
              <div>
                <h4>Order Status Filters</h4>
                <div className="space-y-2">
                  {Object.entries(statusLabels).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex gap-2 items-center cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-emerald-600"
                        checked={draftFilters.status.includes(key)}
                        onChange={() => {
                          const isSelected = draftFilters.status.includes(key);
                          const nextStatus = isSelected
                            ? draftFilters.status.filter((s) => s !== key) // Remove if already there
                            : [...draftFilters.status, key]; // Add if not there

                          setDraftFilters({
                            ...draftFilters,
                            status: nextStatus,
                          });
                        }}
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {/* Apply + Cancel Button */}
            <div className="flex gap-4 w-full justify-center pt-4 border-t">
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-bold rounded-xl w-full"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xl font-bold rounded-xl w-full"
              >
                Cancel
              </button>
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
