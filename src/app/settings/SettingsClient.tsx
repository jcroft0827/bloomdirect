"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function SettingsClient({ initialShop }: { initialShop: any }) {
  const [shop, setShop] = useState({
    ...initialShop,
    logo: initialShop.logo || "",
    featuredBouquet: initialShop.featuredBouquet || "",
    acceptsWalkIns: initialShop.acceptsWalkIns ?? false,
    weddingConsultations: initialShop.weddingConsultations ?? false,
  });
  const [passwordUpdate, setPasswordUpdate] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    const res = await fetch("/api/shops/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shop), // ← Send the whole shop object
    });

    if (res.ok) {
      toast.success("Settings saved successfully!");
      // setTimeout(() => {
      //   router.push('/dashboard')
      // }, 1000);
    } else {
      const error = await res.json();
      toast.error(error.error || "Failed to save");
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col items-center mb-12">
            <h1 className="text-5xl font-black text-center text-purple-600 mb-4">
              Shop Settings
            </h1>
            <p className="text-center text-xl text-gray-600 mb-4">
              Update how you get paid and appear in search
            </p>
            <Link
              href="/dashboard"
              className="mb-8 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-3xl text-xl shadow-xl flex items-center gap-2"
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
                  d="M15.75 19.5 8.25 12l7.5-7.5"
                />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          {/* Payment Methods */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-3xl shadow-2xl p-10 mb-12">
            <h2 className="text-3xl font-black mb-8">How shops pay you</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <label className="block text-xl opacity-90 mb-3">
                  Venmo Handle
                </label>
                <input
                  type="text"
                  value={shop.venmoHandle || ""}
                  onChange={(e) =>
                    setShop({ ...shop, venmoHandle: e.target.value })
                  }
                  placeholder="@YourShopName"
                  className="w-full px-6 py-4 text-xl rounded-xl bg-white/20 placeholder-white/60 text-white"
                />
              </div>
              <div>
                <label className="block text-xl opacity-90 mb-3">
                  Cash App Tag
                </label>
                <input
                  type="text"
                  value={shop.cashAppTag || ""}
                  onChange={(e) =>
                    setShop({ ...shop, cashAppTag: e.target.value })
                  }
                  placeholder="$YourShopName"
                  className="w-full px-6 py-4 text-xl rounded-xl bg-white/20 placeholder-white/60 text-white"
                />
              </div>
              <div>
                <label className="block text-xl opacity-90 mb-3">
                  Zelle (Phone/Email)
                </label>
                <input
                  type="text"
                  value={shop.zellePhoneOrEmail || ""}
                  onChange={(e) =>
                    setShop({ ...shop, zellePhoneOrEmail: e.target.value })
                  }
                  placeholder="555-123-4567"
                  className="w-full px-6 py-4 text-xl rounded-xl bg-white/20 placeholder-white/60 text-white"
                />
              </div>
            </div>
          </div>

          {/* Shop Info + Delivery Settings */}
          <div className="bg-white rounded-3xl shadow-2xl p-10 mb-12">
            <h2 className="text-3xl font-black text-purple-600 mb-8">
              Shop & Delivery Info
            </h2>

            <div className="space-y-10">
              {/* Shop Name & Phone */}
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-3">
                    Shop Name
                  </label>
                  <input
                    value={shop.shopName || ""}
                    onChange={(e) =>
                      setShop({ ...shop, shopName: e.target.value })
                    }
                    className="w-full px-8 py-6 text-xl border-4 rounded-2xl"
                  />
                </div>
                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-3">
                    Shop Phone (public)
                  </label>
                  <input
                    value={shop.phone || ""}
                    onChange={(e) =>
                      setShop({ ...shop, phone: e.target.value })
                    }
                    className="w-full px-8 py-6 text-xl border-4 rounded-2xl"
                  />
                </div>
              </div>

              {/* Delivery Settings */}
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-3">
                    Delivery Radius (miles)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={shop.deliveryRadius || 25}
                    onChange={(e) =>
                      setShop({
                        ...shop,
                        deliveryRadius: Number(e.target.value),
                      })
                    }
                    className="w-full px-8 py-6 text-xl border-4 rounded-2xl"
                  />
                </div>
                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-3">
                    Same-Day Cutoff Time
                  </label>
                  <select
                    value={shop.sameDayCutoff || "13:00"}
                    onChange={(e) =>
                      setShop({ ...shop, sameDayCutoff: e.target.value })
                    }
                    className="w-full px-8 py-6 text-xl border-4 rounded-2xl"
                  >
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="15:00">3:00 PM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-3">
                    Standard Delivery Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-2xl text-gray-600">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={shop.deliveryFee || 20}
                      onChange={(e) =>
                        setShop({
                          ...shop,
                          deliveryFee: Number(e.target.value),
                        })
                      }
                      className="w-full pl-16 pr-8 py-6 text-xl border-4 rounded-2xl"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xl font-bold text-gray-700 mb-3">
                  Holiday Surcharge (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-8 top-1/2 -translate-y-1/2 text-2xl text-gray-600">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={shop.holidaySurcharge || 0}
                    onChange={(e) =>
                      setShop({
                        ...shop,
                        holidaySurcharge: Number(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="w-full pl-16 pr-8 py-6 text-xl border-4 rounded-2xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Public Profile Section */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl shadow-2xl p-10 mb-12 border-4 border-purple-200">
            <h2 className="text-3xl font-black text-purple-700 mb-8">
              Public Profile (Shown in Search)
            </h2>

            <div className="grid md:grid-cols-2 gap-10">
              {/* Shop Logo / Profile Pic */}
              <div>
                <label className="block text-xl font-bold mb-4">
                  Shop Logo / Photo
                </label>
                <div
                  onClick={() =>
                    document.getElementById("logo-upload")?.click()
                  }
                  className="border-4 border-dashed border-purple-300 rounded-3xl h-64 flex flex-col items-center justify-center bg-white cursor-pointer hover:border-purple-500 transition"
                >
                  {shop.logo ? (
                    <img
                      src={shop.logo}
                      alt="Logo"
                      className="max-h-full rounded-2xl"
                    />
                  ) : (
                    <>
                      <svg
                        className="w-16 h-16 text-purple-600 mb-4"
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
                      <p className="text-2xl font-bold text-purple-600">
                        Click to upload logo
                      </p>
                      <p className="text-lg text-gray-600">
                        Square image recommended
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setShop({ ...shop, logo: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
              {/* Featured Bouquet Pic */}
              <div>
                <label className="block text-xl font-bold mb-4">
                  Featured Bouquet Photo
                </label>
                <div
                  onClick={() =>
                    document.getElementById("bouquet-upload")?.click()
                  }
                  className="border-4 border-dashed border-purple-300 rounded-3xl h-64 flex flex-col items-center justify-center bg-white cursor-pointer hover:border-purple-500 transition"
                >
                  {shop.featuredBouquet ? (
                    <img
                      src={shop.featuredBouquet}
                      alt="Bouquet"
                      className="max-h-full rounded-2xl"
                    />
                  ) : (
                    <>
                      <svg
                        className="w-16 h-16 text-purple-600 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 1013 7z"
                        />
                      </svg>
                      <p className="text-2xl font-bold text-purple-600">
                        Click to upload bouquet
                      </p>
                      <p className="text-lg text-gray-600">
                        Shown at top of your listing
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="bouquet-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setShop({
                        ...shop,
                        featuredBouquet: reader.result as string,
                      });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
            </div>

            <div className="mt-10">
              <label className="block text-xl font-bold mb-4">
                Shop Bio (2–3 sentences)
              </label>
              <textarea
                rows={4}
                value={shop.bio || ""}
                onChange={(e) => setShop({ ...shop, bio: e.target.value })}
                placeholder="Family-owned since 1985. Specializing in weddings & sympathy. Same-day delivery in Akron."
                className="w-full px-8 py-6 text-xl border-4 rounded-2xl"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-8 mt-10">
              <label className="flex items-center gap-4 text-xl">
                <input
                  type="checkbox"
                  checked={shop.acceptsWalkIns}
                  onChange={(e) =>
                    setShop({ ...shop, acceptsWalkIns: e.target.checked })
                  }
                  className="w-8 h-8 text-purple-600"
                />
                <span className="font-bold">We accept walk-ins</span>
              </label>
              <label className="flex items-center gap-4 text-xl">
                <input
                  type="checkbox"
                  checked={shop.weddingConsultations}
                  onChange={(e) =>
                    setShop({ ...shop, weddingConsultations: e.target.checked })
                  }
                  className="w-8 h-8 text-purple-600"
                />
                <span className="font-bold">
                  We offer wedding consultations
                </span>
              </label>
            </div>
          </div>

          {/* Update Password */}
          <div>
            <button
              onClick={() => {setPasswordUpdate(true)}}
              className={(passwordUpdate ? "hidden" : "block") + " bg-red-600 hover:bg-red-700 text-white font-black text-xl px-12 py-6 rounded-2xl mx-auto mb-12"}
            >
              Password Settings
            </button>
            <div
              className={(passwordUpdate ? "flex" : "hidden") + " flex-col mx-auto max-w-72 mb-12 gap-5"}
            >
              <div className="flex flex-col">
              <label>Enter Password</label>
              <div>
              <input 
                placeholder="Password..."
              />
              <button>go</button>
              </div>
              </div>
              <button
                onClick={() => {setPasswordUpdate(false)}}
                className="bg-red-600 hover:bg-red-700 text-white font-black text-lg px-10 py-2 rounded-2xl mx-auto"
              >
                cancel
              </button>
            </div>
          </div>
          <div className="bg-red-50 rounded-3xl p-10 mt-12 border-4 border-red-200 mb-12 hidden">
            <h2 className="text-3xl font-black text-red-700 mb-6">
              Change Password
            </h2>
            <div className="space-y-6">
              <input
                type="password"
                placeholder="Current password"
                className="w-full px-8 py-6 text-xl border-4 rounded-2xl"
              />
              <input
                type="password"
                placeholder="New password"
                className="w-full px-8 py-6 text-xl border-4 rounded-2xl"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full px-8 py-6 text-xl border-4 rounded-2xl"
              />
              <button className="bg-red-600 hover:bg-red-700 text-white font-black text-xl px-12 py-6 rounded-2xl">
                Update Password
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="text-center">
            <button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-3xl px-20 py-8 rounded-3xl shadow-2xl transition transform hover:scale-105"
            >
              Save All Settings
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
