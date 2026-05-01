// This is the client component for the shop page. It receives the shop data as a prop and renders the UI accordingly. The design is inspired by Instagram's profile layout, with a focus on showcasing the florist's brand, featured bouquet, and delivery details in a clean and engaging way.

"use client";

import StarRating from "@/components/ui/StarRating";
import {
  CheckBadgeIcon,
  MapPinIcon,
  ClockIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  BuildingStorefrontIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ShopClient({ shop }: { shop: any }) {
  const [loggedInShop, setLoggedInShop] = useState(null);
  const [loggedInShopName, setLoggedInShopName] = useState(null);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [rating, setRating] = useState(0);

  // Pull logged in shop data
  useEffect(() => {
    async function loadShop() {
      try {
        const res = await fetch("/api/shops/me");
        const data = await res.json();

        setLoggedInShop(data.shop._id);
        setLoggedInShopName(data.shop.businessName);
      } catch (err) {
        console.error("Failed to load shop data", err);
      }
    }
    loadShop();
  }, []);

  const router = useRouter();

  const saveReview = async () => {
    try {
      const res = await fetch(`/api/shops/${shop._id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shopName: loggedInShopName,
          rating,
          comment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to submit review.");
        return;
      }

      setIsSubmittingReview(false);
      setRating(0);
      setComment("");

      router.refresh();
    } catch (err) {
      console.error("Failed to submit review:", err);
      alert("Something went wrong submitting the review.");
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20">
      {/* 1. TOP NAV / COVER AREA */}
      <div className="h-32 bg-gradient-to-r from-purple-700 via-purple-600 to-purple-400 w-full rounded-t-lg shadow-lg" />

      <div className="max-w-5xl mx-auto px-4">
        {/* 2. PROFILE HEADER (The Instagram Look) */}
        <div className="relative -mt-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-8 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            {/* Logo */}
            <div className="h-32 w-32 rounded-2xl bg-white p-1 shadow-xl border border-slate-100">
              <img
                src={shop.branding?.logo || "/placeholder-logo.png"}
                className="h-full w-full object-cover rounded-xl"
                alt="Shop Logo"
              />
            </div>

            {/* Title & Stats */}
            <div className="mb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">
                  {shop.businessName}
                </h1>
                {shop.verifiedFlorist && (
                  <CheckBadgeIcon className="h-7 w-7 text-purple-600" />
                )}
              </div>
              <div className="flex gap-6 mt-3">
                <div className="text-sm">
                  <span className="font-bold text-slate-900">
                    {shop.stats?.ordersCompleted || 0}
                  </span>
                  <span className="text-slate-500 ml-1">Orders Completed</span>
                </div>
                <div className="text-sm">
                  <span className="font-bold text-slate-900">
                    {shop.stats?.responseRate || 100}%
                  </span>
                  <span className="text-slate-500 ml-1">Response Rate</span>
                </div>
                <div className="text-sm">
                  <span className="font-bold text-slate-900">
                    {shop.stats?.ordersSent || 0}
                  </span>
                  <span className="text-slate-500 ml-1">Orders Sent</span>
                </div>
                <div className="text-sm">
                  <span className="font-bold text-slate-900">
                    {shop.stats?.orderDeclined || 0}
                  </span>
                  <span className="text-slate-500 ml-1">Orders Declined</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {loggedInShop != shop._id ? (
            <div className="flex gap-3 mb-2">
              {/* <button className="flex-1 md:flex-none px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-bold transition-all shadow-md shadow-purple-200">
                Send Flowers
              </button> */}
              {/* <button className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold transition-all">
                Message
              </button> */}
            </div>
          ) : (
            <div className="flex gap-3 mb-2">
              <Link
                href={`/dashboard/settings`}
                className="px-6 py-2.5 bg-white border-2 border-purple-600 text-purple-600 rounded-full font-bold hover:bg-purple-50 transition-colors"
              >
                Edit Shop Details
              </Link>
            </div>
          )}
        </div>

        {/* 3. THE "DIRECT" DASHBOARD (Quick Info) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10">
          {/* Left Side: Story & Contact */}
          <div className="md:col-span-2 space-y-10">
            <section>
              <div className="w-full flex items-start justify-between pr-5">
                <h3 className="text-sm uppercase tracking-widest font-bold text-slate-400 mb-4">
                  About {shop.businessName}
                </h3>
              </div>
              <p className="text-lg leading-relaxed text-slate-700">
                {shop.branding?.bio ||
                  `Professional florist serving ${shop.address.city} with custom, seasonal arrangements.`}
              </p>
            </section>

            {/* Featured Bouquet Card */}
            <section className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/2 aspect-square rounded-2xl overflow-hidden shadow-lg p-2">
                  <img
                    src={shop.featuredBouquet.image}
                    className="w-full h-full object-center object-fill rounded-xl"
                    alt="Featured"
                  />
                </div>
                <div className="w-full md:w-1/2 flex flex-col justify-center">
                  <span className="text-emerald-600 font-bold text-sm uppercase tracking-tighter mb-2">
                    Featured Selection
                  </span>
                  <h2 className="text-2xl font-bold mb-2">
                    {shop.featuredBouquet.name}
                  </h2>
                  <p className="text-slate-600 mb-6">
                    {shop.featuredBouquet.description}
                  </p>
                  <div className="text-3xl font-black text-purple-700 mb-6">
                    ${shop.featuredBouquet.price.toFixed(2)}
                  </div>
                  {/* <button className="w-full bg-white border-2 border-purple-600 text-purple-600 py-3 rounded-xl font-bold hover:bg-purple-50 transition-colors">
                    Order This Arrangement
                  </button> */}
                </div>
              </div>
            </section>

            {/* Review Section */}
            {/* <section className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
              <div className="w-full flex items-start justify-between pr-5">
                <h3 className="text-sm uppercase tracking-widest font-bold text-slate-400 mb-4">
                  Customer Reviews
                </h3>
              </div>
              {shop.reviews.length > 0 ? (
                <div className="space-y-6">
                  {shop.reviews.map((r: any) => (
                    <div
                      key={r._id}
                      className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                          {r.shopName}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {r.shopName}
                          </p>
                          <div className="flex items-center gap-1 text-sm text-emerald-600">
                            {Array.from({ length: r.rating }).map((_, i) => (
                              <CheckBadgeIcon key={i} className="h-4 w-4" />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-slate-700">{r.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">
                  No reviews yet. Be the first to leave feedback!
                </p>
              )}

              <div className="mt-6 border-t border-slate-100 pt-6">
                {isSubmittingReview && (
                  <div className="text-center text-sm text-slate-500">
                    <div>
                      <StarRating value={rating} onChange={setRating} />
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full mt-2 p-2 border border-slate-300 rounded-md"
                        placeholder="Write your review here..."
                      />
                    </div>
                    <div>
                      <button
                        className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-bold transition-colors"
                        onClick={async () => {
                          saveReview();
                        }}
                      >
                        Submit Review
                      </button>
                      <button
                        className="mt-2 ml-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold transition-colors"
                        onClick={() => setIsSubmittingReview(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <button
                  className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold transition-colors"
                  onClick={() => setIsSubmittingReview(true)}
                >
                  Write a Review
                </button>
              </div>
            </section> */}
          </div>

          {/* Right Side: Delivery & Logistics (Everything the user needs) */}
          <aside className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <BuildingStorefrontIcon className="h-5 w-5 text-emerald-600" />
                Shop Details
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Location</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <MapPinIcon className="h-4 w-4" /> {shop.address.city},{" "}
                    {shop.address.state}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Phone</span>
                  <span className="font-bold text-emerald-700">
                    {shop.contact.phone}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Email</span>
                  <span className="font-bold text-emerald-700">
                    {shop.email}
                  </span>
                </div>

                {/* Optional Secondary Contact Info */}
                {shop.contact.secondaryEmail && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Secondary Email</span>
                    <span className="font-bold text-emerald-700">
                      {shop.contact.secondaryEmail}
                    </span>
                  </div>
                )}

                {shop.contact.whatsApp && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">WhatsApp</span>
                    <span className="font-bold text-emerald-700">
                      {shop.contact.whatsApp}
                    </span>
                  </div>
                )}

                {shop.contact.website && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Website</span>
                    <a
                      href={
                        shop.contact.website.startsWith("http")
                          ? shop.contact.website
                          : `https://${shop.contact.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-emerald-700"
                    >
                      {shop.contact.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-emerald-600" />
                Delivery Details
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">
                    Allows Same Day Delivery
                  </span>
                  <span className="font-bold text-emerald-700">
                    {shop.delivery.allowsSameDay ? (
                      <span className="flex items-center gap-1">
                        <CheckBadgeIcon className="h-4 w-4 text-green-500" />{" "}
                        Yes
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500">
                        <XMarkIcon className="h-4 w-4" /> No
                      </span>
                    )}
                  </span>
                </div>
                {shop.delivery.allowsSameDay && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Same Day Cutoff</span>
                    <span className="font-bold text-purple-700 flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />{" "}
                      {shop.delivery.sameDayCutoff}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Minimum Product Total</span>
                  <span className="font-bold text-emerald-700">
                    ${shop.delivery.minProductTotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Delivery Fallback Fee</span>
                  <span className="font-bold text-emerald-700">
                    ${shop.delivery.fallbackFee.toFixed(2)}
                  </span>
                </div>

                {shop.delivery.method === "zip" ? (
                  <div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Delivery Method</span>
                      <span className="font-bold text-emerald-700">
                        {shop.delivery.method === "zip"
                          ? "Zip Code Based"
                          : "Standard"}
                      </span>
                    </div>
                    <div className="pt-4 border-t border-slate-50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                        Serving Zip Codes
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {shop.delivery.zipZones.map((z: any) => (
                          <span
                            key={z.zip}
                            className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-md border border-purple-100"
                          >
                            {z.zip}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Delivery Method</span>
                    <span className="font-bold text-emerald-700">
                      {shop.delivery.method === "distance"
                        ? "Distance Based"
                        : "Standard"}
                    </span>
                  </div>
                )}

                <div
                  className={
                    (shop.delivery.blackoutDates.length > 0
                      ? "flex-col"
                      : "flex-row") +
                    " flex justify-between items-center text-sm"
                  }
                >
                  <span className="text-slate-500">Blackout Dates</span>
                  <span className="font-bold text-emerald-700">
                    {shop.delivery.blackoutDates.length > 0
                      ? shop.delivery.blackoutDates
                          .map((d: string) => new Date(d).toLocaleDateString())
                          .join(", ")
                      : "None"}
                  </span>
                </div>
              </div>
            </div>

            {/* Verification Footer */}
            {shop.isVerified && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                <div className="text-emerald-700 font-bold text-sm flex items-center justify-center gap-2">
                  <GlobeAltIcon className="h-5 w-5" /> Verified Local Florist
                </div>
                <p className="text-[11px] text-emerald-600/70 mt-1">
                  This florist is a verified member of the GetBloomDirect
                  Network.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
