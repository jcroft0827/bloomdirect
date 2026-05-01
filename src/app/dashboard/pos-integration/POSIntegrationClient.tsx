"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface ApiAccess {
  enabled: boolean;
  keyPrefix: string | null;
  keyLastFour: string | null;
  keyCreatedAt: string | null;
  keyRotatedAt: string | null;
  keyDisabledAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  lastUsedUserAgent: string | null;
  lastKeyPreviewShownAt: string | null;
  createdByShopId: string | null;
  rotatedByShopId: string | null;
}

interface Shop {
  id: string;
  businessName: string;
  isPro: boolean;
  proSince: string | null;
  onboardingComplete?: boolean;
  isApiReadOnly?: boolean;
  apiAccess?: ApiAccess | null;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ApiAccessClient() {
  const { status } = useSession();
  const router = useRouter();

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState(false);

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newRawKey, setNewRawKey] = useState("");

  const [keyCopied, setKeyCopied] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    async function loadShopData() {
      try {
        setLoading(true);

        const res = await fetch("/api/shops/me", {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load shop data.");
        }

        if (data?.shop) {
          if (!data.shop.onboardingComplete) {
            router.push("/dashboard/setup");
            return;
          }

          if (!data.shop.isPro) {
            router.push("/dashboard");
            return;
          }

          setShop(data.shop);
        }
      } catch (error) {
        console.error("Failed to load shop data.", error);
        toast.error(
          "Failed to load shop data. Please refresh the page. If the issue persists, contact GetBloomDirect support.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadShopData();
  }, [status, router]);

  const hasKey = !!shop?.apiAccess?.keyCreatedAt;
  const isEnabled = !!shop?.apiAccess?.enabled;
  const isReadOnly = !!shop?.isApiReadOnly;

  const maskedKey = useMemo(() => {
    if (shop?.apiAccess?.keyPrefix && shop?.apiAccess?.keyLastFour) {
      return `${shop.apiAccess.keyPrefix}••••••••${shop.apiAccess.keyLastFour}`;
    }
    return "No API key generated yet";
  }, [shop]);

  async function refreshShop() {
    try {
      const res = await fetch("/api/shops/me", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to refresh shop data.");
      }

      if (data?.shop) {
        setShop(data.shop);
      }
    } catch (error) {
      console.error("Failed to refresh shop data.", error);
      toast.error("Failed to refresh API access data.");
    }
  }

  async function handleGenerate() {
    try {
      setActionLoading(true);

      const res = await fetch("/api/shops/api-access/generate", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate API key.");
      }

      setNewRawKey(data?.apiKey || "");
      setShowKeyModal(true);

      await refreshShop();
      toast.success("API key generated successfully.");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to generate API key.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRotate() {
    const confirmed = window.confirm(
      "Rotating your API key will immediately invalidate the current key. Your POS integration must be updated right away. Continue?",
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);

      const res = await fetch("/api/shops/api-access/rotate", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to rotate API key.");
      }

      setNewRawKey(data?.apiKey || "");
      setShowKeyModal(true);

      await refreshShop();
      toast.success("API key rotated successfully.");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to rotate API key.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDisable() {
    const confirmed = window.confirm(
      "Disabling API access will immediately block your POS integration from connecting. Continue?",
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);

      const res = await fetch("/api/shops/api-access/disable", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to disable API key.");
      }

      await refreshShop();
      toast.success("API access disabled.");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to disable API access.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEnable() {
    try {
      setActionLoading(true);

      const res = await fetch("/api/shops/api-access/enable", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to enable API key.");
      }

      await refreshShop();
      toast.success("API access enabled.");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to enable API access.");
    } finally {
      setActionLoading(false);
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(newRawKey);
      setKeyCopied(true);
      toast.success("API key copied to clipboard.");
    } catch {
      toast.error("Failed to copy API key.");
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-600">Loading API access...</p>
        </div>
      </div>
    );
  }

  if (!shop) return null;

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-700 p-8 text-white shadow-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">POS API Access</h1>
            <p className="mt-1 text-sm text-white/90">
              Thank you for being a pro shop since {formatDate(shop.proSince)}!
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="mb-1 text-xs uppercase tracking-wide text-white/80">
                API Key
              </p>
              <input
                readOnly
                value={maskedKey}
                className="w-full rounded-lg border border-white/20 bg-white px-3 py-2 text-sm text-black"
              />
              <p className="mt-2 text-xs text-white/85">
                {hasKey
                  ? isEnabled
                    ? "Your API key is active and ready to use."
                    : "Your API key exists but is currently disabled."
                  : "Generate an API key to connect your POS system."}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="mb-2 text-xs uppercase tracking-wide text-white/80">
                Access Status
              </p>

              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Status:</span>{" "}
                  {isEnabled ? "Enabled" : "Disabled"}
                </p>
                <p>
                  <span className="font-medium">Mode:</span>{" "}
                  {isReadOnly ? "Read Only" : "Full Access"}
                </p>
                <p>
                  <span className="font-medium">Created:</span>{" "}
                  {formatDate(shop.apiAccess?.keyCreatedAt)}
                </p>
                <p>
                  <span className="font-medium">Last Rotated:</span>{" "}
                  {formatDate(shop.apiAccess?.keyRotatedAt)}
                </p>
                <p>
                  <span className="font-medium">Last Used:</span>{" "}
                  {formatDate(shop.apiAccess?.lastUsedAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!hasKey ? (
              <button
                onClick={handleGenerate}
                disabled={actionLoading}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? "Please wait..." : "Generate API Key"}
              </button>
            ) : (
              <>
                {isEnabled ? (
                  <button
                    onClick={handleDisable}
                    disabled={actionLoading}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading ? "Please wait..." : "Disable"}
                  </button>
                ) : (
                  <button
                    onClick={handleEnable}
                    disabled={actionLoading}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading ? "Please wait..." : "Enable"}
                  </button>
                )}

                <button
                  onClick={handleRotate}
                  disabled={actionLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Please wait..." : "Rotate API Key"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">
            Connection Notes
          </h2>
          <div className="mt-3 space-y-2 text-sm text-neutral-700">
            <p>Use this key in your POS integration for external v1 API access.</p>
            <p>Store the key securely in your POS system.</p>
            <p>
              Rotating the key immediately invalidates the old one.
            </p>
            <p>
              Read-only mode limits your POS integration to non-destructive API
              requests.
            </p>
          </div>
        </div>
      </div>

      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-neutral-900">
              Save Your API Key
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              This is the only time the full API key will be shown. Copy it now
              and store it securely in your POS system.
            </p>

            <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="break-all font-mono text-sm text-neutral-900">
                {newRawKey}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={copyKey}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Copy Key
              </button>

              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setNewRawKey("");
                }}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Done
              </button>

              <p className={(keyCopied ? "block" : "hidden") + " text-emerald-600 ml-10 text-lg"}>
                Key Copied!
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}