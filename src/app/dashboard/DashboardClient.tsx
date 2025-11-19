"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function DashboardClient() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    profit: 0,
    ordersSent: 0,
    ordersReceived: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats({
            profit: data.profit,
            ordersSent: data.ordersSent,
            ordersReceived: data.ordersReceived,
            loading: false,
          });
        }
      } catch (err) {
        setStats((s) => ({ ...s, loading: false }));
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Welcome back, {session?.user?.name || "Florist"}!
          </h1>
          <p className="text-xl opacity-90">
            You’re saving thousands by skipping wire services.
          </p>
        </div>
        <form action="/api/auth/signout" method="post">
          <button className="text-sm underline">Log out</button>
        </form>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 -mt-8">
        {/* Stats Cards */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-8 transform hover:scale-105 transition-all duration-300 border border-emerald-100">
            <div className="text-emerald-600 text-5xl font-bold mb-2">
              ${stats.profit}
            </div>
            <p className="text-gray-600 text-lg">Profit Kept This Month</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 transform hover:scale-105 transition-all duration-300 border border-teal-100">
            <div className="text-teal-600 text-5xl font-bold mb-2">
              {stats.ordersSent}
            </div>
            <p className="text-gray-600 text-lg">Orders Sent</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 transform hover:scale-105 transition-all duration-300 border border-cyan-100">
            <div className="text-cyan-600 text-5xl font-bold mb-2">
              {stats.ordersReceived}
            </div>
            <p className="text-gray-600 text-lg">Incoming Orders</p>
          </div>
        </div> */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {session?.user?.isPro ? (
            <>
              {/* REAL STATS — Pro users only */}
              <div className="bg-white rounded-3xl shadow-2xl p-10 border border-emerald-200 hover:scale-105 transition-all">
                <div className="text-emerald-600 text-6xl font-black">
                  ${stats.profit}
                </div>
                <p className="text-xl text-gray-600 mt-2">Profit This Month</p>
              </div>
              <div className="bg-white rounded-3xl shadow-2xl p-10 border border-teal-200 hover:scale-105 transition-all">
                <div className="text-teal-600 text-6xl font-black">
                  {stats.ordersSent}
                </div>
                <p className="text-xl text-gray-600 mt-2">Orders Sent</p>
              </div>
              <div className="bg-white rounded-3xl shadow-2xl p-10 border border-cyan-200 hover:scale-105 transition-all">
                <div className="text-cyan-600 text-6xl font-black">
                  {stats.ordersReceived}
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
              {/* Simple form POST — no client-side Stripe */}
              <form action="/api/checkout" method="POST">
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
            className="group bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl p-12 text-center shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 transition-all duration-300"
          >
            <div className="text-6xl mb-4">Send New Order</div>
            <p className="text-xl opacity-90">
              Keep $20–$27 instantly → No wire fees
            </p>
            <div className="mt-6 text-3xl font-bold group-hover:translate-x-4 transition-transform inline-block">
              →
            </div>
          </Link>

          <Link
            href="/dashboard/incoming"
            className="group bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-3xl p-12 text-center shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 transition-all duration-300"
          >
            <div className="text-6xl mb-4">Incoming Orders</div>
            <p className="text-xl opacity-90">
              Accept orders & earn 100% of delivery + arrangement
            </p>
            <div className="mt-6 text-3xl font-bold group-hover:translate-x-4 transition-transform inline-block">
              →
            </div>
          </Link>
        </div>
        {/* Pro Tip */}
        <div className="mt-16 bg-gradient-to-r from-amber-100 to-orange-100 rounded-3xl p-8 border border-amber-200">
          <p className="text-2xl font-bold text-amber-900 mb-2">
            Pro shops average $1,200/month in extra profit
          </p>
          <p className="text-amber-800">
            Upgrade to Pro → Get featured first in searches + unlimited orders
          </p>
        </div>
      </div>
    </div>
  );
}
