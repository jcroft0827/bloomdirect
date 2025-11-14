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

                  {/* Accept Button */}
                  <button
                    onClick={() => handleStatus(order._id, "accepted")}
                    disabled={order.status !== "pending"}
                    className={`px-6 py-3 rounded-lg font-bold ${
                      order.status === "accepted"
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-green-600 hover:text-white"
                    }`}
                  >
                    {order.status === "accepted" ? "Accepted" : "Accept"}
                  </button>
                  {/* Decline Button */}
                  <button
                    onClick={() => handleStatus(order._id, "declined")}
                    disabled={order.status !== "pending"}
                    className={`px-6 py-3 rounded-lg font-bold ${
                      order.status === "declined"
                        ? "bg-red-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-red-600 hover:text-white"
                    }`}
                  >
                    {order.status === "declined" ? "Declined" : "Decline"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
