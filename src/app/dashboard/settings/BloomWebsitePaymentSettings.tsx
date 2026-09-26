"use client";

import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  settingsValuesEqual,
  useSettingsSectionActions,
  useSettingsSectionDirty,
} from "./SettingsDirtyState";

type Provider = "stripe" | "fiserv";

function stateFromWebsite(website: any) {
  return {
    enabled: website?.paymentSettings?.enabled === true,
    provider:
      website?.paymentSettings?.provider === "fiserv"
        ? ("fiserv" as Provider)
        : ("stripe" as Provider),
  };
}

export default function BloomWebsitePaymentSettings({
  initialWebsite,
}: {
  initialWebsite: any;
}) {
  const [settings, setSettings] = useState(() => stateFromWebsite(initialWebsite));
  const [saved, setSaved] = useState(() => stateFromWebsite(initialWebsite));
  const [readiness, setReadiness] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isRefreshingStripe, setIsRefreshingStripe] = useState(false);

  useEffect(() => {
    const next = stateFromWebsite(initialWebsite);
    setSettings(next);
    setSaved(next);
  }, [initialWebsite]);

  useEffect(() => {
    let active = true;

    async function load() {
      const response = await fetch("/api/websites/payments/readiness");
      const data = await response.json().catch(() => null);
      if (active && response.ok) setReadiness(data);
    }

    void load();
    return () => {
      active = false;
    };
  }, [saved]);

  const dirty = !settingsValuesEqual(settings, saved);

  useSettingsSectionDirty(
    { id: "website-payments", label: "Payments", anchorId: "website-payments" },
    dirty,
  );

  async function connectStripe() {
    if (dirty) {
      toast.error("Save your payment settings before connecting Stripe.");
      return;
    }

    if (saved.provider !== "stripe") {
      toast.error("Select and save Stripe first.");
      return;
    }

    setIsConnectingStripe(true);

    try {
      const response = await fetch(
        "/api/websites/payments/stripe/connect",
        { method: "POST" },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Unable to start Stripe onboarding.");
      }

      window.location.assign(data.url);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to start Stripe onboarding.",
      );
      setIsConnectingStripe(false);
    }
  }

  async function refreshStripe() {
    setIsRefreshingStripe(true);

    try {
      const response = await fetch(
        "/api/websites/payments/stripe/sync",
        { method: "POST" },
      );
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to refresh Stripe status.",
        );
      }

      setReadiness(data);
      toast.success(
        data.ready
          ? "Stripe is ready for website payments."
          : "Stripe status refreshed.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to refresh Stripe status.",
      );
    } finally {
      setIsRefreshingStripe(false);
    }
  }

  async function save() {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const response = await fetch("/api/websites/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "paymentSettings",
          data: settings,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to save payment settings.");

      const next = stateFromWebsite(data.website);
      setSettings(next);
      setSaved(next);
      toast.success("Website payment settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save payment settings.");
    } finally {
      setIsSaving(false);
    }
  }

  useSettingsSectionActions("website-payments", {
    save,
    discard: () => setSettings(saved),
    isSaving,
  });

  return (
    <section
      id="website-payments"
      className="scroll-mt-28 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-100 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
            <CreditCard size={21} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-gray-950">
              Website Payments
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              BloomWebsites launches with Stripe. Fiserv is coming soon. Bloom does not add a transaction fee.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-7">
        <div className="grid gap-3 sm:grid-cols-2">
          {(["stripe", "fiserv"] as Provider[]).map((provider) => {
            const unavailable = provider === "fiserv";

            return (
              <button
                key={provider}
                type="button"
                disabled={unavailable}
                onClick={() =>
                  setSettings((s) => ({ ...s, provider }))
                }
                className={`rounded-2xl border p-5 text-left ${
                  settings.provider === provider
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 bg-white"
                } ${
                  unavailable
                    ? "cursor-not-allowed opacity-60"
                    : "transition hover:border-purple-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-gray-950">
                    {provider === "stripe" ? "Stripe" : "Fiserv"}
                  </p>
                  {unavailable ? (
                    <span className="rounded-full bg-gray-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-gray-600">
                      Coming Soon
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  {provider === "stripe"
                    ? "Direct connected-account card payments."
                    : "Fiserv merchant processing is not available in the launch release."}
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                {readiness?.ready && (
                  <CheckCircle2 size={18} className="text-emerald-600" />
                )}
                <p className="text-sm font-black text-gray-950">
                  Connection status
                </p>
              </div>

              <p className="mt-1 text-sm leading-6 text-gray-600">
                {readiness?.ready
                  ? "Stripe is ready to accept website payments and send payouts."
                  : readiness?.connection?.status
                    ? `Stripe connection is ${readiness.connection.status}.`
                    : settings.provider === "stripe"
                      ? "Stripe still needs to be connected for this florist."
                      : "Fiserv production onboarding is not activated yet."}
              </p>

              {settings.provider === "stripe" && readiness?.connection && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                  <span className={`rounded-full px-2.5 py-1 ${
                    readiness.connection.chargesEnabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-200 text-gray-600"
                  }`}>
                    Charges {readiness.connection.chargesEnabled ? "On" : "Pending"}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 ${
                    readiness.connection.payoutsEnabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-200 text-gray-600"
                  }`}>
                    Payouts {readiness.connection.payoutsEnabled ? "On" : "Pending"}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 ${
                    readiness.connection.detailsSubmitted
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-200 text-gray-600"
                  }`}>
                    Verification {readiness.connection.detailsSubmitted ? "Submitted" : "Pending"}
                  </span>
                </div>
              )}
            </div>

            {saved.provider === "stripe" && !dirty && (
              <div className="flex shrink-0 flex-wrap gap-2">
                {readiness?.connection?.providerAccountId && (
                  <button
                    type="button"
                    onClick={refreshStripe}
                    disabled={isRefreshingStripe || isConnectingStripe}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-black text-gray-700 disabled:opacity-50"
                  >
                    {isRefreshingStripe ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <RefreshCw size={15} />
                    )}
                    Refresh
                  </button>
                )}

                <button
                  type="button"
                  onClick={connectStripe}
                  disabled={isConnectingStripe || isRefreshingStripe}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                >
                  {isConnectingStripe ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <ExternalLink size={15} />
                  )}
                  {readiness?.connection?.providerAccountId
                    ? readiness?.ready
                      ? "Review Stripe"
                      : "Continue Stripe Setup"
                    : "Connect Stripe"}
                </button>
              </div>
            )}
          </div>

          {settings.provider === "stripe" && dirty && (
            <p className="mt-4 text-xs font-semibold leading-5 text-amber-700">
              Save these payment settings before starting Stripe onboarding.
            </p>
          )}
        </div>

        <label className="flex items-center justify-between gap-5 rounded-2xl border border-gray-200 p-4">
          <div>
            <p className="font-black text-gray-950">Enable website payments</p>
            <p className="mt-1 text-sm text-gray-500">
              Checkout will still refuse payment until the selected merchant connection is active.
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
          />
        </label>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || isSaving}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            <Save size={17} />
            {isSaving ? "Saving..." : "Save payment settings"}
          </button>
        </div>
      </div>
    </section>
  );
}
