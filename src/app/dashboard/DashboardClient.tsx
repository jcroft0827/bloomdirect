// /app/dashboard/DashboardClient.tsx

"use client";

import React, { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import BloomSpinner from "@/components/BloomSpinner";
import { useRouter } from "next/navigation";
import { sendInvite as sendInviteRequest } from "@/lib/client/sendInvite";
import VerificationProgressBar from "@/components/verification/ProgressBar";

type DashboardReportPeriod = "month" | "year" | "all";

// #region Shop
interface DashboardReportSummary {
  period: DashboardReportPeriod;
  ordersReceived: number;
  fulfillmentValueCents: number;
  averageFulfillmentOrderCents: number;
}

interface MonthlySendUsage {
  isPro: boolean;
  sentThisMonth: number;
  limit: number | null;
  remaining: number | null;
  allowed: boolean;
  monthStart: string;
  nextMonthStart: string;
}

interface Stripe {
  status?: string;
  planId?: string;
  cancelAtPeriodEnd?: boolean;
  trialEndsAt?: Date;
}

interface ZipZone {
  name: string;
  zip: string;
  fee: number;
}

interface DistanceZone {
  min: number;
  max: number;
  fee: number;
}

interface BlackoutDate {
  date: Date;
}

interface BlackoutTime {
  start: string;
  end: string;
}

interface Reviews {
  customerName?: string;
  rating?: number;
  comment?: string;
  date?: Date;
}

interface Delivery {
  deliveryMethod: string;
  zipZones?: ZipZone[];
  distanceZones?: DistanceZone[];
  fallbackFee: number;
  maxRadius: number;
  minProductTotal: number;
  sameDayCutoff: string;
  holidaySurcharge: number;
  blackoutDates?: BlackoutDate[];
  blackoutTimes?: BlackoutTime[];
  noMoreOrdersToday: boolean;
  allowSameDay: boolean;
}

interface Stats {
  ordersSent: number;
  ordersCompleted: number;
  ordersDeclined: number;
  ordersReceived: number;
  responseRate?: number;
  avgResponseTimeMinutes?: number;
}

interface Contact {
  phone?: string;
  whatsapp?: string;
  emailSecondary?: string;
  website?: string;
}

interface Geo {
  type: string;
  coordinates: number[];
}

interface PaymentMethods {
  venmoHandle?: string;
  cashAppTag?: string;
  zellePhoneOrEmail?: string;
  paypalEmail?: string;
  defaultPaymentMethod?: string;
}

interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  timezone: string;
  geoLocation: Geo;
}

interface Verification {
  emailVerified: boolean;
  phoneVerified: boolean;
  websiteVerified: boolean;
}

interface PricingTier {
  label: string;
  price: number;
  description?: string;
}

interface FeaturedArrangement {
  name?: string;
  description?: string;
  image?: string;
  pricingTiers?: PricingTier[];
}

interface Shop {
  id: string;
  businessName: string;
  email: string;
  role: string;
  isVerified: boolean;
  verifiedFlorist: boolean;
  verification: Verification;
  isSuspended: boolean;
  suspensionReason?: string;
  isPublic: boolean;
  reviews: Reviews[];
  onboardingComplete: boolean;
  networkJoinDate: Date;
  isPro: boolean;
  proSince: Date;
  lastLogin: Date;
  lastActivity: Date;
  contact: Contact;
  address: Address;
  paymentMethods: PaymentMethods;
  stripe: Stripe;
  delivery: Delivery;
  stats: Stats;
  featuredArrangement?: FeaturedArrangement;
}

// #endregion

