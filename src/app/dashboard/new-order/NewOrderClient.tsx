// app/dashboard/new-order/NewOrderClient.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function NewOrderClient() {
  const { data: session } = useSession();
  const shopId = (session?.user as any)?.shopId;
  const router = useRouter();

  // Recipient
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientApt, setRecipientApt] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientZip, setRecipientZip] = useState("");
  const [recipientCity, setRecipientCity] = useState("");
  const [recipientState, setRecipientState] = useState("");

  // Customer
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [cardMessage, setCardMessage] = useState("");

  // Arrangement
  const [productPhoto, setProductPhoto] = useState<string>("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] =
    useState("Designer’s Choice");

  // Delivery
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [deliveryTimeOption, setDeliveryTimeOption] = useState<
    "anytime" | "specific"
  >("anytime");
  const [deliveryTimeFrom, setDeliveryTimeFrom] = useState<string>("");
  const [deliveryTimeTo, setDeliveryTimeTo] = useState<string>("");

  // Pricing
  const [arrangementValue, setArrangementValue] = useState(100);
  const [deliveryFee, setDeliveryFee] = useState(20);
  const [originatingFee, setOriginatingFee] = useState(25);

  // Shops
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [findShopSuccess, setFindShopSuccess] = useState(false);

  const totalCustomerPays = arrangementValue + deliveryFee + originatingFee;
  const fulfillingShopGets = arrangementValue + deliveryFee; // 80/20 model

  // Auto-fill city/state from ZIP
  useEffect(() => {
    if (recipientZip.length === 5) {
      fetch(`https://ziptasticapi.com/${recipientZip}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.city && data.state) {
            setRecipientCity(data.city);
            setRecipientState(data.state);
          }
        })
        .catch(() => {
          setRecipientCity("");
          setRecipientState("");
        });
    }
  }, [recipientZip]);

  // Search shops by ZIP
  const searchShops = async () => {
    if (recipientZip.length !== 5) {
      toast.error("Enter a valid 5-digit ZIP code");
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/shops/near?zip=${recipientZip}`);
      const data = await res.json();
      setShops(data.shops || []);
      setFindShopSuccess(data.shops?.length > 0);
      if (!data.shops?.length) {
        toast.error("No BloomDirect shops in that area yet — invite them!");
      }
    } catch (err) {
      toast.error("Error finding shops");
    } finally {
      setSearching(false);
    }
  };

  // Send Order
  const sendOrder = async () => {
    if (!selectedShop) return toast.error("Select a fulfilling shop");
    if (!deliveryDate) return toast.error("Select delivery date");
    if (!recipientPhone) return toast.error("Recipient phone is required");

    // Validate time window if specific
    if (deliveryTimeOption === "specific") {
      if (!deliveryTimeFrom || !deliveryTimeTo) {
        return toast.error("Please select both time fields");
      }
      if (deliveryTimeFrom >= deliveryTimeTo) {
        return toast.error("End time must be after start time");
      }
    }

    const res = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fulfillingShopId: selectedShop._id,
        recipient: {
          firstName: recipientFirstName,
          lastName: recipientLastName,
          fullName: `${recipientFirstName} ${recipientLastName}`,
          address: recipientAddress + (recipientApt ? " " + recipientApt : ""),
          city: recipientCity,
          state: recipientState,
          zip: recipientZip,
          phone: recipientPhone,
          email: recipientEmail || null,
          message: cardMessage,
        },
        customer: {
          firstName: customerFirstName,
          lastName: customerLastName,
          email: customerEmail,
          phone: customerPhone,
        },
        deliveryDate: deliveryDate.toISOString(),
        deliveryTimeOption,
        deliveryTimeFrom:
          deliveryTimeOption === "specific" ? deliveryTimeFrom : null,
        deliveryTimeTo:
          deliveryTimeOption === "specific" ? deliveryTimeTo : null,
        productPhoto,
        productName,
        productDescription,
        specialInstructions: specialInstructions || "",
        pricing: {
          arrangement: arrangementValue,
          delivery: deliveryFee,
          fee: originatingFee,
          total: totalCustomerPays,
        },
      }),
    });

    if (res.ok) {
      toast.success(`Order sent! You kept $${originatingFee} pure profit!`);
      router.push("/dashboard");
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to send order");
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <h1 className="text-5xl font-black text-center text-purple-600 mb-4">
            Send Order – Keep $20–$50 Instantly
          </h1>
          <p className="text-center text-xl text-gray-600 mb-10">
            Customer calls you → forward in 60 seconds → keep pure profit
          </p>

          <Link href="/dashboard">
            <button className="mb-8 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-3xl text-xl shadow-xl">
              ← Cancel & Return
            </button>
          </Link>

          {/* ZIP Search */}
          <div className="bg-white rounded-3xl shadow-2xl p-10 mb-8">
            <label className="block text-2xl font-bold mb-6">
              Recipient ZIP Code
            </label>
            <div className="flex gap-6 items-center">
              <input
                type="text"
                maxLength={5}
                value={recipientZip}
                onChange={(e) =>
                  setRecipientZip(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                placeholder="90210"
                className="w-48 px-8 py-6 text-4xl font-bold text-center border-4 border-purple-300 rounded-2xl focus:border-purple-600 outline-none"
              />
              <button
                onClick={searchShops}
                disabled={searching}
                className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-6 rounded-2xl font-black text-2xl shadow-xl"
              >
                {searching ? "Searching…" : "Find Shops"}
              </button>
            </div>
            {findShopSuccess && (
              <p className="mt-6 text-2xl font-bold text-emerald-600 text-center">
                Shops found! Scroll down to choose.
              </p>
            )}
          </div>

          {/* Recipient Details */}
          <div className="bg-white rounded-3xl shadow-2xl p-10 mb-8 space-y-8">
            <h2 className="text-3xl font-black text-purple-600">
              Recipient & Delivery
            </h2>

            {/* Recipient (who receives the flowers) */}
            <div className="bg-white rounded-3xl shadow-2xl p-10 mb-8">
              <h2 className="text-3xl font-black text-purple-600 mb-8">
                Recipient Details (Delivery)
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <input
                  placeholder="Recipient First Name *"
                  required
                  value={recipientFirstName}
                  onChange={(e) => setRecipientFirstName(e.target.value)}
                  className="px-8 py-6 text-xl border-4 rounded-2xl"
                />
                <input
                  placeholder="Recipient Last Name *"
                  required
                  value={recipientLastName}
                  onChange={(e) => setRecipientLastName(e.target.value)}
                  className="px-8 py-6 text-xl border-4 rounded-2xl"
                />
                <input
                  placeholder="Phone Number *"
                  required
                  value={recipientPhone}
                  onChange={(e) =>
                    setRecipientPhone(
                      e.target.value.replace(/\D/g, "").slice(0, 10)
                    )
                  }
                  className="px-8 py-6 text-xl border-4 rounded-2xl"
                />
                <input
                  placeholder="Email (optional)"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="px-8 py-6 text-xl border-4 rounded-2xl"
                />
                <input
                  placeholder="Street Address *"
                  required
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="md:col-span-2 px-8 py-6 text-xl border-4 rounded-2xl"
                />
                <input
                  placeholder="Apt, Suite, Floor, Company (optional)"
                  value={recipientApt}
                  onChange={(e) => setRecipientApt(e.target.value)}
                  className="md:col-span-2 px-8 py-6 text-xl border-4 rounded-2xl"
                />
                <input
                  placeholder="ZIP Code *"
                  value={recipientZip}
                  onChange={(e) =>
                    setRecipientZip(
                      e.target.value.replace(/\D/g, "").slice(0, 5)
                    )
                  }
                  className="px-8 py-6 text-xl border-4 rounded-2xl"
                />
                <input
                  placeholder="City"
                  value={recipientCity}
                  readOnly
                  className="px-8 py-6 text-xl border-4 rounded-2xl bg-gray-100"
                />
                <input
                  placeholder="State"
                  value={recipientState}
                  readOnly
                  className="px-8 py-6 text-xl border-4 rounded-2xl bg-gray-100 uppercase font-bold"
                />
              </div>
            </div>

            {/* Customer (who is paying) */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl shadow-2xl p-10 mb-8 border-4 border-blue-200">
              <h2 className="text-3xl font-black text-blue-700 mb-8">
                Customer Details (Person Paying)
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                Usually different from recipient — e.g., daughter in Texas
                sending to mom in New York
              </p>
              <div className="grid md:grid-cols-2 gap-8">
                <input
                  placeholder="Customer First Name *"
                  required
                  value={customerFirstName}
                  onChange={(e) => setCustomerFirstName(e.target.value)}
                  className="px-8 py-6 text-xl border-4 rounded-2xl"
                />
                <input
                  placeholder="Customer Last Name *"
                  required
                  value={customerLastName}
                  onChange={(e) => setCustomerLastName(e.target.value)}
                  className="px-8 py-6 text-xl border-4 rounded-2xl"
                />
                <input
                  placeholder="Customer Email *"
                  required
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="px-8 py-6 text-xl border-4 rounded-2xl"
                />
                <input
                  placeholder="Customer Phone *"
                  required
                  value={customerPhone}
                  onChange={(e) =>
                    setCustomerPhone(
                      e.target.value.replace(/\D/g, "").slice(0, 10)
                    )
                  }
                  className="px-8 py-6 text-xl border-4 rounded-2xl"
                />
              </div>
            </div>

            {/* <div className="grid md:grid-cols-2 gap-8">
              <input
                placeholder="Recipient Company"
                value={recipientCompany}
                onChange={(e) => setRecipientCompany(e.target.value)}
                className={(companyVisible ? "block" : "hidden") + " px-8 py-6 text-xl border-4 rounded-2xl"}
              />

              <input
                placeholder="Recipient First Name *"
                required
                value={recipientFirstName}
                onChange={(e) => setRecipientFirstName(e.target.value)}
                className="px-8 py-6 text-xl border-4 rounded-2xl"
              />
              <input
                placeholder="Recipient Last Name *"
                required
                value={recipientLastName}
                onChange={(e) => setRecipientLastName(e.target.value)}
                className="px-8 py-6 text-xl border-4 rounded-2xl"
              />
              <input
                placeholder="Phone Number *"
                required
                value={recipientPhone}
                onChange={(e) =>
                  setRecipientPhone(
                    e.target.value.replace(/\D/g, "").slice(0, 10)
                  )
                }
                className="px-8 py-6 text-xl border-4 rounded-2xl"
              />
              <input
                placeholder="Email Address *"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail}
                className="px-8 py-6 text-xl border-4 rounded-2xl"
              />
              <input
                placeholder="Street Address *"
                required
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="md:col-span-2 px-8 py-6 text-xl border-4 rounded-2xl"
              />
              <input
                placeholder="Apt/Suite (optional)"
                value={recipientApt}
                onChange={(e) => setRecipientApt(e.target.value)}
                className="md:col-span-2 px-8 py-6 text-xl border-4 rounded-2xl"
              />
              <input
                placeholder="ZIP Code *"
                value={recipientZip}
                onChange={(e) =>
                  setRecipientZip(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                className="px-8 py-6 text-xl border-4 rounded-2xl"
              />
              <input
                placeholder="City"
                value={recipientCity}
                readOnly
                className="px-8 py-6 text-xl border-4 rounded-2xl bg-gray-100"
              />
              <input
                placeholder="State"
                value={recipientState}
                readOnly
                className="px-8 py-6 text-xl border-4 rounded-2xl bg-gray-100 uppercase font-bold"
              />
            </div> */}

            {/* Delivery Date & Time — THE MOST IMPORTANT PART */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-10 border-4 border-emerald-300">
              <h3 className="text-3xl font-black text-emerald-800 mb-8">
                When Should It Arrive?
              </h3>

              {/* Delivery Date */}
              <div className="mb-8">
                <label className="block text-xl font-bold mb-4">
                  Delivery Date *
                </label>
                <DatePicker
                  selected={deliveryDate}
                  onChange={(date) => setDeliveryDate(date)}
                  minDate={new Date()}
                  className="w-full px-8 py-6 text-2xl font-bold text-center border-4 border-emerald-400 rounded-2xl focus:border-emerald-600 outline-none"
                  placeholderText="Select delivery date"
                  required
                />
              </div>

              {/* Delivery Time Options */}
              <div className="space-y-6">
                <label className="flex items-center gap-6 p-6 bg-white rounded-2xl border-4 border-emerald-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="radio"
                    name="deliveryTime"
                    checked={deliveryTimeOption === "anytime"}
                    onChange={() => setDeliveryTimeOption("anytime")}
                    className="w-8 h-8 text-emerald-600"
                  />
                  <div>
                    <div className="text-2xl font-black text-emerald-700">
                      Any Time That Day
                    </div>
                    <div className="text-lg text-gray-600">
                      Most popular — florist delivers when convenient
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-6 p-6 bg-white rounded-2xl border-4 border-emerald-200 cursor-pointer hover:border-emerald-500 transition">
                  <input
                    type="radio"
                    name="deliveryTime"
                    checked={deliveryTimeOption === "specific"}
                    onChange={() => setDeliveryTimeOption("specific")}
                    className="w-8 h-8 text-emerald-600"
                  />
                  <div className="flex-1">
                    <div className="text-2xl font-black text-emerald-700">
                      Specific Time Window
                    </div>
                    <div className="text-lg text-gray-600">
                      Funeral, hospital, or surprise — must be exact
                    </div>
                  </div>
                </label>

                {/* Specific Time Picker — only shows when selected */}
                {deliveryTimeOption === "specific" && (
                  <div className="mt-6 grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-lg font-bold text-emerald-700 mb-3">
                        Deliver After
                      </label>
                      <input
                        type="time"
                        value={deliveryTimeFrom}
                        onChange={(e) => setDeliveryTimeFrom(e.target.value)}
                        className="w-full px-8 py-6 text-2xl text-center border-4 border-emerald-400 rounded-2xl focus:border-emerald-600"
                        required={deliveryTimeOption === "specific"}
                      />
                    </div>
                    <div>
                      <label className="block text-lg font-bold text-emerald-700 mb-3">
                        Deliver Before
                      </label>
                      <input
                        type="time"
                        value={deliveryTimeTo}
                        onChange={(e) => setDeliveryTimeTo(e.target.value)}
                        className="w-full px-8 py-6 text-2xl text-center border-4 border-emerald-400 rounded-2xl focus:border-emerald-600"
                        required={deliveryTimeOption === "specific"}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <textarea
              placeholder="Card Message (With deepest sympathy... / Happy Birthday!)"
              value={cardMessage}
              onChange={(e) => setCardMessage(e.target.value)}
              rows={4}
              className="w-full px-8 py-6 text-xl border-4 rounded-2xl"
            />

            {/* Product Photo + Details */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-10 border-4 border-purple-200">
              <h3 className="text-3xl font-black text-purple-700 mb-8">
                What Are You Sending?
              </h3>

              {/* Photo Upload */}
              <div className="mb-8">
                <label className="block text-xl font-bold mb-4">
                  Product Photo (optional but recommended)
                </label>
                <div className="border-4 border-dashed border-purple-300 rounded-3xl h-96 flex items-center justify-center bg-white cursor-pointer hover:border-purple-500 transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setProductPhoto(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="cursor-pointer text-center"
                  >
                    {productPhoto ? (
                      <img
                        src={productPhoto}
                        alt="Product"
                        className="max-h-96 rounded-2xl"
                      />
                    ) : (
                      <div className="text-purple-600">
                        <svg
                          className="w-24 h-24 mx-auto mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-2xl font-bold">
                          Click to upload photo
                        </p>
                        <p className="text-lg">
                          Shows fulfilling shop exactly what to make
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Product Name & Description */}
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xl font-bold mb-3">
                    Product Name (shown to recipient)
                  </label>
                  <input
                    placeholder="e.g., Dozen Red Roses in Glass Vase"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-8 py-6 text-xl border-4 rounded-2xl focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xl font-bold mb-3">
                    Short Description (helps fulfilling shop)
                  </label>
                  <textarea
                    placeholder="e.g., Long-stem Ecuadorian roses, baby’s breath, greenery"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    className="w-full px-8 py-6 text-xl border-4 rounded-2xl"
                  />
                </div>
              </div>
            </div>

            <textarea
              placeholder="Special Instructions (optional) – No lilies, hospital room 312, call first, etc."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
              className="w-full px-8 py-6 text-xl border-4 rounded-2xl"
            />
          </div>

          {/* Set Pricing */}
          {/* Pricing Section */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-3xl shadow-2xl p-10 mb-12 text-center">
            <h2 className="text-4xl font-black mb-8">Customer Pays</h2>

            <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto mb-8">
              <div>
                <label className="block text-xl opacity-90">
                  Arrangement + tax
                </label>
                <input
                  type="number"
                  value={arrangementValue}
                  onChange={(e) => setArrangementValue(Number(e.target.value))}
                  className="w-full mt-2 px-6 py-4 text-3xl font-bold text-center bg-white/20 rounded-2xl placeholder-white/60"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-xl opacity-90">Delivery fee</label>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  className="w-full mt-2 px-6 py-4 text-3xl font-bold text-center bg-white/20 rounded-2xl"
                  placeholder="20"
                />
              </div>
              <div>
                <label className="block text-xl opacity-90">
                  Your profit (fee)
                </label>
                <input
                  type="number"
                  value={originatingFee}
                  onChange={(e) => setOriginatingFee(Number(e.target.value))}
                  className="w-full mt-2 px-6 py-4 text-3xl font-bold text-center bg-white/20 rounded-2xl text-yellow-300"
                  placeholder="25"
                />
              </div>
            </div>

            <div className="text-8xl font-black mb-4">${totalCustomerPays}</div>
            <div className="text-3xl opacity-90">
              You keep{" "}
              <span className="text-yellow-300 font-black">
                ${originatingFee}
              </span>{" "}
              • Fulfilling shop gets $
              {(arrangementValue + deliveryFee).toFixed(2)}
            </div>
          </div>

          {/* Shop Picker */}
          {shops.length > 0 && (
            <div className="bg-white rounded-3xl shadow-2xl p-10">
              <h2 className="text-3xl font-black text-purple-600 mb-8">
                Choose Fulfilling Shop
              </h2>
              <div className="space-y-6">
                {shops.map((shop) => (
                  <label
                    key={shop._id}
                    className={`flex items-center justify-between p-8 border-4 rounded-3xl cursor-pointer transition-all ${
                      selectedShop?._id === shop._id
                        ? "border-emerald-600 bg-emerald-50 shadow-2xl scale-105"
                        : "border-gray-300 hover:border-purple-400"
                    }`}
                  >
                    <div>
                      <div className="text-2xl font-black">{shop.shopName}</div>
                      <div className="text-lg text-gray-600">
                        {shop.address} • {shop.city}, {shop.state}
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="shop"
                      checked={selectedShop?._id === shop._id}
                      onChange={() => setSelectedShop(shop)}
                      className="w-8 h-8 text-emerald-600"
                    />
                  </label>
                ))}
              </div>

              <button
                onClick={sendOrder}
                disabled={!selectedShop || !deliveryDate}
                className="mt-10 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-black text-4xl py-10 rounded-3xl shadow-2xl transition-all"
              >
                Send Order & Keep ${originatingFee} →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
