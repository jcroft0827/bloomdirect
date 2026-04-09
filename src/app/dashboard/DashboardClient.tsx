// /app/dashboard/DashboardClient.tsx

"use client";

import React, { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import BloomSpinner from "@/components/BloomSpinner";
import { useRouter } from "next/navigation";
import { sendInvite as sendInviteRequest } from "@/lib/client/sendInvite";

// #region Shop

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

interface FeaturedBouquet {
  name?: string;
  price?: number;
  description?: string;
  image?: string;
}

interface Shop {
  id: string;
  businessName: string;
  email: string;
  role: string;
  isVerified: boolean;
  verifiedFlorist: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  isPublic: boolean;
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
  featuredBouquet: FeaturedBouquet;
  delivery: Delivery;
  stats: Stats;
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
  const [logo, setLogo] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [proSince, setProSince] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [newOrderLoading, setNewOrderLoading] = useState(false);
  const [loadSettings, setLoadSettings] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<
    "originating" | "fulfilling" | "all"
  >("all");

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
        console.log("Fetching dashboard info...");
        setIsLoading(true);

        const res = await fetch("/api/shops/me");
        const data = await res.json();

        if (data && data.shop) {
          if (!data.shop.onboardingComplete) {
            router.push("/dashboard/setup");
          }
          setShop(data.shop);
          setShopId(data.id);
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        toast.error(
          "Failed to load dashboard data. Please refresh the page. If the problem persists, contact GetBloomDirect support.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, [status]);

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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {isPro ? (
            <>
              {/* REAL STATS — Pro users only */}
              <div className="bg-white rounded-3xl shadow-2xl p-10 border border-emerald-200 hover:scale-105 transition-all">
                <div className="text-emerald-600 text-6xl font-black">
                  ${profit}
                </div>
                <p className="text-xl text-gray-600 mt-2">Profit This Month</p>
              </div>
              <div className="bg-white rounded-3xl shadow-2xl p-10 border border-teal-200 hover:scale-105 transition-all">
                <div className="text-teal-600 text-6xl font-black">
                  {ordersSent}
                </div>
                <p className="text-xl text-gray-600 mt-2">Orders Sent</p>
              </div>
              <div className="bg-white rounded-3xl shadow-2xl p-10 border border-cyan-200 hover:scale-105 transition-all">
                <div className="text-cyan-600 text-6xl font-black">
                  {ordersReceived}
                </div>
                <p className="text-xl text-gray-600 mt-2">Incoming Orders</p>
              </div>
            </>
          ) : (
            /* BLURRED PAYWALL — Free users see this */
            <div className="col-span-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-12 text-center text-white shadow-2xl">
              <h2 className="text-3xl font-black mb-4 md:text-4xl">
                {/* Unlock Your Real Numbers */}
                Pro Coming Soon!
              </h2>
              <p className="text-xl mb-8 opacity-90 md:text-2xl">
                Pro shops see live profit, unlimited orders, get featured first,
                and much more!
              </p>
              <form action="/api/checkout" method="POST">
                <input
                  type="hidden"
                  name="priceId"
                  value={
                    process.env.STRIPE_PRICE_ID ||
                    "price_1SUum5DgUvbWeRnauCjeXu7X"
                  } // Fallback for local
                />
                <button
                  type="submit"
                  className="hidden bg-white text-purple-600 font-black text-3xl py-6 rounded-3xl hover:scale-110 transition-all shadow-2xl sm:px-6"
                >
                  Upgrade to Pro
                  <br /> $29/month
                </button>
              </form>
              <p className="hidden mt-6 text-xl">Cancel anytime</p>
            </div>
          )}
        </div>

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
              <form
                className="space-y-4"
                onSubmit={handleSendInvite}
              >
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
