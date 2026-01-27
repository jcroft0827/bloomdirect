"use client";

import { ApiError } from "@/lib/api-error";
import { useState } from "react";

type ShopOption = {
  _id: string;
  shopName: string;
};

type Props = {
  orderId: string;
  shops: ShopOption[];
  onSuccess?: () => void;
};

export default function OrderReassign({
  orderId,
  shops,
  onSuccess,
}: Props) {
  const [selectedShop, setSelectedShop] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReassign = async () => {
    if (!selectedShop) {
      setError("Please select a shop");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          newFulfillingShopId: selectedShop,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reassign order");
      }

      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl shadow-md p-6 space-y-4">
      <h3 className="text-lg font-bold">Reassign Order</h3>

      <p className="text-sm text-gray-600">
        This order was declined. You can assign it to another shop without
        recreating the order.
      </p>

      <select
        value={selectedShop}
        onChange={(e) => setSelectedShop(e.target.value)}
        className="w-full border rounded-xl px-4 py-3"
      >
        <option value="">Select a shop</option>
        {shops.map((shop) => (
          <option key={shop._id} value={shop._id}>
            {shop.shopName}
          </option>
        ))}
      </select>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleReassign}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl"
      >
        {loading ? "Reassigning..." : "Reassign Order"}
      </button>
    </section>
  );
}
