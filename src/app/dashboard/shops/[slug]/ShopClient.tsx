// This is the client component for the shop page. It receives the shop data as a prop and renders the UI accordingly. The design is inspired by Instagram's profile layout, with a focus on showcasing the florist's brand, featured arrangement, and delivery details in a clean and engaging way.

"use client";

import StarRating from "@/components/ui/StarRating";
import {
  CheckBadgeIcon,
  MapPinIcon,
  ClockIcon,
  GlobeAltIcon,
  BuildingStorefrontIcon,
  XMarkIcon,
  StarIcon,
} from "@heroicons/react/24/solid";
import { StarIcon as OutlineStarIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppButton from "@/components/ui/AppButton";
import AppModal from "@/components/ui/AppModal";
import toast from "react-hot-toast";

export default function ShopClient({
  shop,
  offerings = [],
}: {
  shop: any;
  offerings?: any[];
}) {
  const [loggedInShop, setLoggedInShop] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [offeringModal, setOfferingModal] = useState(false);
  const [isLoadingLoggedInShop, setIsLoadingLoggedInShop] = useState(true);

  const activeOfferings = offerings
    .filter((offering: any) => offering.isActive)
    .sort((a: any, b: any) => {
      if (a.isDesignerChoice && !b.isDesignerChoice) return -1;
      if (!a.isDesignerChoice && b.isDesignerChoice) return 1;

      const sortOrderDifference = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);

      if (sortOrderDifference !== 0) {
        return sortOrderDifference;
      }

      return String(a.name || "").localeCompare(String(b.name || ""));
    });

  // Pull logged in shop data
  useEffect(() => {
    async function loadShop() {
      try {
        const res = await fetch("/api/shops/me");

        if (!res.ok) {
          return;
        }

        const data = await res.json();

        setLoggedInShop(data.shop);

        const alreadyFavorited =
          data.shop?.preferredFlorists?.some((favorite: any) => {
            const favoriteShopId =
              favorite?.shopId?._id || favorite?.shopId || favorite;

            return String(favoriteShopId) === String(shop?._id);
          }) ?? false;

        setIsFavorite(alreadyFavorited);
      } catch (err) {
        console.error("Failed to load shop data", err);
      }
    }

    loadShop();
  }, [shop?._id]);

  const router = useRouter();

  const saveReview = async () => {
    try {
      const res = await fetch(`/api/shops/${shop._id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          comment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to submit review.");
        return;
      }

      setIsSubmittingReview(false);
      setRating(0);
      setComment("");

      router.refresh();
    } catch (err) {
      console.error("Failed to submit review:", err);
      toast.error("Something went wrong submitting the review.");
    }
  };

  const toggleFavorite = async () => {
    if (!loggedInShop) {
      return;
    }

    if (!loggedInShop.isPro) {
      toast("Favorite Florists is available with Bloom Pro.");
      return;
    }

    try {
      setIsUpdatingFavorite(true);

      const res = await fetch(`/api/shops/${shop._id}/favorite`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Unable to update favorite florist.");
        return;
      }

      setIsFavorite(data.isFavorite);
    } catch (error) {
      console.error("Failed to update favorite florist:", error);

      toast.error("Something went wrong updating this favorite.");
    } finally {
      setIsUpdatingFavorite(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-20">
      {/* 1. Banner */}
      <div className="h-32 bg-gradient-to-r from-purple-700 via-purple-600 to-purple-400 w-full rounded-t-lg shadow-lg" />

      <div className="max-w-5xl mx-auto px-4">
        {/* 2. PROFILE HEADER (The Instagram Look) */}
        <div className="relative -mt-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-8 border-b border-slate-100">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            {/* Logo */}
            <div className="h-32 w-32 rounded-2xl bg-white p-1 shadow-xl border border-slate-100">
              <img
                src={shop?.branding?.logo || "/placeholder-logo.png"}
                className="h-full w-full object-cover rounded-xl"
                alt="Shop Logo"
              />
            </div>

            {/* Title & Stats */}
            <div
              className={
                (shop?.isPro && loggedInShop?._id === shop?._id
                  ? "md:mt-12 xl:mt-0"
                  : "md:mt-0") + " mb-2"
              }
            >
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight">
                  {shop?.businessName}
                </h1>

                {shop?.verifiedFlorist && (
                  <CheckBadgeIcon className="h-7 w-7 text-purple-600" />
                )}

                {shop?.isPro && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-gradient-to-r from-amber-100 to-yellow-100 px-3 py-1 text-xs font-bold text-amber-700">
                    <StarIcon className="h-4 w-4" />
                    Bloom Pro
                  </span>
                )}
              </div>

              {loggedInShop?._id && loggedInShop._id !== shop?._id && (
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={toggleFavorite}
                    disabled={isUpdatingFavorite}
                    className={[
                      "inline-flex items-center gap-2 rounded-full",
                      "border px-3 py-1.5 text-sm font-semibold",
                      "transition-all disabled:cursor-not-allowed",
                      "disabled:opacity-60",
                      isFavorite
                        ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-600",
                    ].join(" ")}
                  >
                    {isFavorite ? (
                      <StarIcon className="h-5 w-5 text-amber-500" />
                    ) : (
                      <OutlineStarIcon className="h-5 w-5" />
                    )}

                    {isUpdatingFavorite
                      ? "Updating..."
                      : isFavorite
                        ? "Favorited"
                        : "Add to Favorites"}
                  </button>
                </div>
              )}

              {/* Stats */}
              {shop?.isPro && loggedInShop?._id === shop?._id && (
                <div className="flex gap-6 mt-3">
                  {/* Orders Completed */}
                  <div className="text-sm">
                    <span className="font-bold text-slate-900">
                      {shop.stats?.ordersCompleted || 0}
                    </span>

                    <span className="text-slate-500 ml-1">
                      Orders Completed
                    </span>
                  </div>
                  {/* Response Rate */}
                  <div className="text-sm">
                    <span className="font-bold text-slate-900">
                      {shop.stats?.responseRate || 100}%
                    </span>

                    <span className="text-slate-500 ml-1">Response Rate</span>
                  </div>
                  {/* Orders Sent */}
                  <div className="text-sm">
                    <span className="font-bold text-slate-900">
                      {shop.stats?.ordersSent || 0}
                    </span>

                    <span className="text-slate-500 ml-1">Orders Sent</span>
                  </div>
                  {/* Orders Declined */}
                  <div className="text-sm">
                    <span className="font-bold text-slate-900">
                      {shop.stats?.orderDeclined || 0}
                    </span>

                    <span className="text-slate-500 ml-1">Orders Declined</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {loggedInShop?._id != shop?._id ? (
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
                className="px-6 py-2.5 bg-white border-2 border-purple-600 text-purple-600 rounded-full font-bold hover:bg-purple-50 transition-colors md:text-center"
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
                  `Professional florist serving ${shop?.address?.city} with custom, seasonal arrangements.`}
              </p>
            </section>

            {!isLoadingLoggedInShop &&
              (loggedInShop?._id === shop?._id ? (
                <div className="w-full flex justify-center">
                  <Link
                    href="/dashboard/offerings"
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-center px-4 py-2 font-bold text-xl shadow-xl w-full transition-all"
                  >
                    Edit Offerings
                  </Link>
                </div>
              ) : (
                <div className="w-full flex justify-center">
                  {activeOfferings.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setOfferingModal(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-center px-4 py-2 font-bold text-xl shadow-xl w-full transition-all"
                    >
                      View Offerings
                    </button>
                  )}
                </div>
              ))}

            {/* Review Section */}
            <section className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
              <div className="w-full flex items-start justify-between pr-5">
                <h3 className="text-sm uppercase tracking-widest font-bold text-slate-400 mb-4">
                  Florist Reviews
                </h3>
              </div>
              {loggedInShop?._id != shop._id ? (
                <div>
                  {shop.reviews.length > 0 ? (
                    <div className="space-y-6">
                      {shop.reviews.map((r: any) => (
                        <div
                          key={r._id}
                          className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            {/* <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                              {r.shopName}
                            </div> */}
                            <div>
                              {r.source === "order" && (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 mb-2">
                                  Verified Order
                                </span>
                              )}
                              <p className="font-bold text-slate-900">
                                {r.reviewerShopName}
                              </p>
                              <div className="flex items-center gap-1 text-sm text-yellow-400">
                                {Array.from({ length: r.rating }).map(
                                  (_, i) => (
                                    <StarIcon key={i} className="h-4 w-4" />
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-slate-700">{r.comment}</p>
                          <p className="text-slate-500 text-sm mt-2">
                            {new Date(r.date).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
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
                    {loggedInShop?._id && loggedInShop?._id !== shop._id && (
                      <button
                        className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold transition-colors"
                        onClick={() => setIsSubmittingReview(true)}
                      >
                        Write a Review
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  {shop.reviews.length > 0 ? (
                    <div className="space-y-6">
                      {shop.reviews.map((r: any) => (
                        <div
                          key={r._id}
                          className="bg-white rounded-xl p-4 shadow-sm border border-slate-100"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            {/* <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                              {r.shopName}
                            </div> */}
                            <div>
                              {r.source === "order" && (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 mb-2">
                                  Verified Order
                                </span>
                              )}
                              <p className="font-bold text-slate-900">
                                {r.reviewerShopName}
                              </p>
                              <div className="flex items-center gap-1 text-sm text-yellow-400">
                                {Array.from({ length: r.rating }).map(
                                  (_, i) => (
                                    <StarIcon key={i} className="h-4 w-4" />
                                  ),
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-slate-700">{r.comment}</p>
                          <p className="text-slate-500 text-sm mt-2">
                            {new Date(r.date).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">
                      No reviews yet. Complete orders to receive reviews from
                      other florists!
                    </p>
                  )}
                </div>
              )}
            </section>
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

                <div className="flex justify-between items-center text-sm gap-1">
                  <span className="text-slate-500">Email</span>
                  <span className="font-bold text-emerald-700">
                    {shop.email}
                  </span>
                </div>

                {/* Optional Secondary Contact Info */}
                {shop.contact.secondaryEmail && (
                  <div className="flex justify-between items-center text-sm gap-1">
                    <span className="text-slate-500">Secondary Email</span>
                    <span className="font-bold text-emerald-700">
                      {shop.contact.secondaryEmail}
                    </span>
                  </div>
                )}

                {shop.contact.whatsApp && (
                  <div className="flex justify-between items-center text-sm gap-1">
                    <span className="text-slate-500">WhatsApp</span>
                    <span className="font-bold text-emerald-700">
                      {shop.contact.whatsApp}
                    </span>
                  </div>
                )}

                {shop.contact.website && (
                  <div className="flex justify-between items-center text-sm gap-1">
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
                    {shop.delivery.allowSameDay ? (
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

                {shop.delivery.allowSameDay && (
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

      {/* Offerings Modal */}
      <AppModal
        open={offeringModal}
        title={`${shop.businessName}'s Fulfillment Offerings`}
        description={`Review the active fulfillment options available from ${shop.businessName}.`}
        onClose={() => setOfferingModal(false)}
        maxWidth="lg"
        footer={
          <AppButton
            type="button"
            variant="outline"
            fullWidth
            onClick={() => setOfferingModal(false)}
          >
            Close
          </AppButton>
        }
      >
        {activeOfferings.length > 0 ? (
          <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
            {activeOfferings.map((offering: any) => (
              <div
                key={offering._id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row"
              >
                {/* Offering Image */}
                <div className="h-48 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-32 sm:w-32">
                  <img
                    src={offering.image || "/placeholder-logo.png"}
                    alt={offering.name || "Fulfillment offering"}
                    className="h-full w-full object-contain"
                  />
                </div>

                {/* Offering Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {offering.name}
                    </h3>

                    {offering.isDesignerChoice && (
                      <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
                        Designer&apos;s Choice
                      </span>
                    )}
                  </div>

                  {offering.description && (
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {offering.description}
                    </p>
                  )}

                  {offering.pricingTiers?.length > 0 ? (
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {offering.pricingTiers.map(
                        (tier: any, tierIndex: number) => (
                          <div
                            key={`${offering._id}-${tier.label}-${tierIndex}`}
                            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 border border-slate-100"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">
                                {tier.label}
                              </p>

                              {tier.description && (
                                <p className="text-xs text-slate-500">
                                  {tier.description}
                                </p>
                              )}
                            </div>

                            <p className="shrink-0 font-bold text-purple-700">
                              ${Number(tier.price || 0).toFixed(2)}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm italic text-slate-500">
                      Contact this florist for pricing.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-600">
            This florist does not currently have any active fulfillment
            offerings.
          </div>
        )}
      </AppModal>
    </div>
  );
}
