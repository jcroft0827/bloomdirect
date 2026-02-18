// /app/dashboard/DashboardClient.tsx

"use client";

import React, { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import BloomSpinner from "@/components/BloomSpinner";
import { useRouter } from "next/navigation";
import { sendInvite as sendInviteRequest } from "@/lib/client/sendInvite";

export default function DashboardClient() {
  const { data: session, status } = useSession();

  // ------------------------------
  // Local state (your preferred style)
  // ------------------------------
  const [shopName, setShopName] = useState("Loading...");
  const [profit, setProfit] = useState(0);
  const [ordersSent, setOrdersSent] = useState(0);
  const [ordersReceived, setOrdersReceived] = useState(0);
  const [logo, setLogo] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [proSince, setProSince] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [newOrderLoading, setNewOrderLoading] = useState(false);
  const [loadSettings, setLoadSettings]  = useState(false);

  // Invite Florists
  const [inviteFriendsVisible, setInviteFriendsVisible] = useState(false);
  const [personalMessageVisible, setPersonalMessageVisible] = useState(false);
  const [personalMessage, setPersonalMessage] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [inviteLink, setInviteLink] = useState(
    process.env.NEXT_PUBLIC_URL + "/register",
  );
  const [sendingInvite, setSendingInvite] = useState(false);

  const route = useRouter();

  // ------------------------------
  // Fetch dashboard data
  // ------------------------------
  useEffect(() => {
    if (status !== "authenticated") return;

    async function loadDashboard() {
      try {
        console.log("Fetching dashboard info...");
        setIsLoading(true);

        const res = await fetch("/api/dashboard/overview");
        if (!res.ok) {
          console.error("Dashboard API error:", res.status);
          return;
        }

        const data = await res.json();
        console.log("Dashboard data received:", data);

        setShopName(data.shopName ?? "Unknown Shop");
        setProfit(data.profit ?? 0);
        setOrdersSent(data.ordersSent ?? 0);
        setOrdersReceived(data.ordersReceived ?? 0);
        setLogo(data.logo ?? null);
        setIsPro(Boolean(data.isPro));
        setProSince(data.proSince ?? null);
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
  // DEBUG LOGGING (helps a lot!)
  // ------------------------------
  console.log("SESSION:", session);
  console.log("SHOP NAME:", shopName);
  console.log("PRO STATUS:", isPro);

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
        shopName,
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
  // RENDER
  // ------------------------------

  if (isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <BloomSpinner size={72} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col items-center">
        <div className="flex items-center gap-5 w-full justify-between p-2">
          <div>
            {logo && (
              <img
                src={logo}
                alt="Shop Logo"
                className="w-20 h-20 rounded-full shadow-lg border-4 border-white"
              />
            )}
          </div>
          <div className="flex items-center gap-5 p-2">
            <Link 
              href={"/settings"}
              onClick={() => {setLoadSettings(true)}}
            >
              {!loadSettings ? 
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
              : 
              <BloomSpinner />
            }
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition shadow-lg"
            >
              Log out
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Welcome back, {shopName || "Florist"}!
          </h1>
          <p className="text-xl opacity-90">
            You're saving thousands by skipping wire services.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 -mt-8">
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
              <h2 className="text-5xl font-black mb-4">
                Unlock Your Real Numbers
              </h2>
              <p className="text-2xl mb-8 opacity-90">
                Pro shops see live profit, unlimited orders, and get featured
                first
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
                  className="bg-white text-purple-600 font-black text-3xl px-16 py-6 rounded-3xl hover:scale-110 transition-all shadow-2xl"
                >
                  Upgrade to Pro — $29/month
                </button>
              </form>
              <p className="mt-6 text-xl">
                Cancel anytime • 400+ shops already Pro
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link
            href="/dashboard/new-order"
            onClick={() => setOrdersLoading(true)}
            className="group bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl p-12 text-center shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 transition-all duration-300"
          >
            <div className="text-6xl mb-4">Send New Order</div>
            <p className="text-xl opacity-90">
              Keep $20–$27 instantly → No wire fees
            </p>
            <div className="mt-6 text-3xl font-bold group-hover:translate-x-4 transition-transform inline-block">
              {ordersLoading ? <BloomSpinner size={72} /> : "→"}
            </div>
          </Link>

          <Link
            href="/dashboard/incoming"
            onClick={() => setNewOrderLoading(true)}
            className="group bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-3xl p-12 text-center shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 transition-all duration-300"
          >
            <div className="text-6xl mb-4">Orders</div>
            <p className="text-xl opacity-90">
              Accept orders & earn 100% of delivery + arrangement
            </p>
            <div className="mt-6 text-3xl font-bold group-hover:translate-x-4 transition-transform inline-block">
              {newOrderLoading ? <BloomSpinner size={72} /> : "→"}
            </div>
          </Link>
        </div>

        {/* Pro Tip */}
        <div
          className={
            (isPro ? "hidden" : "block") +
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

      {/* Beta Ad */}
      <div className="fixed bottom-0 left-0 w-full z-40 from-blue-400 to-slate-500 bg-gradient-to-r shadow-lg">
        <button
          onClick={() => setInviteFriendsVisible(true)}
          className="w-full h-20 text-2xl text-white font-semibold hover:opacity-90 transition"
        >
          Invite a florist to join BloomDirect's beta program and help us shape
          the future of floral delivery!
        </button>
      </div>

      {/* Invite Friends */}
      <div
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
      </div>
    </div>
  );
}
