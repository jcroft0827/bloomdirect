// app/dashboard/pos-integration/POSIntegrationClient.tsx

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
  apiAccess?: ApiAccess | null;
}

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const WEBHOOK_EVENTS = [
  "order.created",
  "order.accepted",
  "order.declined",
  "order.paid",
  "order.completed",
] as const;

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

  const [showRotateWebhookModal, setShowRotateWebhookModal] = useState(false);
  const [webhookActionLoading, setWebhookActionLoading] = useState(false);
  const [webhook, setWebhook] = useState<WebhookConfig | null>(null);
  const [secretModalType, setSecretModalType] = useState<
    "api-key" | "webhook-secret"
  >("api-key");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedWebhookEvents, setSelectedWebhookEvents] = useState<string[]>(
    WEBHOOK_EVENTS.slice(),
  );
  const [editingWebhook, setEditingWebhook] = useState(false);
  const [editWebhookUrl, setEditWebhookUrl] = useState("");
  const [editWebhookEvents, setEditWebhookEvents] = useState<string[]>([]);

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
          if (!data.shop.isPro) {
            router.push("/dashboard/upgrade");
            return;
          }

          setShop(data.shop);

          await loadWebhook();
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

  async function loadWebhook() {
    try {
      const res = await fetch("/api/shops/webhook", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load webhook configuration.");
      }

      setWebhook(data?.webhook || null);
    } catch (error: unknown) {
      console.error("Failed to load webhook configuration.", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load webhook configuration.",
      );
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
      setSecretModalType("api-key");
      setKeyCopied(false);
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
      setSecretModalType("api-key");
      setKeyCopied(false);
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

  async function handleRotateWebhookSecret(webhookId: string) {
    try {
      setWebhookActionLoading(true);

      const res = await fetch(`/api/shops/webhook/${webhookId}/rotate-secret`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to rotate webhook secret.");
      }

      setNewRawKey(data?.secret || "");
      setSecretModalType("webhook-secret");
      setKeyCopied(false);
      setShowKeyModal(true);
      setShowRotateWebhookModal(false);

      toast.success("Webhook secret rotated successfully.");
    } catch (error: unknown) {
      console.error("Rotate webhook secret error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to rotate webhook secret.",
      );
    } finally {
      setWebhookActionLoading(false);
    }
  }

  function toggleWebhookEvent(event: string) {
    setSelectedWebhookEvents((current) =>
      current.includes(event)
        ? current.filter((item) => item !== event)
        : [...current, event],
    );
  }

  async function handleCreateWebhook() {
    const normalizedUrl = webhookUrl.trim();

    if (!normalizedUrl) {
      toast.error("Enter a webhook endpoint URL.");
      return;
    }

    if (selectedWebhookEvents.length === 0) {
      toast.error("Select at least one webhook event.");
      return;
    }

    try {
      setWebhookActionLoading(true);

      const res = await fetch("/api/shops/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: normalizedUrl,
          events: selectedWebhookEvents,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Failed to create webhook configuration.",
        );
      }

      setWebhook(data.webhook);
      setWebhookUrl("");

      setNewRawKey(data?.secret || "");
      setSecretModalType("webhook-secret");
      setKeyCopied(false);
      setShowKeyModal(true);

      toast.success("Webhook created successfully.");
    } catch (error: unknown) {
      console.error("Create webhook error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create webhook configuration.",
      );
    } finally {
      setWebhookActionLoading(false);
    }
  }

  function startEditingWebhook() {
    if (!webhook) return;

    setEditWebhookUrl(webhook.url);
    setEditWebhookEvents(webhook.events);
    setEditingWebhook(true);
  }

  function cancelEditingWebhook() {
    setEditingWebhook(false);
    setEditWebhookUrl("");
    setEditWebhookEvents([]);
  }

  function toggleEditWebhookEvent(event: string) {
    setEditWebhookEvents((current) =>
      current.includes(event)
        ? current.filter((item) => item !== event)
        : [...current, event],
    );
  }

  async function handleUpdateWebhook() {
    if (!webhook) return;

    const normalizedUrl = editWebhookUrl.trim();

    if (!normalizedUrl) {
      toast.error("Enter a webhook endpoint URL.");
      return;
    }

    if (editWebhookEvents.length === 0) {
      toast.error("Select at least one webhook event.");
      return;
    }

    try {
      setWebhookActionLoading(true);

      const res = await fetch(`/api/shops/webhook/${webhook.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: normalizedUrl,
          events: editWebhookEvents,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Failed to update webhook configuration.",
        );
      }

      setWebhook(data.webhook);
      setEditingWebhook(false);
      toast.success("Webhook updated successfully.");
    } catch (error: unknown) {
      console.error("Update webhook error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update webhook configuration.",
      );
    } finally {
      setWebhookActionLoading(false);
    }
  }

  async function handleToggleWebhookActive() {
    if (!webhook) return;

    try {
      setWebhookActionLoading(true);

      const res = await fetch(`/api/shops/webhook/${webhook.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !webhook.isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update webhook status.");
      }

      setWebhook(data.webhook);

      toast.success(
        data.webhook.isActive ? "Webhook enabled." : "Webhook disabled.",
      );
    } catch (error: unknown) {
      console.error("Toggle webhook error:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update webhook status.",
      );
    } finally {
      setWebhookActionLoading(false);
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
            <p>
              Use this key in your POS integration for external v1 API access.
            </p>
            <p>Store the key securely in your POS system.</p>
            <p>Rotating the key immediately invalidates the old one.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                POS Webhook
              </h2>

              <p className="mt-1 text-sm text-neutral-600">
                Receive real-time order updates in your POS system.
              </p>
            </div>

            {webhook && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  webhook.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {webhook.isActive ? "Active" : "Disabled"}
              </span>
            )}
          </div>

          {webhook ? (
            <div className="mt-5 space-y-5">
              {editingWebhook ? (
                <>
                  <div>
                    <label
                      htmlFor="edit-webhook-url"
                      className="text-sm font-medium text-neutral-800"
                    >
                      Webhook endpoint URL
                    </label>

                    <input
                      id="edit-webhook-url"
                      type="url"
                      value={editWebhookUrl}
                      onChange={(event) =>
                        setEditWebhookUrl(event.target.value)
                      }
                      disabled={webhookActionLoading}
                      className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-neutral-800">
                      Events to send
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {WEBHOOK_EVENTS.map((event) => {
                        const checked = editWebhookEvents.includes(event);

                        return (
                          <label
                            key={event}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleEditWebhookEvent(event)}
                              disabled={webhookActionLoading}
                              className="h-4 w-4"
                            />

                            <span className="font-mono text-sm text-neutral-800">
                              {event}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleUpdateWebhook}
                      disabled={webhookActionLoading}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {webhookActionLoading ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelEditingWebhook}
                      disabled={webhookActionLoading}
                      className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Endpoint URL
                    </p>

                    <p className="mt-1 break-all font-mono text-sm text-neutral-800">
                      {webhook.url}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Subscribed Events
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {webhook.events.map((event) => (
                        <span
                          key={event}
                          className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm text-neutral-700 sm:grid-cols-2">
                    <p>
                      <span className="font-medium">Created:</span>{" "}
                      {formatDate(webhook.createdAt)}
                    </p>

                    <p>
                      <span className="font-medium">Last Updated:</span>{" "}
                      {formatDate(webhook.updatedAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={startEditingWebhook}
                      disabled={webhookActionLoading}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                      Edit Webhook
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleWebhookActive}
                      disabled={webhookActionLoading}
                      className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${
                        webhook.isActive
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {webhookActionLoading
                        ? "Please wait..."
                        : webhook.isActive
                          ? "Disable Webhook"
                          : "Enable Webhook"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRotateWebhookModal(true)}
                      disabled={webhookActionLoading}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Rotate Webhook Secret
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <h3 className="font-semibold text-neutral-900">
                Configure Your POS Webhook
              </h3>

              <p className="mt-1 text-sm text-neutral-600">
                Enter the endpoint where GetBloomDirect should send real-time
                order events. HTTPS is required on the live site.
              </p>

              <div className="mt-5">
                <label
                  htmlFor="webhook-url"
                  className="text-sm font-medium text-neutral-800"
                >
                  Webhook endpoint URL
                </label>

                <input
                  id="webhook-url"
                  type="url"
                  value={webhookUrl}
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  placeholder="https://your-pos.com/webhooks/getbloomdirect"
                  disabled={webhookActionLoading}
                  className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
                />
              </div>

              <div className="mt-5">
                <p className="text-sm font-medium text-neutral-800">
                  Events to send
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {WEBHOOK_EVENTS.map((event) => {
                    const checked = selectedWebhookEvents.includes(event);

                    return (
                      <label
                        key={event}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWebhookEvent(event)}
                          disabled={webhookActionLoading}
                          className="h-4 w-4"
                        />

                        <span className="font-mono text-sm text-neutral-800">
                          {event}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                The signing secret will be shown only once after the webhook is
                created. Store it securely in your POS system.
              </div>

              <button
                type="button"
                onClick={handleCreateWebhook}
                disabled={webhookActionLoading}
                className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {webhookActionLoading ? "Creating..." : "Create Webhook"}
              </button>
            </div>
          )}
        </div>
      </div>

      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-neutral-900">
              {secretModalType === "api-key"
                ? "Save Your API Key"
                : "Save Your Webhook Secret"}
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              {secretModalType === "api-key"
                ? "This is the only time the full API key will be shown. Copy it now and store it securely in your POS system."
                : "This is the only time the full webhook secret will be shown. Copy it now and update your POS integration immediately."}
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
                {secretModalType === "api-key" ? "Copy Key" : "Copy Secret"}
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

              <p
                className={
                  (keyCopied ? "block" : "hidden") +
                  " ml-10 text-lg text-emerald-600"
                }
              >
                {secretModalType === "api-key"
                  ? "Key Copied!"
                  : "Secret Copied!"}
              </p>
            </div>
          </div>
        </div>
      )}

      {showRotateWebhookModal && webhook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-neutral-900">
              Rotate Webhook Secret?
            </h3>

            <p className="mt-3 text-sm text-neutral-600">
              Rotating the webhook secret immediately invalidates the current
              secret. Your POS integration will stop accepting verified webhook
              events until the new secret is saved in the POS system.
            </p>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              The new secret will be shown only once.
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRotateWebhookModal(false)}
                disabled={webhookActionLoading}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleRotateWebhookSecret(webhook.id)}
                disabled={webhookActionLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {webhookActionLoading ? "Rotating..." : "Rotate Webhook Secret"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
