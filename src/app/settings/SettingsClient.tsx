"use client";

interface Shop {
  _id: string;
  shopName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  logo?: string;
  featuredBouquet?: string;
  acceptsWalkIns?: boolean;
  weddingConsultations?: boolean;
  securityCode?: string;
  deliveryRadius?: number;
  sameDayCutoff?: string;
  deliveryFee?: number;
  holidaySurcharge?: number;
  venmoHandle?: string;
  cashAppTag?: string;
  zellePhoneOrEmail?: string;
  bio?: string;
}

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useRef } from "react";
import { signOut } from "next-auth/react";
import { set } from "mongoose";
import BloomSpinner from "@/components/BloomSpinner";
import { sign } from "crypto";

// export default function SettingsClient({ initialShop }: { initialShop: any }) {
export default function SettingsClient() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [passwordUpdate, setPasswordUpdate] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bouquetInputRef = useRef<HTMLInputElement | null>(null);

  async function getImageUrl(key: string) {
    const res = await fetch("/api/s3/view-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });

    const { viewUrl } = await res.json();
    return viewUrl;
  }

  useEffect(() => {
    async function fetchShop() {
      try {
        const res = await fetch("/api/shops/me"); // Return current shop
        if (res.ok) {
          const data = await res.json();
          setShop(data.shop);
        } else {
          toast.error("Failed to load shop settings");
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load shop settings");
      } finally {
        setLoading(false);
      }
    }
    fetchShop();
  }, []);

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  if (loading || !shop) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center">
        <BloomSpinner />
      </div>
    );
  }

  const handleSave = async () => {
    if (!shop) return;

    const allowedUpdates = {
      shopName: shop.shopName,
      phone: shop.phone,
      address: shop.address,
      city: shop.city,
      state: shop.state,
      zip: shop.zip,
      logo: shop.logo,
      featuredBouquet: shop.featuredBouquet,
      acceptsWalkIns: shop.acceptsWalkIns,
      weddingConsultations: shop.weddingConsultations,
      securityCode: shop.securityCode,
      deliveryRadius: shop.deliveryRadius,
      sameDayCutoff: shop.sameDayCutoff,
      deliveryFee: shop.deliveryFee,
      holidaySurcharge: shop.holidaySurcharge,
      venmoHandle: shop.venmoHandle,
      cashAppTag: shop.cashAppTag,
      zellePhoneOrEmail: shop.zellePhoneOrEmail,
      bio: shop.bio,
    };

    try {
      const res = await fetch("/api/shops/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(allowedUpdates),
      });

      if (res.ok) {
        const data = await res.json();
        setShop(data.shop);
        toast.success("Settings saved successfully!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save settings");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save settings");
    }
  };

  // Upload Logo
  const handleLogoUpload = async (file: File) => {
    try {
      console.log("Starting upload...");

      // 1️⃣ Request signed upload URL from backend
      const uploadRes = await fetch("/api/s3/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, fileUrl } = await uploadRes.json();

      // 2️⃣ Upload the file directly to S3
      const s3Upload = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!s3Upload.ok) {
        throw new Error("Failed to upload file to S3");
      }

      console.log("Uploaded to S3");

      // 3️⃣ Extract fileKey from fileUrl
      const fileKey = fileUrl.split(".amazonaws.com/")[1];

      // 4️⃣ Save fileKey to database
      const saveRes = await fetch("/api/shops/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: fileKey }),
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save logo to database");
      }

      console.log("Saved fileKey to DB:", fileKey);

      // 5️⃣ Get signed view URL
      const signedRes = await fetch("/api/s3/view-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: fileKey }),
      });

      const { viewUrl } = await signedRes.json();

      console.log("Got signed URL:", viewUrl);

      // 6️⃣ Update UI with signed URL
      setShop((prev) => (prev ? { ...prev, logo: viewUrl } : prev));
    } catch (err) {
      console.error("Logo upload error:", err);
    }
  };

  // Upload Featured Bouquet
  const handleBouquetUpload = async (file: File) => {
    try {
      console.log("Starting upload...");

      // 1️⃣ Request signed upload URL from backend
      const uploadRes = await fetch("/api/s3/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, fileUrl } = await uploadRes.json();

      // 2️⃣ Upload the file directly to S3
      const s3Upload = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!s3Upload.ok) {
        throw new Error("Failed to upload file to S3");
      }

      console.log("Uploaded to S3");

      // 3️⃣ Extract fileKey from fileUrl
      const fileKey = fileUrl.split(".amazonaws.com/")[1];

      // 4️⃣ Save fileKey to database
      const saveRes = await fetch("/api/shops/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featuredBouquet: fileKey }),
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save logo to database");
      }

      console.log("Saved fileKey to DB:", fileKey);

      // 5️⃣ Get signed view URL
      const signedRes = await fetch("/api/s3/view-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: fileKey }),
      });

      const { viewUrl } = await signedRes.json();

      console.log("Got signed URL:", viewUrl);

      // 6️⃣ Update UI with signed URL
      setShop((prev) => (prev ? { ...prev, featuredBouquet: viewUrl } : prev));
    } catch (err) {
      console.error("Logo upload error:", err);
    }
  };

  // const [shop, setShop] = useState({
  //   ...initialShop,
  //   logo: initialShop.logo || "",
  //   featuredBouquet: initialShop.featuredBouquet || "",
  //   acceptsWalkIns: initialShop.acceptsWalkIns ?? false,
  //   weddingConsultations: initialShop.weddingConsultations ?? false,
  //   securityCode: initialShop.securityCode || "",
  // });
  // const [passwordUpdate, setPasswordUpdate] = useState(false);
  // const [currentPassword, setCurrentPassword] = useState("");
  // const [newPassword, setNewPassword] = useState("");
  // const [confirmPassword, setConfirmPassword] = useState("");

  // const [newEmail, setNewEmail] = useState("");
  // const [emailPassword, setEmailPassword] = useState("");

  // useEffect(() => {
  //   setShop({
  //     ...initialShop,
  //     logo: initialShop.logo || "",
  //     featuredBouquet: initialShop.featuredBouquet || "",
  //     acceptsWalkIns: initialShop.acceptsWalkIns ?? false,
  //     weddingConsultations: initialShop.weddingConsultations ?? false,
  //     securityCode: initialShop.securityCode || "",
  //   });
  // }, [initialShop]);

  // const router = useRouter();
  // const logoInputRef = useRef<HTMLInputElement>(null);
  // const bouquetInputRef = useRef<HTMLInputElement>(null);

  // const handleSave = async () => {
  //   const res = await fetch("/api/shops/update", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(shop), // ← Send the whole shop object
  //   });

  //   if (res.ok) {
  //     const data = await res.json();
  //     setShop(data.shop);
  //     toast.success("Settings saved successfully!");
  //   } else {
  //     const error = await res.json();
  //     toast.error(error.error || "Failed to save");
  //   }
  // };

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
                    setShop((prev) =>
                      prev ? { ...prev, venmoHandle: e.target.value } : prev,
                    )
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
                    setShop((prev) =>
                      prev ? { ...prev, cashAppTag: e.target.value } : prev,
                    )
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
                    setShop((prev) =>
                      prev
                        ? { ...prev, zellePhoneOrEmail: e.target.value }
                        : prev,
                    )
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
                      setShop((prev) =>
                        prev ? { ...prev, shopName: e.target.value } : prev,
                      )
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
                      setShop((prev) =>
                        prev ? { ...prev, phone: e.target.value } : prev,
                      )
                    }
                    className="w-full px-8 py-6 text-xl border-4 rounded-2xl"
                  />
                </div>
              </div>

              {/* Delivery Settings */}
              <div className="grid md:grid-cols-3 gap-8">
                {/* Delivery Radius (Miles) */}
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
                      setShop((prev) =>
                        prev
                          ? { ...prev, deliveryRadius: Number(e.target.value) }
                          : prev,
                      )
                    }
                    className="w-full px-8 py-6 text-xl border-4 rounded-2xl"
                  />
                </div>
                {/* Same-Day Cutoff Time */}
                <div>
                  <label className="block text-xl font-bold text-gray-700 mb-3">
                    Same-Day Cutoff Time
                  </label>
                  <select
                    value={shop.sameDayCutoff || "13:00"}
                    onChange={(e) =>
                      setShop((prev) =>
                        prev
                          ? { ...prev, sameDayCutoff: e.target.value }
                          : prev,
                      )
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
                {/* Delivery Fee */}
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
                        setShop((prev) =>
                          prev
                            ? { ...prev, deliveryFee: Number(e.target.value) }
                            : prev,
                        )
                      }
                      className="w-full pl-16 pr-8 py-6 text-xl border-4 rounded-2xl"
                    />
                  </div>
                </div>
              </div>

              {/* Holiday Surcharge */}
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
                      setShop((prev) =>
                        prev
                          ? {
                              ...prev,
                              holidaySurcharge: Number(e.target.value),
                            }
                          : prev,
                      )
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
                  onClick={() => logoInputRef.current?.click()}
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
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleLogoUpload(file);
                    }
                  }}
                />
              </div>

              {/* Featured Bouquet Pic */}
              <div>
                <label className="block text-xl font-bold mb-4">
                  Featured Bouquet Photo
                </label>
                <div
                  onClick={() => bouquetInputRef.current?.click()}
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
                  ref={bouquetInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleBouquetUpload(file);
                    }
                  }}
                />
              </div>
            </div>

            {/* Shop Bio */}
            <div className="mt-10">
              <label className="block text-xl font-bold mb-4">
                Shop Bio (2–3 sentences)
              </label>
              <textarea
                rows={4}
                value={shop.bio || ""}
                onChange={(e) =>
                  setShop((prev) =>
                    prev ? { ...prev, bio: e.target.value } : prev,
                  )
                }
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
                    setShop((prev) =>
                      prev
                        ? { ...prev, acceptsWalkIns: e.target.checked }
                        : prev,
                    )
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
                    setShop((prev) =>
                      prev
                        ? { ...prev, weddingConsultations: e.target.checked }
                        : prev,
                    )
                  }
                  className="w-8 h-8 text-purple-600"
                />
                <span className="font-bold">
                  We offer wedding consultations
                </span>
              </label>
            </div>
          </div>

          {/* Email History */}
          <div className="flex flex-col gap-4 mb-12 items-center justify-center bg-gradient-to-br from-blue-100 to-white rounded-3xl shadow-xl p-10 text-center">
            <p className="font-semibold text-2xl text-gray-900 flex gap-2 items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
              Email History
            </p>

            <p className="text-gray-600 max-w-md">
              View all emails sent from your shop, including invites and system
              notifications.
            </p>

            <Link
              href="/email-history"
              className="mt-4 inline-flex items-center justify-center bg-purple-600 hover:bg-purple-700 transition-colors text-white font-semibold text-lg px-10 py-4 rounded-2xl shadow-md"
            >
              View Email History
            </Link>
          </div>

          {/* Security Code -- BETA FEATURE-Replace with secure forgot password email link later */}
          <div className="flex flex-col mb-12 items-center justify-center gap-8 bg-gradient-to-br from-white to-blue-200 rounded-3xl shadow-2xl p-10 md:flex-row md:gap-12">
            <p className="font-semibold text-2xl text-gray-900 flex gap-2 items-center justify-center">
              Security Code
            </p>
            <input
              value={shop.securityCode || ""}
              onChange={(e) =>
                setShop((prev) =>
                  prev ? { ...prev, securityCode: e.target.value } : prev,
                )
              }
              placeholder="security code"
              className="w-full px-8 py-6 text-xl border-4 rounded-2xl"
            />
          </div>

          {/* Update Login Information */}
          <div className="flex flex-col mb-12 items-center justify-center gap-8 bg-gradient-to-br from-white to-blue-200 rounded-3xl shadow-2xl p-10 md:flex-row md:gap-12">
            {/* Update Password */}
            <div className="text-center">
              {!showPasswordForm ? (
                <button
                  onClick={() => {
                    setShowEmailForm(false);
                    setShowPasswordForm(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-black text-xl px-12 py-6 rounded-2xl"
                >
                  Change Password
                </button>
              ) : (
                <div className="max-w-md mx-auto bg-red-50 border-4 border-red-200 rounded-3xl p-8 space-y-6">
                  <h2 className="text-2xl font-black text-red-700">
                    Change Password
                  </h2>

                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-6 py-4 text-lg border-4 rounded-xl"
                  />

                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-6 py-4 text-lg border-4 rounded-xl"
                  />

                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-6 py-4 text-lg border-4 rounded-xl"
                  />

                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={async () => {
                        if (newPassword !== confirmPassword) {
                          toast.error("Passwords do not match");
                          return;
                        }

                        const res = await fetch("/api/auth/update-password", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            currentPassword,
                            newPassword,
                          }),
                        });

                        if (res.ok) {
                          toast.success("Password updated.");
                          setShowPasswordForm(false);
                          setTimeout(() => {
                            signOut({ callbackUrl: "/login" });
                          }, 1000);
                        } else {
                          const err = await res.json();
                          toast.error(err.error);
                        }
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl"
                    >
                      Update
                    </button>

                    <button
                      onClick={() => setShowPasswordForm(false)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold px-6 py-3 rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Update Email */}
            {/* <div className="text-center">
              {!showEmailForm ? (
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setShowEmailForm(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xl px-12 py-6 rounded-2xl"
                >
                  Change Email Address
                </button>
              ) : (
                <div className="max-w-md mx-auto bg-blue-50 border-4 border-blue-200 rounded-3xl p-8 space-y-6">
                  <h2 className="text-2xl font-black text-blue-700">
                    Change Email
                    <br /> <span className="text-sm">(Requires Re-login)</span>
                  </h2>

                  <label className="flex flex-col text-start text-lg font-bold mb-2">
                    Current Email
                    <input
                      type="email"
                      value={initialShop.email}
                      disabled
                      className="w-full px-6 py-4 text-lg border-4 rounded-xl bg-gray-100 text-gray-700"
                    />
                  </label>

                  <input
                    type="email"
                    placeholder="New email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-6 py-4 text-lg border-4 rounded-xl"
                  />

                  <input
                    type="password"
                    placeholder="Confirm with password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="w-full px-6 py-4 text-lg border-4 rounded-xl"
                  />

                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={async () => {
                        const res = await fetch("/api/auth/change-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            newEmail,
                            password: emailPassword,
                          }),
                        });

                        if (res.ok) {
                          toast.success("Email updated. Please log in again.");
                          setTimeout(() => {
                            signOut({ callbackUrl: "/login" });
                          }, 1000);
                        } else {
                          const err = await res.json();
                          toast.error(err.error);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl"
                    >
                      Update
                    </button>

                    <button
                      onClick={() => setShowEmailForm(false)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold px-6 py-3 rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div> */}
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
