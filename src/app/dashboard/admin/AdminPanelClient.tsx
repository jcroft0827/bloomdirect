"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type WebsiteVerificationRequest = {
  _id: string;
  shopName: string;
  websiteUrl: string;
  failureReason: string;
  status: string;
  createdAt: string;
};

type AdminCustomer = {
  _id: string;
  businessName?: string;
  shopName?: string;
  email?: string;
  role?: string;
  isPro?: boolean;
  isPublic?: boolean;
  onboardingComplete?: boolean;
  isVerified?: boolean;
  verifiedFlorist?: boolean;
  createdAt: string;
  lastLogin?: string;
  address?: {
    city?: string;
    state?: string;
    zip?: string;
  };
  contact?: {
    phone?: string;
    website?: string;
  };
};

export default function AdminPanelClient() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [websiteRequests, setWebsiteRequests] = useState<
    WebsiteVerificationRequest[]
  >([]);
  const [errors, setErrors] = useState([]);
  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);

  const currentRequest = websiteRequests[currentRequestIndex];

  // #region useEffects
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    async function loadShopData() {
      try {
        setLoading(true);

        const res = await fetch("/api/shops/me");
        const data = await res.json();

        // Admin Protection
        if (!data?.shop) {
          router.replace("/login");
          return;
        }

        if (data.shop.role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        // pull notifications
      } catch (error) {}
    }

    loadShopData();
  }, [status]);

  useEffect(() => {
    async function loadWebsiteVerificationRequests() {
      try {
        setLoading(true);

        const res = await fetch("/api/admin/websites");
        const data = await res.json();

        if (!res.ok) {
          console.log(
            data.error || "Failed to load website verification requests.",
          );
        }

        console.log(data.requests);

        setWebsiteRequests(data.requests);
      } catch (error) {
        console.error("Failed to load website requests:", error);
      }
    }

    loadWebsiteVerificationRequests();
  }, []);

  useEffect(() => {
    loadCustomers();
  }, []);
  // #endregion

  // #region functions
  function goToPreviousRequest() {
    setCurrentRequestIndex((prev) =>
      prev === 0 ? websiteRequests.length - 1 : prev - 1,
    );
  }

  function goToNextRequest() {
    setCurrentRequestIndex((prev) =>
      prev === websiteRequests.length - 1 ? 0 : prev + 1,
    );
  }

  async function handleWebsiteDecision(
    requestId: string,
    decision: "approve" | "decline",
  ) {
    try {
      setActionLoading(true);

      const res = await fetch(`/api/admin/websites/${requestId}/${decision}`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${decision} request.`);
      }

      setWebsiteRequests((prev) => {
        const updated = prev.filter((request) => request._id !== requestId);

        if (currentRequestIndex >= updated.length) {
          setCurrentRequestIndex(Math.max(updated.length - 1, 0));
        }

        return updated;
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong.");
    } finally {
      setActionLoading(false);
    }
  }

  async function loadCustomers() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/customers");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load customers.");
      }

      setCustomers(data.customers || []);
    } catch (error) {
      console.error("Failed to load customers:", error);
    } finally {
      setLoading(false);
    }
  }
  // #endregion

  return (
    <div className="w-full rounded-2xl shadow-xl bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Notifications */}
      <div className="rounded-2xl shadow-xl p-4">
        <h2 className="text-2xl font-black text-purple-600">Notifications</h2>
        {websiteRequests && (
          <div>
            <p className="font-semibold">
              You currently have{" "}
              <span className="text-lg font-black text-emerald-600">
                {websiteRequests.length}
              </span>{" "}
              website request(s).
            </p>
            {websiteRequests.length > 0 && currentRequest && (
              <div className="relative mt-4">
                <div className="overflow-x-auto snap-x snap-mandatory scroll-smooth">
                  <div className="flex">
                    {websiteRequests.map((request) => (
                      <div
                        key={request._id}
                        className="min-w-full snap-center px-1"
                      >
                        <div className="p-4 rounded-2xl bg-purple-200">
                          <p className="font-semibold">{request.shopName}</p>

                          <a
                            href={request.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all text-purple-800 underline"
                          >
                            {request.websiteUrl}
                          </a>

                          <div className="h-[0.1rem] bg-purple-700/50 my-2"></div>

                          <p>
                            <span className="font-semibold">Reason</span>
                            <br />
                            {request.failureReason}
                          </p>

                          <p className="mt-2">
                            <span className="font-semibold">Submitted</span>
                            <br />
                            {new Date(
                              request.createdAt,
                            ).toLocaleDateString()}{" "}
                            {new Date(request.createdAt).toLocaleTimeString()}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2 w-full">
                            <button
                              disabled={actionLoading}
                              onClick={() =>
                                handleWebsiteDecision(request._id, "approve")
                              }
                              className="font-semibold text-white border border-emerald-700 bg-emerald-600 px-3 py-1 rounded-lg transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Approve
                            </button>

                            <button
                              disabled={actionLoading}
                              onClick={() =>
                                handleWebsiteDecision(request._id, "decline")
                              }
                              className="font-semibold text-white border border-red-700 bg-red-600 px-3 py-1 rounded-lg transition hover:bg-red-700 disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {websiteRequests.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goToPreviousRequest}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-purple-700 shadow"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={goToNextRequest}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-purple-700 shadow"
                    >
                      ›
                    </button>
                  </>
                )}

                <p className="mt-2 text-center text-sm text-gray-600">
                  {currentRequestIndex + 1} of {websiteRequests.length}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer List */}
      <div className="rounded-2xl shadow-xl p-4">
        <h2 className="text-2xl font-black text-purple-600">Shops</h2>

        <p className="font-semibold">
          You currently have{" "}
          <span className="text-lg font-black text-emerald-600">
            {customers.length}
          </span>{" "}
          shop/customer account(s).
        </p>

        <div className="mt-4 space-y-3">
          {customers.map((customer) => (
            <div
              key={customer._id}
              className="rounded-2xl bg-white p-4 shadow border border-purple-100"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-black text-gray-900">
                    {customer.businessName ||
                      customer.shopName ||
                      "Unnamed Shop"}
                  </p>

                  <p className="text-sm text-gray-600">{customer.email}</p>

                  <p className="text-sm text-gray-600">
                    {customer.address?.city || "No city"}
                    {customer.address?.state
                      ? `, ${customer.address.state}`
                      : ""}{" "}
                    {customer.address?.zip || ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {customer.role === "admin" && (
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                      Admin
                    </span>
                  )}

                  {customer.isPro && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                      Pro
                    </span>
                  )}

                  {customer.verifiedFlorist && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                      Verified
                    </span>
                  )}

                  {!customer.onboardingComplete && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                      Setup Incomplete
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                <p>
                  <span className="font-semibold">Phone:</span>{" "}
                  {customer.contact?.phone || "N/A"}
                </p>

                <p>
                  <span className="font-semibold">Website:</span>{" "}
                  {customer.contact?.website ? (
                    <a
                      href={customer.contact.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-700 underline"
                    >
                      Open Website
                    </a>
                  ) : (
                    "N/A"
                  )}
                </p>

                <p>
                  <span className="font-semibold">Joined:</span>{" "}
                  {new Date(customer.createdAt).toLocaleDateString()}
                </p>

                <p>
                  <span className="font-semibold">Last Login:</span>{" "}
                  {customer.lastLogin
                    ? new Date(customer.lastLogin).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
