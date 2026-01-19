// app/orders/[orderId]/page.tsx
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import type { OrderLean } from "@/types/order";
import { OrderStatus } from "@/lib/order-status";
import Shop from "@/models/Shop";
import { Types } from "mongoose";

import Image from "next/image";
import { LucideOption } from "lucide-react";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderPage({ params }: PageProps) {
  const { orderId } = await params;

  await connectToDB();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const order = (await Order.findById(orderId).lean()) as OrderLean | null;
  if (!order) notFound();

  const userShopId = session.user.id;

  const role =
    order.originatingShop.toString() === userShopId
      ? "ORIGINATING"
      : order.fulfillingShop.toString() === userShopId
      ? "FULFILLING"
      : null;

  if (!role) notFound();

  const isFulfilling = role === "FULFILLING";
  const isOriginating = role === "ORIGINATING";

  let availableShops: {
    _id: Types.ObjectId;
    shopName: string;
  }[] = [];

  if (isOriginating && order.status === OrderStatus.DECLINED) {
    availableShops = await Shop.find({
      _id: { $ne: order.fulfillingShop },
    })
      .select("_id shopName")
      .lean<{ _id: Types.ObjectId; shopName: string }[]>(); // 👈 ARRAY HERE
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* HEADER */}
        <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col gap-4">
          <h1 className="text-5xl font-black text-purple-600">
            Order #{order.orderNumber}
          </h1>

          <h2 className="text-sm font-mono text-gray-500">
            Order ID: {order._id.toString()}
          </h2>

          <div className="flex flex-wrap items-center gap-4">
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
        <div className="bg-white rounded-3xl shadow-xl p-6 flex flex-col md:flex-row justify-between gap-6">
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
        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT – PRODUCT */}
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
            {order.productPhoto ? (
              <Image
                src={order.productPhoto}
                alt="Product"
                width={500}
                height={500}
                className="rounded-2xl object-cover"
              />
            ) : (
              <div className="h-64 bg-gray-200 rounded-2xl flex items-center justify-center">
                <span className="text-gray-500">No photo</span>
              </div>
            )}

            <div className="text-center">
              <p className="text-4xl font-black text-emerald-600">
                ${order.fulfillingShopGets?.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">You earn</p>
            </div>
          </div>

          {/* MIDDLE – DETAILS */}
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
            <div>
              <p className="font-bold text-purple-700">Delivery Date</p>
              <p className="text-2xl font-black">
                {new Date(order.deliveryDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
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
              <p className="font-bold text-purple-700">Card Message</p>
              <p className="italic bg-gray-50 p-4 rounded-xl">
                “{order.recipient.message || "No message"}”
              </p>
            </div>

            {/* DECLINE REASON */}
            {order.status === OrderStatus.DECLINED && isOriginating && (
              <div className="border-4 border-red-500 bg-red-50 rounded-2xl p-5 space-y-2">
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
            {order.specialInstructions && (
              <div className="bg-yellow-50 border-4 border-yellow-400 rounded-2xl p-4">
                <p className="font-bold text-yellow-900">
                  Special Instructions
                </p>
                <p>{order.specialInstructions}</p>
              </div>
            )}

            {/* Activity Log */}
            {order.activityLog?.length ? (
              <div className="bg-gray-50 border rounded-2xl p-5 space-y-3">
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
                <>
                  <form action="/api/orders/status" method="POST">
                    <input
                      type="hidden"
                      name="orderId"
                      value={order._id.toString()}
                    />
                    <input
                      type="hidden"
                      name="status"
                      value={OrderStatus.ACCEPTED_AWAITING_PAYMENT}
                    />
                    <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl py-4 rounded-2xl">
                      Accept Order
                    </button>
                  </form>

                  <p className="text-xs text-red-500 text-center">
                    This action cannot be undone.
                  </p>

                  <details className="group">
                    <summary className="cursor-pointer w-full bg-red-600 hover:bg-red-700 text-white font-black text-xl py-4 rounded-2xl text-center">
                      Decline Order
                    </summary>

                    <form
                      action="/api/orders/status"
                      method="POST"
                      className="mt-4 space-y-3"
                    >
                      <input
                        type="hidden"
                        name="orderId"
                        value={order._id.toString()}
                      />
                      <input
                        type="hidden"
                        name="status"
                        value={OrderStatus.DECLINED}
                      />

                      <select
                        name="declineReason"
                        required
                        className="w-full rounded-xl border px-4 py-3"
                      >
                        <option value="">Select reason…</option>
                        <option value="OUT_OF_STOCK">Out of stock</option>
                        <option value="TOO_BUSY">Too busy</option>
                        <option value="DELIVERY_AREA">
                          Outside delivery area
                        </option>
                        <option value="OTHER">Other</option>
                      </select>

                      <textarea
                        name="declineMessage"
                        placeholder="Optional message for originating shop"
                        className="w-full rounded-xl border px-4 py-3"
                        rows={3}
                      />

                      <button
                        type="submit"
                        className="w-full bg-red-700 hover:bg-red-800 text-white font-black py-3 rounded-xl"
                      >
                        Confirm Decline
                      </button>
                    </form>
                  </details>

                  <form action="/api/orders/status" method="POST">
                    <input
                      type="hidden"
                      name="orderId"
                      value={order._id.toString()}
                    />
                    <input
                      type="hidden"
                      name="status"
                      value={OrderStatus.DECLINED}
                    />
                    <button className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xl py-4 rounded-2xl">
                      Decline Order
                    </button>
                  </form>
                </>
              )}

            {/* MARK PAID */}
            {isOriginating &&
              order.status === OrderStatus.ACCEPTED_AWAITING_PAYMENT && (
                <div className="space-y-2">
                  <p className="font-bold text-gray-700">Mark as Paid</p>

                  {["venmo", "cashapp", "zelle", "other"].map((method) => (
                    <form
                      key={method}
                      action="/api/orders/payment"
                      method="POST"
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
