"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";

export default function IncomingClient() {
  const { data: session } = useSession();
  interface Order {
    _id: string;
    status: string;
    originatingShop: { shopName: string; city: string; state: string };
    recipientName: string;
    recipientCity: string;
    recipientState: string;
    cardMessage?: string;
    arrangementValue: number;
    deliveryFee: number;
  }

  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch("/api/orders/incoming")
      .then((r) => r.json())
      .then((data) => setOrders(data.orders));
  }, []);

  const handleStatus = async (
    orderId: string,
    status: "accepted" | "declined"
  ) => {
    const res = await fetch("/api/orders/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status }),
    });

    if (res.ok) {
      toast.success(
        status === "accepted" ? "Order accepted!" : "Order declined."
      );
      setOrders(orders.map((o) => (o._id === orderId ? { ...o, status } : o)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <Toaster position="top-center" />
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12">
          Incoming Orders
        </h1>
        {orders.length === 0 ? (
          <p className="text-center text-xl text-gray-600">
            No incoming orders yet. Tell your friends!
          </p>
        ) : (
          <div className="space-y-6">
            {orders.map((order: any) => (
              <div
                key={order._id}
                className="bg-white rounded-xl shadow-lg p-8"
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold text-xl">
                      From: {order.originatingShop.shopName}
                    </p>
                    <p>
                      Deliver to: {order.recipientName} • {order.recipientCity},{" "}
                      {order.recipientState}
                    </p>
                    <p className="mt-2">
                      Message: {order.cardMessage || "None"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">
                      ${order.arrangementValue + order.deliveryFee}
                    </p>
                    <p className="text-sm text-gray-600">You receive</p>
                  </div>
                </div>

                {/* Button Section */}
                <div className="mt-6 flex gap-4">
                  <div className="mt-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        order.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : order.status === "accepted"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {order.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Accept / Decline Buttons — only visible when pending */}
                  {order.status === "pending" && (
                    <div className="flex gap-4 mt-4">
                      <button
                        onClick={() => handleStatus(order._id, "accepted")}
                        className="px-8 py-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-lg hover:scale-105"
                      >
                        Accept Order
                      </button>
                      <button
                        onClick={() => handleStatus(order._id, "declined")}
                        className="px-8 py-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-lg hover:scale-105"
                      >
                        Decline Order
                      </button>
                    </div>
                  )}

                  {/* Visual confirmation — shows after action */}
                  {order.status === "accepted" && (
                    <div className="mt-4 inline-flex items-center gap-3 bg-emerald-100 text-emerald-800 px-6 py-4 rounded-xl font-bold">
                      <svg
                        className="w-8 h-8"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Order Accepted
                    </div>
                  )}

                  {order.status === "declined" && (
                    <div className="mt-4 inline-flex items-center gap-3 bg-red-100 text-red-800 px-6 py-4 rounded-xl font-bold">
                      <svg
                        className="w-8 h-8"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Order Declined
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
