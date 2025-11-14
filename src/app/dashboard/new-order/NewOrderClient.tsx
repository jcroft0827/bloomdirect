"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";

export default function NewOrderClient() {
  const { data: session } = useSession();
  const shopId = (session?.user as any)?.shopId;
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientApt, setRecipientApt] = useState("");
  const [cardMessage, setCardMessage] = useState("");
  const [recipientZip, setRecipientZip] = useState("");
  const [cityState, setCityState] = useState("");
  const [arrangementValue, setArrangementValue] = useState(100);
  const [deliveryFee, setDeliveryFee] = useState(20);
  const [originatingFee, setOriginatingFee] = useState(25);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (recipientZip.length === 5) {
      fetch(`https://ziptasticapi.com/${recipientZip}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.city) setCityState(`${data.city}, ${data.state}`);
        })
        .catch(() => setCityState(""));
    }
  }, [recipientZip]);

  const searchShops = async () => {
    if (!recipientZip) return toast.error("Enter recipient ZIP");
    setSearching(true);
    const res = await fetch(`/api/shops/near?zip=${recipientZip}`);
    const data = await res.json();
    setShops(data.shops || []);
    setSearching(false);
    if (data.shops?.length === 0)
      toast.error("No BloomDirect shops yet in that area – invite them!");
  };

  const totalCustomerPays = arrangementValue + deliveryFee + originatingFee;
  const fulfillingShopGets = arrangementValue + deliveryFee;

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4">
            Send Order – Keep $20–$27 Instantly
          </h1>
          <p className="text-center text-gray-600 mb-12">
            Customer calls you → you forward in 45 seconds → you keep pure
            profit
          </p>

          {/* Recipient Location */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <label className="block text-lg font-semibold mb-4">
              Recipient ZIP Code
            </label>
            <div className="flex gap-4">
              <input
                type="text"
                maxLength={5}
                value={recipientZip}
                onChange={(e) =>
                  setRecipientZip(e.target.value.replace(/\D/g, ""))
                }
                placeholder="90210"
                className="w-32 px-4 py-3 border rounded-lg text-2xl"
              />
              <button
                onClick={searchShops}
                disabled={searching}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold"
              >
                {searching ? "Searching…" : "Find BloomDirect Shops"}
              </button>
            </div>
            {cityState && <p className="mt-4 text-xl">Location: {cityState}</p>}
          </div>

          {/* Recipient Details */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Recipient Details</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <input
                placeholder="Recipient Name *"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg"
                required
              />
              <input
                placeholder="Street Address *"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg"
                required
              />
              <input
                placeholder="Apt/Suite (optional)"
                value={recipientApt}
                onChange={(e) => setRecipientApt(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg"
              />
              <textarea
                placeholder="Card Message"
                value={cardMessage}
                onChange={(e) => setCardMessage(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border rounded-lg md:col-span-2"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">
              Pricing (100 % + $20–$27 model)
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block font-semibold">Arrangement + tax</label>
                <input
                  type="number"
                  value={arrangementValue}
                  onChange={(e) => setArrangementValue(Number(e.target.value))}
                  className="w-full px-4 py-3 border rounded-lg text-2xl"
                />
              </div>
              <div>
                <label className="block font-semibold">Delivery fee</label>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  className="w-full px-4 py-3 border rounded-lg text-2xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-green-600">
                  Your fee (profit)
                </label>
                <input
                  type="number"
                  value={originatingFee}
                  onChange={(e) => setOriginatingFee(Number(e.target.value))}
                  className="w-full px-4 py-3 border rounded-lg text-2xl font-bold text-green-600"
                />
              </div>
            </div>

            <div className="mt-8 p-6 bg-gray-100 rounded-lg text-center">
              <div className="text-4xl font-bold">
                Customer pays: ${totalCustomerPays}
              </div>
              <div className="text-2xl mt-2">
                Fulfilling shop receives: <strong>${fulfillingShopGets}</strong>
              </div>
              <div className="text-2xl text-green-600 font-bold mt-4">
                You keep: ${originatingFee} pure profit
              </div>
            </div>
          </div>

          {/* Shop Picker */}
          {shops.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold mb-4">Choose filling shop</h2>
              <div className="space-y-4">
                {shops.map((shop) => (
                  <label
                    key={shop._id}
                    className={`flex items-center justify-between p-6 border rounded-lg cursor-pointer hover:bg-green-50 ${
                      selectedShop === shop._id
                        ? "border-green-600 bg-green-50"
                        : ""
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xl">{shop.shopName}</div>
                      <div>
                        {shop.address} • {shop.city}, {shop.state}
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="shop"
                      value={shop._id}
                      onChange={() => setSelectedShop(shop._id)}
                      className="w-6 h-6"
                    />
                  </label>
                ))}
              </div>

              <button
                onClick={async () => {
                  if (!selectedShop || !shopId) {
                    toast.error("Missing shop");
                    return;
                  }

                  if (!recipientName || !recipientAddress) {
                    toast.error("Fill recipient name and address");
                    return;
                  }

                  const res = await fetch("/api/orders/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      originatingShopId: shopId,
                      fulfillingShopId: selectedShop,
                      recipient: {
                        name: recipientName,
                        address: `${recipientAddress}${
                          recipientApt ? " " + recipientApt : ""
                        }`,
                        city: cityState.split(", ")[0],
                        state: cityState.split(", ")[1],
                        zip: recipientZip,
                        message: cardMessage,
                      },
                      pricing: {
                        arrangement: arrangementValue,
                        delivery: deliveryFee,
                        fee: originatingFee,
                        total: totalCustomerPays,
                      },
                    }),
                  });

                  if (res.ok) {
                    toast.success(`Order sent! You kept $${originatingFee}`);
                    // Optional: reset form
                    setRecipientName("");
                    setRecipientAddress("");
                    setRecipientApt("");
                    setCardMessage("");
                  } else {
                    const err = await res.json();
                    toast.error(err.error || "Failed to send order");
                  }
                }}
                disabled={!selectedShop || !recipientZip || searching}
                className="mt-8 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold text-2xl py-6 rounded-xl"
              >
                Send Order & Keep ${originatingFee} →→→
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
