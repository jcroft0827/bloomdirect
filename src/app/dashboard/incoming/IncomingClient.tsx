// src/app/dashboard/incoming/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function IncomingOrders() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders/incoming");
      const data = await res.json();
      setOrders(data.orders || []);
      console.log("FRONTEND RECEIVED ORDERS:", data.orders);
    } catch (err) {
      console.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter();
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleStatus = async (
    orderId: string,
    status: "accepted" | "declined"
  ) => {
    const res = await fetch("/api/orders/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }), // ← this format now matches
    });

    if (res.ok) {
      toast.success(
        status === "accepted" ? "Order accepted!" : "Order declined"
      );
      fetchOrders(); // ← this will refresh and show the new status
    } else {
      const error = await res.json();
      toast.error(error.error || "Failed to update");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-3xl text-gray-600">Loading orders…</p>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Link href="/dashboard">
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 px-10 rounded-3xl text-2xl shadow-xl hover:shadow-2xl transition-all flex items-center gap-3">
                ← Back to Dashboard
              </button>
            </Link>
          </div>
          <h1 className="text-6xl font-black text-center text-purple-600 mb-4">
            Incoming Orders
          </h1>
          <p className="text-center text-2xl text-gray-700 mb-4">
            Accept fast → deliver → get paid instantly
          </p>

          {orders.length === 0 ? (
            <div className="text-center py-32">
              <div className="text-9xl mb-8">No new orders yet</div>
              <p className="text-3xl text-gray-600">
                You’ll see them here the second they arrive
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {orders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white rounded-3xl shadow-2xl overflow-hidden border-l-8 border-yellow-500"
                >
                  <div className="grid lg:grid-cols-3 gap-8 p-8">
                    {/* Left: Photo + Earnings */}
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

                      <div className="text-center">
                        <p className="text-5xl font-black text-emerald-600">
                          You earn $
                          {order.fulfillingShopGets?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </div>

                    {/* Middle: All the important info */}
                    <div className="space-y-6 text-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="text-3xl font-black text-purple-600">
                          Order #{order.orderNumber}
                        </h3>
                        <span className="text-xl font-bold text-gray-600">
                          From: {order.originatingShopName}
                        </span>
                      </div>

                      <div>
                        <p className="text-2xl font-bold text-purple-700">
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
                        <p
                          className={`inline-block mt-2 px-6 py-3 rounded-full text-xl font-bold ${
                            order.deliveryTimeOption === "specific"
                              ? "bg-red-100 text-red-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {order.deliveryTimeOption === "specific"
                            ? `${order.deliveryTimeFrom} – ${order.deliveryTimeTo}`
                            : "Any Time That Day"}
                        </p>
                      </div>

                      <div>
                        <p className="text-2xl font-bold text-purple-700">
                          Recipient
                        </p>
                        <p className="text-xl font-semibold">
                          {order.recipient?.firstName}{" "}
                          {order.recipient?.lastName}
                        </p>
                        <p>
                          {order.recipient?.address}
                          <br />
                          {order.recipient?.city}, {order.recipient?.state}{" "}
                          {order.recipient?.zip}
                        </p>
                        <p className="mt-2">Phone: {order.recipient?.phone}</p>
                      </div>

                      <div>
                        <p className="text-2xl font-bold text-purple-700">
                          Card Message
                        </p>
                        <p className="italic bg-gray-50 p-4 rounded-xl">
                          "{order.recipient?.message || "No message"}"
                        </p>
                      </div>

                      {order.specialInstructions && (
                        <div className="bg-yellow-50 border-4 border-yellow-400 rounded-2xl p-4">
                          <p className="font-bold text-yellow-900">
                            Special Instructions
                          </p>
                          <p className="text-yellow-800">
                            {order.specialInstructions}
                          </p>
                        </div>
                      )}

                      <div className="text-sm opacity-75">
                        <p>
                          Customer: {order.customer?.firstName}{" "}
                          {order.customer?.lastName}
                        </p>
                        <p>
                          {order.customer?.email} • {order.customer?.phone}
                        </p>
                      </div>
                    </div>

                    {order.status === "pending" ? (
                      <div className="space-y-6">
                        <button
                          onClick={() => handleStatus(order._id, "accepted")}
                          className="w-full max-w-xs bg-emerald-600 hover:bg-emerald-700 text-white font-black text-3xl py-8 rounded-3xl shadow-2xl transition transform hover:scale-105"
                        >
                          Accept Order
                        </button>
                        <button
                          onClick={() => handleStatus(order._id, "declined")}
                          className="w-full max-w-xs bg-red-600 hover:bg-red-700 text-white font-black text-3xl py-8 rounded-3xl shadow-2xl transition"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`text-center py-16 text-6xl font-black ${
                          order.status === "accepted"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {order.status === "accepted" ? "ACCEPTED" : "DECLINED"}
                      </div>
                    )}
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
