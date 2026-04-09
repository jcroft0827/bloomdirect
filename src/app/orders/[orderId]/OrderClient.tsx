"use client";

import toast from "react-hot-toast";
import type { OrderLean } from "@/types/order";
import Link from "next/link";
import { OrderStatus } from "@/lib/order-status";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface OrderClientProps {
  order: OrderLean;
  availableShops: any[];
  isFulfilling: boolean;
  isOriginating: boolean;
}

interface Decline {
  orderId: string;
  reason: string;
  message: string;
  loading: boolean;
}

export default function OrderClient({
  order,
  availableShops,
  isFulfilling,
  isOriginating,
}: OrderClientProps) {

    const router = useRouter();
  const role = isOriginating ? "ORIGINATING" : "FULFILLING";
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [decline, setDecline] = useState<Decline | null>(null);

  const handleMarkPaid = async (
    e: React.FormEvent, // Add the event
    orderId: string,
    method: string,
  ) => {
    e.preventDefault(); // Stop the page from reloading/redirecting

    try {
      const res = await fetch("/api/orders/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentMethod: method }),
      });

      if (res.ok) {
        toast.success(`Order marked as paid via ${method.toUpperCase()}!`);
        router.refresh();
      } else {
        throw new Error("Failed to update");
      }
    } catch (err) {
      console.error("Failed to mark order as paid", err);
      toast.error("Failed to mark order as paid.");
    }
  };

  const formatTimeString = (timeStr: any) => {
    if (!timeStr || typeof timeStr !== "string") return "";

    // Split the hours and minutes
    let [hours, minutes] = timeStr.split(":").map(Number);

    const ampm = hours >= 12 ? "PM" : "AM";

    // Convert 24h to 12h
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    // Ensure minutes always have two digits (e.g., :05 instead of :5)
    const strMinutes = minutes < 10 ? "0" + minutes : minutes;

    return `${hours}:${strMinutes} ${ampm}`;
  };

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
        //fetchOrders();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back To Orders Button */}
        <Link
          href={"/dashboard/incoming"}
          className="px-6 py-2 rounded-xl bg-gray-400 text-white flex text-lg items-center w-full justify-center font-semibold hover:bg-gray-500 transition-all border-0  md:max-w-72"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2.0"
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Back To Orders
        </Link>

        {/* HEADER */}
        <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col gap-4 text-center">
          <h1 className="text-xl font-black text-purple-600">
            Order #{order.orderNumber}
          </h1>

          {/* <h2 className="text-sm font-mono text-gray-500">
            Order ID: {order._id.toString()}
          </h2> */}

          <div className="flex flex-wrap items-center gap-4 justify-center">
            <span>
              {order.status === OrderStatus.DECLINED ? (
                <span className="px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-700">
                  DECLINED
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                  {order.status.replaceAll("_", " ")}
                </span>
              )}
            </span>

            {order.status === OrderStatus.DECLINED &&
              role === "ORIGINATING" && (
                <p className="mt-1 text-sm text-red-600">
                  Reason:{" "}
                  {order.declineReason?.replaceAll("_", " ") || "Not specified"}
                </p>
              )}

            <span className="px-4 py-2 rounded-full text-sm font-bold bg-gray-100 text-gray-700">
              You are the {role.toLowerCase()} shop
            </span>
          </div>
        </div>

        {/* STATUS TIMELINE */}
        <div className="bg-white rounded-3xl shadow-xl p-6 grid grid-cols-2 md:flex md:flex-row justify-between gap-6">
          {[
            { label: "Sent", done: true },
            { label: "Accepted", done: !!order.acceptedAt },
            { label: "Paid", done: !!order.paymentMarkedPaidAt },
            { label: "Delivered", done: !!order.completedAt },
          ].map((step, i) => (
            <div key={i} className="flex-1 text-center">
              <div
                className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center font-black ${
                  step.done
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              <p
                className={`mt-2 text-sm font-semibold ${
                  step.done ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {step.label}
              </p>
            </div>
          ))}
        </div>

        {/* MAIN CONTENT */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT – Order Details + Products */}
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
            <div className="text-center">
              {/* Role */}
              {role === "FULFILLING" ? (
                <p className="text-lg text-gray-600 font-semibold">
                  From:{" "}
                  <span className="text-purple-600 font-bold text-xl">
                    {order.originatingShopName}
                  </span>
                </p>
              ) : (
                <p className="text-lg text-gray-600 font-semibold">
                  To:{" "}
                  <span className="text-purple-600 font-bold text-xl">
                    {order.fulfillingShopName}
                  </span>
                </p>
              )}
              {/* Fulfilling Shop Gets */}
              <p className="text-lg text-gray-600 font-semibold">
                Fulfilling Shop Gets:{" "}
                <span className="text-emerald-600 font-bold text-xl">
                  ${order.pricing.fulfillingShopGets.toFixed(2)}
                </span>
              </p>
              {/* Delivery Fee */}
              <p className="text-lg text-gray-600 font-semibold">
                Delivery Fee:{" "}
                <span className="text-emerald-600 font-bold text-xl">
                  {order.pricing.deliveryFee.toFixed(2)}
                </span>
              </p>
            </div>
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
                        <span className="text-sm font-semibold">Price:</span>{" "}
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
                      <span className="text-sm font-semibold">QTY:</span>{" "}
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

          {/* MIDDLE – DETAILS */}
          <div className="bg-white rounded-3xl shadow-xl p-4 grid grid-cols-2 gap-4 text-center">
            {/* Delivery Date */}
            <div className="col-span-2">
              <p className="font-bold text-purple-700">Delivery Date</p>
              <p className="text-2xl font-black">
                {new Date(order.logistics.deliveryDate).toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              </p>
            </div>
            {/* Delivery Times */}
            <div className="col-span-2">
              <p className="font-bold text-purple-700">Delivery Time</p>
              <p className="text-2xl font-black capitalize">
                {order.logistics.deliveryTimeOption}
              </p>
              {order.logistics.deliveryTimeOption === "specific" && (
                <div>
                  <span className="font-semibold text-gray-600 text-sm">
                    From:
                  </span>{" "}
                  <span className="font-bold">
                    {formatTimeString(order.logistics.deliveryTimeFrom)}
                  </span>{" "}
                  <span className="font-semibold text-gray-600 text-sm">
                    - To:
                  </span>{" "}
                  <span className="font-bold">
                    {formatTimeString(order.logistics.deliveryTimeTo)}
                  </span>
                </div>
              )}
            </div>
            {/* Recipient */}
            <div className="">
              <p className="font-bold text-purple-700">Recipient</p>
              <p className="font-semibold capitalize">
                {order.recipient.fullName}
              </p>
              <p>
                {order.recipient.address}
                <br />
                {order.recipient.city}, {order.recipient.state}{" "}
                {order.recipient.zip}
              </p>
              <p>{order.recipient.phone}</p>
              <p>{order.recipient?.email}</p>
              <p>{order.recipient?.company}</p>
            </div>
            {/* Customer */}
            <div className="text-gray-600 text-sm">
              <p className="font-bold text-purple-700 text-base">Customer</p>
              <p>{order.customer?.fullName}</p>
              <p>{order.customer?.email}</p>
              <p>{order.customer?.phone}</p>
            </div>
            {/* Card Message */}
            <div className="col-span-2">
              <p className="text-purple-600 font-bold text-lg">Card Message</p>
              <p className="text-black text-sm p-4 rounded-md bg-gray-50">
                {order.recipient.message || "No message"}
              </p>
            </div>

            {/* DECLINE REASON */}
            {order.status === OrderStatus.DECLINED && isOriginating && (
              <div className="border-4 border-red-500 bg-red-50 rounded-2xl p-5 space-y-2 col-span-2">
                <p className="font-black text-red-700 text-lg">
                  Order Declined
                </p>

                <p className="text-sm text-gray-700">
                  <strong>{order.fulfillingShopName}</strong> declined this
                  order.
                </p>

                {order.declineReason && (
                  <p className="text-sm">
                    <span className="font-bold">Reason:</span>{" "}
                    {order.declineReason.replaceAll("_", " ")}
                  </p>
                )}

                {order.declineMessage && (
                  <p className="italic bg-white/70 p-3 rounded-xl text-sm">
                    “{order.declineMessage}”
                  </p>
                )}
              </div>
            )}

            {/* Special Instructions */}
            {order.logistics.specialInstructions && (
              <div className="bg-yellow-50 border-4 border-yellow-400 rounded-2xl p-4 col-span-2">
                <p className="font-bold text-yellow-900">
                  Special Instructions
                </p>
                <p>{order.logistics.specialInstructions}</p>
              </div>
            )}

            {/* Activity Log */}
            {order.activityLog?.length ? (
              <div className="bg-gray-50 border rounded-2xl p-5 space-y-3 col-span-2">
                <h3 className="font-black text-gray-700">Order Activity</h3>

                <ul className="space-y-2 text-sm">
                  {order.activityLog
                    .slice()
                    .reverse()
                    .map((log, idx) => (
                      <li key={idx} className="flex justify-between gap-4">
                        <span>{log.message}</span>
                        <span className="text-gray-400">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* RIGHT – ACTIONS */}
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4">
            {/* ACCEPT / DECLINE */}
            {isFulfilling &&
              order.status === OrderStatus.PENDING_ACCEPTANCE && (
                <div>
                  <button
                    type="button"
                    disabled={actionOrderId === order._id}
                    onClick={() => handleStatus(order._id, OrderStatus.ACCEPTED_AWAITING_PAYMENT)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl py-4 rounded-2xl"
                  >
                    Accept Order
                  </button>
                  <button
                    type="button"
                    disabled={actionOrderId === order._id}
                    onClick={() => {
                      setDecline({
                        ...decline,
                        orderId: order._id.toString(),
                        reason: "",
                        message: "",
                        loading: true,
                      });
                    }}
                  >
                    Decline Order
                  </button>
                </div>
                // <>
                //   <form action="/api/orders/status" method="POST">
                //     <input
                //       type="hidden"
                //       name="orderId"
                //       value={order._id.toString()}
                //     />
                //     <input
                //       type="hidden"
                //       name="status"
                //       value={OrderStatus.ACCEPTED_AWAITING_PAYMENT}
                //     />
                //     <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl py-4 rounded-2xl">
                //       Accept Order
                //     </button>
                //   </form>

                //   <p className="text-xs text-red-500 text-center">
                //     This action cannot be undone.
                //   </p>

                //   <details className="group">
                //     <summary className="cursor-pointer w-full bg-red-600 hover:bg-red-700 text-white font-black text-xl py-4 rounded-2xl text-center">
                //       Decline Order
                //     </summary>

                //     <form
                //       action="/api/orders/status"
                //       method="POST"
                //       className="mt-4 space-y-3"
                //     >
                //       <input
                //         type="hidden"
                //         name="orderId"
                //         value={order._id.toString()}
                //       />
                //       <input
                //         type="hidden"
                //         name="status"
                //         value={OrderStatus.DECLINED}
                //       />

                //       <select
                //         name="declineReason"
                //         required
                //         className="w-full rounded-xl border px-4 py-3"
                //       >
                //         <option value="">Select reason…</option>
                //         <option value="OUT_OF_STOCK">Out of stock</option>
                //         <option value="TOO_BUSY">Too busy</option>
                //         <option value="DELIVERY_AREA">
                //           Outside delivery area
                //         </option>
                //         <option value="OTHER">Other</option>
                //       </select>

                //       <textarea
                //         name="declineMessage"
                //         placeholder="Optional message for originating shop"
                //         className="w-full rounded-xl border px-4 py-3"
                //         rows={3}
                //       />

                //       <button
                //         type="submit"
                //         className="w-full bg-red-700 hover:bg-red-800 text-white font-black py-3 rounded-xl"
                //       >
                //         Confirm Decline
                //       </button>
                //     </form>
                //   </details>

                //   <form action="/api/orders/status" method="POST">
                //     <input
                //       type="hidden"
                //       name="orderId"
                //       value={order._id.toString()}
                //     />
                //     <input
                //       type="hidden"
                //       name="status"
                //       value={OrderStatus.DECLINED}
                //     />
                //     <button className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xl py-4 rounded-2xl">
                //       Decline Order
                //     </button>
                //   </form>
                // </>
              )}

            {/* MARK PAID */}
            {isOriginating &&
              order.status === OrderStatus.ACCEPTED_AWAITING_PAYMENT && (
                <div className="space-y-2">
                  <p className="font-bold text-gray-700">Mark as Paid</p>

                  <p className="text-gray-600 font-semibold">
                    Preferred Payment Method:{" "}
                    <span className="text-lg uppercase text-emerald-600">
                      {order.paymentMethods?.default}
                    </span>
                  </p>

                  {["venmo", "cashapp", "zelle", "paypal"].map((method) => (
                    <form
                      key={method}
                      onSubmit={(e) =>
                        handleMarkPaid(e, order._id.toString(), method)
                      }
                    >
                      <input
                        type="hidden"
                        name="orderId"
                        value={order._id.toString()}
                      />
                      <input
                        type="hidden"
                        name="paymentMethod"
                        value={method}
                      />
                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl">
                        Paid via {method.toUpperCase()}
                      </button>
                    </form>
                  ))}
                </div>
              )}

            {/* MARK DELIVERED */}
            {isFulfilling &&
              order.status === OrderStatus.PAID_AWAITING_FULFILLMENT && (
                <form action="/api/orders/status" method="POST">
                  <input
                    type="hidden"
                    name="orderId"
                    value={order._id.toString()}
                  />
                  <input
                    type="hidden"
                    name="status"
                    value={OrderStatus.COMPLETED}
                  />
                  <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl py-4 rounded-2xl">
                    Mark as Delivered
                  </button>
                </form>
              )}

            {/* REASSIGN ORDER */}
            {isOriginating &&
              order.status === OrderStatus.DECLINED &&
              availableShops.length > 0 && (
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-black text-purple-700">
                    Reassign Order
                  </h3>

                  <p className="text-sm text-gray-600">
                    This order was declined. Choose another shop to fulfill it.
                  </p>

                  <p className="text-sm text-gray-500">
                    Once reassigned, the new shop will receive this order and
                    can choose to accept or decline it. You will be notified by
                    email.
                  </p>

                  <p className="text-xs text-red-500 text-center">
                    This action cannot be undone.
                  </p>

                  <form
                    action="/api/orders/reassign"
                    method="POST"
                    className="space-y-3"
                  >
                    <input
                      type="hidden"
                      name="orderId"
                      value={order._id.toString()}
                    />

                    <select
                      name="newFulfillingShopId"
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select a shop…</option>

                      {availableShops.map((shop) => (
                        <option
                          key={shop._id.toString()}
                          value={shop._id.toString()}
                        >
                          {shop.shopName}
                        </option>
                      ))}
                    </select>

                    <label className="flex items-start gap-3 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        required
                        className="mt-1 accent-purple-600"
                      />
                      I understand this order will be sent to a new shop.
                    </label>

                    <button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl"
                    >
                      Reassign Order
                    </button>
                  </form>
                </div>
              )}

            {/* FALLBACK */}
            {!(
              (isFulfilling &&
                order.status === OrderStatus.PENDING_ACCEPTANCE) ||
              (isOriginating &&
                order.status === OrderStatus.ACCEPTED_AWAITING_PAYMENT) ||
              (isFulfilling &&
                order.status === OrderStatus.PAID_AWAITING_FULFILLMENT) ||
              (isOriginating && order.status === OrderStatus.DECLINED)
            ) && (
              <div className="text-center text-gray-500 text-sm pt-4">
                No actions available for this status
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
