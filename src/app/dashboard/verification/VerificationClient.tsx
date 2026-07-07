// app/dashboard/verification/VerificationClient.tsx

"use client";

import VerificationProgressBar from "@/components/verification/ProgressBar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import VerificationTasks from "@/components/verification/VerificationTasks";
import { ClockIcon } from "@heroicons/react/24/outline";

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

interface WebsiteVerification {
  status: string;
  checkedAt: Date;
  failureReasons: string;
  matchedSignals: [];
  riskSignals: [];
}

interface Shop {
  id: string;
  businessName: string;
  email: string;
  role: string;
  isVerified: boolean;
  verifiedFlorist: boolean;
  websiteVerifications: WebsiteVerification;
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
}

export default function VerificationClient() {
  const { data: session, status } = useSession();

  const [shop, setShop] = useState<Shop | null>(null);
  const [showEmailCodeBox, setShowEmailCodeBox] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [emailVerifyMessage, setEmailVerifyMessage] = useState("");
  const [emailVerifyError, setEmailVerifyError] = useState("");
  const [emailCodeExpiresAt, setEmailCodeExpiresAt] = useState<string | null>(
    null,
  );
  const [showWebsiteInput, setShowWebsiteInput] = useState(false);
  const [websiteInput, setWebsiteInput] = useState("");
  const [websiteLoading, setWebsiteLoading] = useState(false);

  const router = useRouter();

  // ------------------------------
  // Fetch Verification data
  // ------------------------------
  useEffect(() => {
    if (status !== "authenticated") return;

    async function loadVerificationData() {
      try {
        const res = await fetch("/api/shops/me");
        const data = await res.json();

        if (data && data.shop) {
          if (!data.shop.onboardingComplete) {
            router.push("/dashboard/setup");
          }
          setShop(data.shop);
        }
      } catch (err) {
        console.error("Failed to load verification data:", err);
        toast.error(
          "Failed to load verification data. Please refresh the page. If the problem persists, contact GetBloomDirect support.",
        );
      }
    }
    loadVerificationData();
  }, [status]);

  if (status === "unauthenticated") {
    return (
      <div className="p-6 text-xl text-red-500">You must be logged in.</div>
    );
  }

  // ------------------------------
  // VERIFICATION PROGRESS
  // ------------------------------
  async function handleVerifyEmail() {
    try {
      setEmailVerifyLoading(true);
      setEmailVerifyError("");
      setEmailVerifyMessage("");

      const res = await fetch("/api/shops/verification/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      setEmailCodeExpiresAt(data.expiresAt || null);

      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      if (data.alreadyVerified) {
        setShop((prev: any) =>
          prev
            ? {
                ...prev,
                verification: { ...prev.verification, emailVerified: true },
              }
            : prev,
        );
        setEmailVerifyMessage("Your email is already verified.");
      } else {
        setShowEmailCodeBox(true);
        setEmailVerifyMessage("Verification code sent to your email.");
      }
    } catch (err: any) {
      setEmailVerifyError(
        err?.message ||
          "Failed to send verification code. Please try again later.",
      );
    } finally {
      setEmailVerifyLoading(false);
    }
  }

  async function handleConfirmEmailCode() {
    try {
      setEmailVerifyLoading(true);
      setEmailVerifyError("");
      setEmailVerifyMessage("");

      const res = await fetch("/api/shops/verification/email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: emailCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm verification code");
      }

      setShop((prev: any) =>
        prev
          ? {
              ...prev,
              isVerified: data.isVerified ?? prev.isVerified,
              verifiedFlorist: data.verifiedFlorist ?? prev.verifiedFlorist,
              verification: {
                ...prev.verification,
                emailVerified: data.verification.emailVerified,
                emailVerifiedAt: data.verification.emailVerifiedAt,
                websiteVerified: data.verification.websiteVerified,
                websiteVerifiedAt: data.verification.websiteVerifiedAt,
                verifiedAt: data.verification.verifiedAt,
              },
            }
          : prev,
      );

      setTimeout(() => {
        setShowEmailCodeBox(false);
      }, 1200);
      setEmailCode("");
      setEmailVerifyMessage("Your email has been verified!");
      toast.success("Email verified successfully!");
    } catch (err: any) {
      setEmailVerifyError(
        err?.message ||
          "Failed to confirm verification code. Please try again later.",
      );
    } finally {
      setEmailVerifyLoading(false);
    }
  }

  function handleVerifyPhone() {
    console.log("Verify phone clicked");
  }

  async function handleVerifyWebsite() {
    if (!shop?.contact?.website) return;

    try {
      setWebsiteLoading(true);

      const res = await fetch("/api/shops/verification/website", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ website: shop.contact.website }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to verify website.");
      }

      setShop((prev: any) =>
        prev
          ? {
              ...prev,
              isVerified: data.isVerified ?? prev.isVerified,
              verifiedFlorist: data.verifiedFlorist ?? prev.verifiedFlorist,
              contact: {
                ...prev.contact,
                website: data.website ?? prev.contact.website,
              },
              verification: {
                ...prev.verification,
                websiteVerified: data.verification.websiteVerified,
                websiteVerifiedAt: data.verification.websiteVerifiedAt,
                verifiedAt: data.verification.verifiedAt,
              },
            }
          : prev,
      );

      toast.success(data.message || "Website verified.");
    } catch (err: any) {
      toast.error(err.message || "Failed to verify website.");
    } finally {
      setWebsiteLoading(false);
    }
  }

  async function handleAddAndVerifyWebsite() {
    try {
      setWebsiteLoading(true);

      const res = await fetch("/api/shops/verification/website", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ website: websiteInput }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to verify website.");
      }

      setShop((prev: any) =>
        prev
          ? {
              ...prev,
              isVerified: data.isVerified ?? prev.isVerified,
              verifiedFlorist: data.verifiedFlorist ?? prev.verifiedFlorist,
              contact: {
                ...prev.contact,
                website: data.website ?? websiteInput,
              },
              verification: {
                ...prev.verification,
                websiteVerified: data.verification.websiteVerified,
                websiteVerifiedAt: data.verification.websiteVerifiedAt,
                verifiedAt: data.verification.verifiedAt,
              },
            }
          : prev,
      );

      setShowWebsiteInput(false);
      setWebsiteInput("");
      toast.success(data.message || "Website saved.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save website.");
    } finally {
      setWebsiteLoading(false);
    }
  }

  async function handleMakeProfilePublic() {
    try {
      const res = await fetch("/api/shops/me/public", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublic: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile visibility");
      }

      setShop((prev) => {
        if (!prev) return prev;
        return { ...prev, isPublic: data?.shop?.isPublic ?? prev.isPublic };
      });
      toast.success("Your profile is now public!");
    } catch (err) {
      console.error(err);
    }
  }

  const websiteNeedsReview =
    shop?.websiteVerifications?.status === "needs_review" &&
    !shop?.verification?.websiteVerified;

  const verificationSteps = [
    {
      label: "Verified Email",
      completed: !!shop?.verification?.emailVerified,
      actionLabel: emailVerifyLoading ? "Sending..." : "Verify Email",
      onActionClick: handleVerifyEmail,
      disabled: emailVerifyLoading,
    },
    {
      label: "Onboarding Finished",
      completed: !!shop?.onboardingComplete,
    },
    {
      label: "Website Verified",
      completed: !!shop?.verification?.websiteVerified,
      description: shop?.contact?.website ? (
        <span className="break-all">{shop.contact.website}</span>
      ) : (
        <span>No website added yet.</span>
      ),
      customAction: shop?.contact?.website ? (
        <div>
          <p
            className={(websiteNeedsReview ? "block" : "hidden") + 
              " "
            }
          >
            test
          </p>
          <button
            type="button"
            disabled={websiteLoading}
            onClick={handleVerifyWebsite}
            className={
              "rounded-lg px-4 py-2 text-sm font-semibold transition " +
                websiteLoading
                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }
          >
            {websiteLoading
                ? "Verifying..."
                : "Verify Website"}
          </button>

        </div>
      ) : showWebsiteInput ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={websiteInput}
            onChange={(e) => setWebsiteInput(e.target.value)}
            placeholder="https://yourshop.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 sm:w-56"
          />

          <button
            type="button"
            disabled={websiteLoading || !websiteInput.trim()}
            onClick={handleAddAndVerifyWebsite}
            className={
              "rounded-lg px-4 py-2 text-sm font-semibold transition " +
              (websiteLoading || !websiteInput.trim()
                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                : "bg-purple-600 text-white hover:bg-purple-700")
            }
          >
            {websiteLoading ? "Saving..." : "Add"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowWebsiteInput(true)}
          className="rounded-lg px-4 py-2 text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700"
        >
          Add Website
        </button>
      ),
    },
    {
      label: "Profile Public",
      completed: !!shop?.isPublic,
      actionLabel: "Make Public",
      onActionClick: handleMakeProfilePublic,
    },
    {
      label: "Complete 2 Successful Orders",
      completed: (shop?.stats?.ordersCompleted ?? 0) >= 2,
    },
    {
      label: "Receive 2 Reviews",
      completed: (shop?.reviews?.length ?? 0) >= 2,
    },
  ];

  const upcomingVerificationSteps = [
    {
      label: "Verified Phone",
      completed: false,
      actionLabel: "Coming Soon",
      disabled: true,
      disabledReason: "Phone verification is coming soon. Stay tuned!",
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Verification Dashboard</h1>
      <p className="text-gray-700 mb-6">
        Welcome to your verification dashboard! Here you can track your progress
        and complete the necessary steps to become a verified florist on
        BloomDirect.
      </p>
      {/* Verification Status */}
      <VerificationProgressBar
        steps={verificationSteps}
        isVerified={shop?.isVerified ?? false}
      />

      {/* Verification Tasks */}
      <VerificationTasks
        steps={verificationSteps}
        isVerified={shop?.isVerified ?? false}
      />

      {/* Upcoming Verification Tasks */}
      <ul className="space-y-3 bg-purple-100 rounded-xl p-4 mt-6">
        {upcomingVerificationSteps.map((step) => (
          <li
            key={step.label}
            className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-3"
          >
            <div className="flex items-center gap-3">
              <div
                className={
                  "h-5 w-5 shrink-0 rounded-full border-2 " +
                  (step.completed
                    ? "border-green-500 bg-green-500"
                    : "border-gray-400")
                }
              />

              <div>
                <span
                  className={
                    step.completed
                      ? "line-through text-gray-500"
                      : "text-gray-700"
                  }
                >
                  {step.label}
                </span>

                {!step.completed && step.disabledReason && (
                  <p className="text-xs text-gray-500">{step.disabledReason}</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {showEmailCodeBox && !shop?.verification?.emailVerified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-purple-100 bg-purple-50 p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Verify Your Email Address
                </h3>
                <p className="mt-1 text-sm text-gray-700">
                  Enter the 6-digit code we sent to your shop account email.
                </p>

                <div className="mt-4 flex items-start gap-2 rounded-lg bg-purple-50 p-3 text-sm text-purple-800">
                  <ClockIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <p>
                    This code expires in{" "}
                    <span className="font-semibold">10 minutes</span>. If it
                    expires, simply click "Resend Code" to get a new one.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowEmailCodeBox(false);
                  setEmailCode("");
                  setEmailVerifyError("");
                  setEmailVerifyMessage("");
                }}
                className="rounded-full px-2 py-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
              >
                X
              </button>
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={emailCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setEmailCode(value);
              }}
              placeholder="123456"
              className="mt-6 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />

            {emailCodeExpiresAt && (
              <p className="mt-2 text-xs text-gray-500">
                Expires at{" "}
                {new Date(emailCodeExpiresAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}

            {emailVerifyMessage && (
              <p className="mt-3 text-sm font-medium text-green-700">
                {emailVerifyMessage}
              </p>
            )}

            {emailVerifyError && (
              <p className="mt-3 text-sm font-medium text-red-600">
                {emailVerifyError}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={emailVerifyLoading || emailCode.length !== 6}
                onClick={handleConfirmEmailCode}
                className={
                  "rounded-lg px-4 py-2 text-sm font-semibold transition " +
                  (emailVerifyLoading || emailCode.length !== 6
                    ? "cursor-not-allowed bg-gray-100 text-gray-400"
                    : "bg-purple-600 text-white hover:bg-purple-700")
                }
              >
                {emailVerifyLoading ? "Verifying..." : "Confirm Code"}
              </button>

              <button
                type="button"
                disabled={emailVerifyLoading}
                onClick={handleVerifyEmail}
                className={
                  "rounded-lg px-4 py-2 text-sm font-semibold transition " +
                  (emailVerifyLoading
                    ? "cursor-not-allowed bg-gray-100 text-gray-400"
                    : "bg-purple-600 text-white hover:bg-purple-700")
                }
              >
                Resend Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