export default function DashboardClient() {
  const { data: session, status } = useSession();

  // ------------------------------
  // Local state (your preferred style)
  // ------------------------------
  const [shop, setShop] = useState<Shop | null>(null);
  const [shopId, setShopId] = useState("");

  const [profit, setProfit] = useState(0);
  const [ordersSent, setOrdersSent] = useState(0);
  const [ordersReceived, setOrdersReceived] = useState(0);

  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [monthlySendUsage, setMonthlySendUsage] =
    useState<MonthlySendUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const [reportPeriod, setReportPeriod] =
    useState<DashboardReportPeriod>("month");

  const [reportSummary, setReportSummary] =
    useState<DashboardReportSummary | null>(null);

  const [reportLoading, setReportLoading] = useState(false);

  // Invite Florists
  const [inviteFriendsVisible, setInviteFriendsVisible] = useState(false);
  const [personalMessageVisible, setPersonalMessageVisible] = useState(false);
  const [personalMessage, setPersonalMessage] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [inviteLink, setInviteLink] = useState(
    process.env.NEXT_PUBLIC_URL + "/register",
  );
  const [sendingInvite, setSendingInvite] = useState(false);

  const router = useRouter();

  // ------------------------------
  // Fetch dashboard data
  // ------------------------------
  useEffect(() => {
    if (status !== "authenticated") return;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setUsageLoading(true);

        const [shopRes, usageRes] = await Promise.all([
          fetch("/api/shops/me"),
          fetch("/api/orders/send-usage"),
        ]);

        const shopData = await shopRes.json();
        const usageData = await usageRes.json();

        if (!shopRes.ok) {
          throw new Error(shopData.error || "Unable to load shop information.");
        }

        if (!usageRes.ok) {
          throw new Error(
            usageData.error || "Unable to load monthly order usage.",
          );
        }

        if (shopData?.shop) {
          if (!shopData.shop.onboardingComplete) {
            router.push("/dashboard/setup");
            return;
          }

          setShop(shopData.shop);
          setShopId(shopData.shop._id || shopData.id || "");
          setIsPro(Boolean(shopData.shop.isPro));
        }

        setMonthlySendUsage(usageData.usage);
      } catch (err) {
        console.error("Failed to load dashboard:", err);

        toast.error(
          "Failed to load dashboard data. Please refresh the page. If the problem persists, contact GetBloomDirect support.",
        );
      } finally {
        setIsLoading(false);
        setUsageLoading(false);
      }
    }

    loadDashboard();
  }, [status, router]);

  useEffect(() => {
    if (!shop?.isPro) {
      setReportSummary(null);
      return;
    }

    const controller = new AbortController();

    async function loadReportSummary() {
      try {
        setReportLoading(true);

        const res = await fetch(
          `/api/reports/dashboard-summary?period=${reportPeriod}`,
          {
            signal: controller.signal,
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Unable to load performance summary.");
        }

        setReportSummary(data.summary);
      } catch (error: any) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("Failed to load dashboard report:", error);

        toast.error("Unable to load Bloom Pro performance data.");
      } finally {
        if (!controller.signal.aborted) {
          setReportLoading(false);
        }
      }
    }

    loadReportSummary();

    return () => controller.abort();
  }, [shop?.isPro, reportPeriod]);

  if (status === "unauthenticated") {
    return (
      <div className="p-6 text-xl text-red-500">You must be logged in.</div>
    );
  }

  // ------------------------------
  // CLEAR INVITE FIELDS
  // ------------------------------
  const clearInviteFields = () => {
    setToEmail("");
    setPersonalMessage("");
    setPersonalMessageVisible(false);
    setInviteFriendsVisible(false);
  };

  // ------------------------------
  // SEND INVITE HANDLER
  // ------------------------------
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!toEmail) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      await sendInviteRequest({
        to: toEmail,
        businessName: shop?.businessName || "",
        inviteLink,
        personalMessage,
      });

      toast.success("Invite sent successfully!");
      clearInviteFields();
    } catch (error) {
      console.error("INVITE ERROR:", error);
      toast.error(
        "Failed to send invite. Please try again. If the issue persists, contact GetBloomDirect support.",
      );
    }
  };

  // ------------------------------
  // SHOW/HIDE PERSONAL MESSAGE
  // ------------------------------
  const handleVisibilityPersonalMessage = async () => {
    if (personalMessageVisible) {
      setPersonalMessageVisible(false);
      setPersonalMessage("");
    } else {
      setPersonalMessageVisible(true);
    }
  };

  // ------------------------------
  // VERIFICATION PROGRESS
  // ------------------------------
  const verificationSteps = [
    {
      label: "Verified Email",
      completed: !!shop?.verification?.emailVerified,
    },
    {
      label: "Onboarding Finished",
      completed: !!shop?.onboardingComplete,
    },
    {
      label: "Website Verified",
      completed: !!shop?.verification?.websiteVerified,
    },
    {
      label: "Profile Public",
      completed: !!shop?.isPublic,
    },
    {
      label: "Completed 2 Successful Orders",
      completed: (shop?.stats?.ordersCompleted ?? 0) >= 2,
    },
    {
      label: "Received 2 Reviews",
      completed: (shop?.reviews?.length ?? 0) >= 2,
    },
  ];

  // ------------------------------
  // CURRENCY FORMATTER
  // ------------------------------
  function formatCurrencyFromCents(cents: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format((cents || 0) / 100);
  }

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center gap-8 justify-center">
        <p>Loading, Please be patient...</p>
        <BloomSpinner size={72} />
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl shadow-xl bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <div className="mx-auto p-6">
        {/* Verification Status */}
        <VerificationProgressBar
          steps={verificationSteps}
          isVerified={shop?.isVerified ?? false}
        />

        {/* Invite A Shop */}
        <div className="mb-12 bg-gradient-to-br from-emerald-400 to-emerald-700 rounded-3xl p-10 text-center text-white shadow-2xl flex flex-col gap-2">
          <h2 className="text-2xl font-black tracking-wide md:text-3xl">
            Invite A Florist To GetBloomDirect!
          </h2>
          <p className="tracking-wide md:text-lg">
            Help the GetBloomDirect network grow by inviting florists to join!
          </p>
          <button
            className="px-4 py-2 rounded-xl shadow-2xl bg-purple-700 text-white mt-4 sm:mx-auto sm:px-20 sm:text-lg"
            onClick={() => setInviteFriendsVisible(true)}
          >
            Send Invite
          </button>
        </div>

        {/* Monthly Sent Order Usage */}
        <div className="mb-12 rounded-3xl border border-purple-200 bg-white p-6 shadow-xl md:p-8">
          {usageLoading || !monthlySendUsage ? (
            <div className="text-center text-gray-500">
              Loading monthly order usage...
            </div>
          ) : (
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-purple-600">
                  Orders Sent This Month
                </p>

                <div className="mt-2 flex items-end gap-3">
                  <span className="text-5xl font-black text-slate-900">
                    {monthlySendUsage.sentThisMonth}
                  </span>

                  {!monthlySendUsage.isPro && (
                    <span className="pb-1 text-2xl font-bold text-slate-400">
                      / {monthlySendUsage.limit}
                    </span>
                  )}
                </div>

                {monthlySendUsage.isPro ? (
                  <p className="mt-2 font-semibold text-emerald-700">
                    Unlimited sending with Bloom Pro
                  </p>
                ) : monthlySendUsage.remaining === 0 ? (
                  <p className="mt-2 font-bold text-red-600">
                    You have reached your monthly sending limit.
                  </p>
                ) : monthlySendUsage.remaining !== null &&
                  monthlySendUsage.remaining <= 2 ? (
                  <p className="mt-2 font-bold text-amber-700">
                    Only {monthlySendUsage.remaining} order
                    {monthlySendUsage.remaining === 1 ? "" : "s"} remaining this
                    month.
                  </p>
                ) : (
                  <p className="mt-2 text-slate-600">
                    {monthlySendUsage.remaining} orders remaining this month.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <Link
                  href="/dashboard/incoming?role=originating&period=current-month"
                  className="rounded-xl border border-purple-200 px-5 py-3 text-center font-bold text-purple-700 transition-colors hover:bg-purple-50"
                >
                  View This Month&apos;s Orders
                </Link>

                {!monthlySendUsage.isPro && (
                  <Link
                    href="/dashboard/upgrade"
                    className="rounded-xl bg-purple-600 px-5 py-3 text-center font-bold text-white transition-colors hover:bg-purple-700"
                  >
                    Upgrade to Bloom Pro
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bloom Pro Performance Overview */}
        <section className="mb-12">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-purple-600">
                Bloom Pro
              </p>

              <h2 className="mt-1 text-3xl font-black text-slate-900">
                Performance Overview
              </h2>

              <p className="mt-1 text-slate-600">
                Accepted fulfillment business through GetBloomDirect.
              </p>
            </div>

            {shop?.isPro && (
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                {[
                  {
                    value: "month" as const,
                    label: "This Month",
                  },
                  {
                    value: "year" as const,
                    label: "This Year",
                  },
                  {
                    value: "all" as const,
                    label: "All Time",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setReportPeriod(option.value)}
                    className={[
                      "rounded-lg px-4 py-2 text-sm font-bold",
                      "transition-colors",
                      reportPeriod === option.value
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-purple-50 hover:text-purple-700",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {shop?.isPro ? (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Fulfillment Value */}
                <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
                  <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
                    Fulfillment Value
                  </p>

                  <div className="mt-4 text-4xl font-black text-slate-900 md:text-3xl">
                    {reportLoading
                      ? "—"
                      : formatCurrencyFromCents(
                          reportSummary?.fulfillmentValueCents ?? 0,
                        )}
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    Expected fulfillment payout from accepted orders.
                  </p>
                </div>

                {/* Orders Received */}
                <div className="rounded-3xl border border-teal-200 bg-white p-8 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
                  <p className="text-sm font-bold uppercase tracking-wider text-teal-700">
                    Orders Received
                  </p>

                  <div className="mt-4 text-4xl font-black text-slate-900 md:text-3xl">
                    {reportLoading ? "—" : (reportSummary?.ordersReceived ?? 0)}
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    Accepted network fulfillment orders.
                  </p>
                </div>

                {/* Average Fulfillment Order */}
                <div className="rounded-3xl border border-cyan-200 bg-white p-8 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
                  <p className="text-sm font-bold uppercase tracking-wider text-cyan-700">
                    Average Fulfillment Order
                  </p>

                  <div className="mt-4 text-4xl font-black text-slate-900 md:text-3xl">
                    {reportLoading
                      ? "—"
                      : formatCurrencyFromCents(
                          reportSummary?.averageFulfillmentOrderCents ?? 0,
                        )}
                  </div>

                  <p className="mt-3 text-sm text-slate-500">
                    Average expected payout per accepted order.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <Link
                  href="/dashboard/reports"
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-purple-700 transition-colors hover:bg-purple-50"
                >
                  View Full Reporting
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-center text-white shadow-2xl md:p-12">
              <h3 className="text-3xl font-black">
                Unlock Bloom Pro Reporting
              </h3>

              <p className="mx-auto mt-3 max-w-2xl text-lg text-purple-50">
                Track fulfillment value, received orders, average order value,
                tax reporting, and more.
              </p>

              <Link
                href="/dashboard/upgrade"
                className="mt-6 inline-flex rounded-xl bg-white px-6 py-3 font-black text-purple-700 transition-transform hover:scale-105"
              >
                Explore Bloom Pro
              </Link>
            </div>
          )}
        </section>

        {/* Pro Tip */}
        <div
          className={
            (isPro ? "hidden" : "hidden") +
            " mt-16 bg-gradient-to-r from-amber-100 to-orange-100 rounded-3xl p-8 border border-amber-200"
          }
        >
          <p className="text-2xl font-bold text-amber-900 mb-2">
            Pro shops average $1,200/month in extra profit
          </p>
          <p className="text-amber-800">
            Upgrade to Pro → Get featured first in searches + unlimited orders
          </p>
        </div>
      </div>

      {inviteFriendsVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6">
          <div className="relative w-full h-full bg-white rounded-2xl">
            <button
              onClick={() => setInviteFriendsVisible(false)}
              className="absolute top-3 right-5 text-2xl text-red-600 font-black"
            >
              X
            </button>
            <div className="py-12 px-4">
              <form className="space-y-4" onSubmit={handleSendInvite}>
                {/* From Shop */}
                <p className="text-gray-600 text-lg font-bold">
                  From:{" "}
                  <span className="text-purple-600">{shop?.businessName}</span>
                </p>
                {/* To Email */}
                <div>
                  <div className="flex gap-1">
                    <span className="text-red-600 text-xl">*</span>
                    <label className="text-gray-600 text-lg font-bold">
                      To:
                    </label>
                  </div>
                  <input
                    type="email"
                    className="p-2 border rounded-lg w-full border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                    placeholder="Enter florist's email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                  />
                </div>
                {!personalMessageVisible && (
                  <button
                    onClick={() => setPersonalMessageVisible(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 transition-all text-white text-xl font-semibold rounded-xl w-full"
                  >
                    Add Personal Message
                  </button>
                )}
                {personalMessageVisible && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setPersonalMessageVisible(false)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 transition-all text-white text-xl font-semibold rounded-xl w-full"
                    >
                      Cancel
                    </button>
                    <textarea
                      className="h-32 w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                      placeholder="Personal Message (optional)"
                      value={personalMessage}
                      onChange={(e) => setPersonalMessage(e.target.value)}
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 transition-all text-white text-xl font-semibold rounded-xl w-full"
                >
                  Send Invite
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Beta Ad */}
      {/* <div className="fixed bottom-0 left-0 w-full z-40 from-blue-400 to-slate-500 bg-gradient-to-r shadow-lg">
        <button
          onClick={() => setInviteFriendsVisible(true)}
          className="w-full h-20 text-2xl text-white font-semibold hover:opacity-90 transition"
        >
          Invite a florist to join BloomDirect's beta program and help us shape
          the future of floral delivery!
        </button>
      </div> */}

      {/* Invite Friends */}
      {/* <div
        className={
          (inviteFriendsVisible ? "block" : "hidden") +
          " fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6"
        }
      >
        <div
          className="from-blue-300 to-white bg-gradient-to-br
                w-full max-w-xl
                max-h-[90vh]
                rounded-3xl shadow-lg
                flex flex-col
                overflow-hidden"
        >
          <div className="flex justify-between items-center px-6 py-4">
            <button
              type="button"
              onClick={() => handleVisibilityPersonalMessage()}
              className="bg-purple-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-purple-700 transition"
            >
              Add Personal Message
            </button>

            <button
              onClick={() => clearInviteFields()}
              className="text-2xl font-bold text-gray-600 hover:text-gray-800"
            >
              X
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6">
            <form className="py-6 space-y-6" onSubmit={handleSendInvite}>
              <label className="block text-xl font-semibold mb-4">
                To: <br />
                <span className="text-red-600 text-3xl">*</span>
                <input
                  type="email"
                  className="mt-2 ml-1 p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
                  placeholder="Enter florist's email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                />
              </label>

              <label className="block text-xl font-semibold mb-4">
                From: <br />
                <input
                  type="text"
                  className="mt-2 ml-2 p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full"
                  disabled
                  value={shopName}
                />
              </label>

              {personalMessageVisible && (
                <textarea
                  className="h-32 w-full p-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  placeholder="Personal Message (optional)"
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                />
              )}

              <div className="border-t px-6 py-4">
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition"
                >
                  Send Invite to Florist
                </button>
              </div>
            </form>
          </div>
        </div>
      </div> */}
    </div>
  );
}
