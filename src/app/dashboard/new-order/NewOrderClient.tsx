"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRef } from "react";

export default function NewOrderClient() {
  const { data: session } = useSession();
  const shopId = (session?.user as any)?.shopId;
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientApt, setRecipientApt] = useState("");
  const [cardMessage, setCardMessage] = useState("");
  const [recipientZip, setRecipientZip] = useState("");
  const [recipientCity, setRecipientCity] = useState("");
  const [recipientState, setRecipientState] = useState("");
  const [arrangementValue, setArrangementValue] = useState(100);
  const [deliveryFee, setDeliveryFee] = useState(20);
  const [originatingFee, setOriginatingFee] = useState(25);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState("");
  const [searching, setSearching] = useState(false);
  const [cardMessageLarge, setCardMessageLarge] = useState(false);
  const [findShopSuccess, setFindShopSuccess] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (recipientZip.length === 5) {
      fetch(`https://ziptasticapi.com/${recipientZip}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.city) setRecipientCity(`${data.city}`);
          if (data.state) setRecipientState(`${data.state}`);
        })
        .catch(() => {
          setRecipientCity(""), setRecipientState("");
        });
    }
  }, [recipientZip]);

  const searchShops = async () => {
    if (recipientZip.length !== 5 || !recipientZip)
      return toast.error("Enter recipient ZIP");

    setSearching(true);

    try {
      if (!recipientZip) return toast.error("Enter recipient ZIP");
      setSearching(true);
      const res = await fetch(`/api/shops/near?zip=${recipientZip}`);
      const data = await res.json();
      setShops(data.shops || []);
      setSearching(false);
      setFindShopSuccess(true);
      if (data.shops?.length === 0)
        toast.error("No BloomDirect shops yet in that area – invite them!");
    } catch (err) {
      console.error(err);
      setFindShopSuccess(false);
      alert("Error searching shops");
    } finally {
      setSearching(false);
    }
  };

  const verifyAndSuggestAddress = async (address: string) => {
    if (!address || address.length < 8) {
      setAddressSuggestions([]);
      return;
    }

    try {
      const res = await fetch("/api/address/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          street: address,
          city: recipientCity,
          state: recipientState,
          zip: recipientZip,
        }),
      });

      const data = await res.json();
      if (data.suggestions && data.suggestions.length > 0) {
        setAddressSuggestions(data.suggestions);
      } else {
        setAddressSuggestions([]);
      }
    } catch (error) {
      console.log("Address verify failed (normal if no match)");
      setAddressSuggestions([]);
    }
  };

  const addressTimeout = useRef<NodeJS.Timeout | null>(null);
  const totalCustomerPays = arrangementValue + deliveryFee + originatingFee;
  const fulfillingShopGets = arrangementValue + deliveryFee;

  const router = useRouter();

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4">
            Send Order – Keep $20–$27 Instantly
          </h1>
          <p className="text-center text-gray-600 mb-10">
            Customer calls you → you forward in 45 seconds → you keep pure
            profit
          </p>

          {/* Return to Dashboard */}
          <div>
            <Link href={"/dashboard"}>
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-3xl mb-4 text-xl shadow-xl hover:shadow-2xl transition-all">
                ← Cancel & Return
              </button>
            </Link>
          </div>

          {/* Recipient Location */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="flex gap-5 items-center">
              <label className="block text-lg font-semibold mb-4">
                Recipient ZIP Code
              </label>
              <p
                className={
                  (findShopSuccess ? "visible" : "invisible") + " text-sm mb-4"
                }
              >
                <span className="text-green-500 font-semibold">
                  Search Successful!
                </span>{" "}
                Scroll to bottom of page to choose a filling shop!
              </p>
            </div>
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
            {(recipientCity || recipientState) && (
              <div className="mt-4 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <p className="text-2xl font-bold text-emerald-700">
                  {recipientCity}
                  {recipientState && `, ${recipientState}`}
                </p>
                <p className="text-emerald-600 mt-1">
                  Delivery Location Confirmed
                </p>
              </div>
            )}
          </div>

          {/* Recipient Details */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Recipient Details</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="mb-2">
                <label className="block text-lg font-semibold text-gray-700 mb-2">
                  Recipient Name
                </label>
                <input
                  placeholder="Recipient Name *"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-6 py-4 text-xl border-2 border-gray-300 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="mb-2">
                <label className="block text-lg font-semibold text-gray-700 mb-2">
                  Delivery Street Address
                </label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="123 Main Street"
                  className="w-full px-6 py-4 text-xl border-2 border-gray-300 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="mb-2">
                <label className="block text-lg font-semibold text-gray-700 mb-2">
                  Delivery ZIP Code
                </label>
                <input
                  type="text"
                  value={recipientZip}
                  onChange={(e) =>
                    setRecipientZip(
                      e.target.value.replace(/\D/g, "").slice(0, 5)
                    )
                  }
                  className="w-full px-6 py-4 text-xl border-2 border-gray-300 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all"
                  placeholder="14001"
                  maxLength={5}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-6 mb-2">
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-2">
                    Delivery City
                  </label>
                  <input
                    type="text"
                    value={recipientCity}
                    onChange={(e) => setRecipientCity(e.target.value)}
                    className="w-full px-6 py-4 text-xl border-2 border-gray-300 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all"
                    placeholder="Dallas"
                    required
                  />
                </div>
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={recipientState}
                    onChange={(e) =>
                      setRecipientState(
                        e.target.value.toUpperCase().slice(0, 2)
                      )
                    }
                    className="w-full px-6 py-4 text-xl border-2 border-gray-300 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all uppercase"
                    placeholder="TX"
                    maxLength={2}
                    required
                  />
                </div>
              </div>
              <div className="mb-2">
                <label className="block text-lg font-semibold text-gray-700 mb-2">
                  Delivery Apt/Suite (optional)
                </label>
                <input
                  placeholder="Apt/Suite (optional)"
                  value={recipientApt}
                  onChange={(e) => setRecipientApt(e.target.value)}
                  className="w-full px-6 py-4 text-xl border-2 border-gray-300 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>
              <div className="mb-2">
                <div className="flex gap-2 justify-between mr-2 items-center">
                  <label className="block text-lg font-semibold text-gray-700 mb-2">
                    Card Message
                  </label>
                  <button
                    type="button"
                    onClick={() => setCardMessageLarge((prev) => !prev)}
                    className={`px-4 py-2 rounded-xl font-semibold transition-all hover:shadow-lg ${
                      cardMessageLarge
                        ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                        : "bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                    }`}
                  >
                    {cardMessageLarge ? "Normal Text" : "Large Text"}
                  </button>
                </div>
                <textarea
                  placeholder="With deepest sympathy... / Happy Birthday! / Congratulations on your new arrival!"
                  value={cardMessage}
                  onChange={(e) => setCardMessage(e.target.value)}
                  rows={3}
                  // className="w-full px-4 py-3 border rounded-lg md:col-span-2"
                  className={`w-full px-6 py-5 border-2 border-gray-300 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all ${
                    cardMessageLarge
                      ? "text-2xl leading-relaxed" // Large & readable
                      : "text-lg leading-normal" // Clean & default
                  }`}
                />
              </div>
            </div>
            {(recipientCity || recipientState) && (
              <div className="mt-8 p-8 bg-emerald-50 border-2 border-emerald-300 rounded-3xl text-center shadow-lg">
                <p className="text-4xl font-black text-emerald-700">
                  {recipientCity}, {recipientState}
                </p>
                <p className="text-emerald-600 text-xl mt-3">
                  Location auto-filled from ZIP
                </p>
              </div>
            )}
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
                        city: recipientCity,
                        state: recipientState,
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
                    toast.success(`Order sent! 💐 You kept $${originatingFee}`);
                    // Optional: reset form
                    setRecipientName("");
                    setRecipientAddress("");
                    setRecipientCity("");
                    setRecipientState("");
                    setRecipientApt("");
                    setCardMessage("");
                    router.push("/dashboard");
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
