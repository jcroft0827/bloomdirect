"use client";

import {
  Check,
  CheckCircle2,
  Clipboard,
  Cloud,
  Loader2,
  RefreshCw,
  Route,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type RoutingDnsRecord = {
  type: "A" | "CNAME";
  name: string;
  value: string;
};

type ProviderVerification = {
  type?: string;
  domain?: string;
  value?: string;
  reason?: string;
};

type RoutingStatus = {
  providerConfigured: boolean;
  attached: boolean;
  projectVerified: boolean;
  routingReady: boolean;
  configuredBy: string | null;
  dnsRecord: RoutingDnsRecord | null;
  providerVerification: ProviderVerification[];
  message: string;
};

type ApiPayload = {
  error?: string;
  ownershipVerified?: boolean;
  routing?: RoutingStatus;
  routingVerifiedAt?: string | null;
};

type BloomWebsiteDomainRoutingPanelProps = {
  domain: string;
  ownershipVerified: boolean;
};

export default function BloomWebsiteDomainRoutingPanel({
  domain,
  ownershipVerified,
}: BloomWebsiteDomainRoutingPanelProps) {
  const [status, setStatus] = useState<RoutingStatus | null>(null);
  const [routingVerifiedAt, setRoutingVerifiedAt] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState<"name" | "value" | null>(null);
  const [error, setError] = useState("");

  const formattedVerifiedAt = useMemo(() => {
    if (!routingVerifiedAt) {
      return "";
    }

    const date = new Date(routingVerifiedAt);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }, [routingVerifiedAt]);

  async function loadStatus() {
    if (!domain || !ownershipVerified) {
      setStatus(null);
      setRoutingVerifiedAt(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/websites/domain/routing", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as ApiPayload;

      if (!response.ok) {
        throw new Error(payload.error || "Unable to check storefront routing.");
      }

      setStatus(payload.routing || null);
      setRoutingVerifiedAt(payload.routingVerifiedAt || null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to check storefront routing.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
    // The domain/verification pair is the public routing identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, ownershipVerified]);

  async function handleConnect() {
    if (!domain || !ownershipVerified || connecting) {
      return;
    }

    setConnecting(true);
    setError("");

    try {
      const response = await fetch("/api/websites/domain/routing", {
        method: "POST",
      });

      const payload = (await response.json()) as ApiPayload;

      if (!response.ok) {
        throw new Error(payload.error || "Unable to connect storefront hosting.");
      }

      setStatus(payload.routing || null);
      setRoutingVerifiedAt(payload.routingVerifiedAt || null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to connect storefront hosting.",
      );
    } finally {
      setConnecting(false);
    }
  }

  async function copyValue(field: "name" | "value", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);

      window.setTimeout(() => {
        setCopied((current) => (current === field ? null : current));
      }, 1500);
    } catch {
      setError("Copy failed. Select the DNS value and copy it manually.");
    }
  }

  if (!domain) {
    return null;
  }

  if (!ownershipVerified) {
    return (
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
            <Route size={24} />
          </div>

          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-950">
              Connect storefront routing
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
              Bloom will unlock hosting setup after domain ownership is
              verified. The ownership TXT record above does not send customer
              traffic anywhere by itself.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            status?.routingReady
              ? "bg-emerald-100 text-emerald-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {status?.routingReady ? <CheckCircle2 size={24} /> : <Cloud size={24} />}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black tracking-tight text-gray-950">
            Connect storefront routing
          </h2>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
            Bloom uses Vercel to receive secure production traffic for{" "}
            <span className="font-bold text-gray-900">{domain}</span>. This is
            separate from Bloom&apos;s ownership verification.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-7 flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-4 text-sm font-bold text-gray-600">
          <Loader2 size={18} className="animate-spin" />
          Checking hosting and routing...
        </div>
      ) : status ? (
        <div className="mt-7 space-y-5">
          {!status.providerConfigured ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <ShieldAlert
                  size={20}
                  className="mt-0.5 shrink-0 text-amber-700"
                />

                <div>
                  <p className="font-black text-amber-950">
                    Bloom hosting connection is not configured yet
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-900/80">
                    The site is ownership-verified, but Bloom still needs its
                    private Vercel API credentials configured before this
                    domain can be attached automatically.
                  </p>
                </div>
              </div>
            </div>
          ) : status.routingReady ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-emerald-700"
                />

                <div>
                  <p className="font-black text-emerald-950">
                    Storefront routing is ready
                  </p>
                  <p className="mt-2 text-sm leading-6 text-emerald-900/80">
                    Vercel can receive traffic for this domain
                    {formattedVerifiedAt
                      ? ` · confirmed ${formattedVerifiedAt}`
                      : "."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <p className="font-black text-blue-950">
                {status.attached
                  ? "Hosting connected — DNS routing is next"
                  : "Ready to connect Bloom hosting"}
              </p>

              <p className="mt-2 text-sm leading-6 text-blue-900/80">
                {status.message}
              </p>
            </div>
          )}

          {status.providerVerification.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-black text-amber-950">
                Vercel also requires an account-ownership check
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900/80">
                This can happen when the domain is already associated with a
                different Vercel account or team. Complete the provider record
                below, then check routing again.
              </p>

              <div className="mt-4 space-y-3">
                {status.providerVerification.map((challenge, index) => (
                  <div
                    key={`${challenge.domain || "provider"}-${index}`}
                    className="rounded-xl border border-amber-200 bg-white/70 p-4"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-700">
                      {challenge.type || "TXT"}
                    </p>
                    {challenge.domain && (
                      <code className="mt-2 block break-all text-sm font-bold text-gray-950">
                        {challenge.domain}
                      </code>
                    )}
                    {challenge.value && (
                      <code className="mt-2 block break-all text-sm font-bold text-gray-700">
                        {challenge.value}
                      </code>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {status.dnsRecord && !status.routingReady && (
            <div>
              <div>
                <p className="text-sm font-black text-gray-950">
                  Routing DNS record
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Add or update this record with the DNS provider that manages{" "}
                  {domain}. Bloom reads Vercel&apos;s current recommended value
                  instead of hard-coding a destination.
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <RoutingField
                  label="Type"
                  value={status.dnsRecord.type}
                />
                <RoutingField
                  label="Name / Host"
                  value={status.dnsRecord.name}
                  field="name"
                  copied={copied}
                  onCopy={copyValue}
                />
                <RoutingField
                  label="Value / Points to"
                  value={status.dnsRecord.value}
                  field="value"
                  copied={copied}
                  onCopy={copyValue}
                />
              </div>

              <div className="mt-4 rounded-2xl bg-purple-50 px-4 py-4 text-sm leading-6 text-purple-950">
                Remove conflicting A or CNAME records for this exact hostname
                before checking again. Keep unrelated MX, TXT, email, and other
                DNS records intact.
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-gray-500">
              DNS propagation can take time. Checking again is safe and does
              not create duplicate storefronts.
            </p>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              {status.providerConfigured && !status.attached && (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={connecting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {connecting ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Cloud size={17} />
                      Connect hosting
                    </>
                  )}
                </button>
              )}

              {status.providerConfigured && status.attached && (
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={loading || connecting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {connecting ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={17} />
                      Check routing
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function RoutingField({
  label,
  value,
  field,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  field?: "name" | "value";
  copied?: "name" | "value" | null;
  onCopy?: (field: "name" | "value", value: string) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">
        {label}
      </p>

      <div className="mt-2 flex items-start gap-2">
        <code className="min-w-0 flex-1 break-all text-sm font-bold text-gray-950">
          {value}
        </code>

        {field && onCopy && (
          <button
            type="button"
            onClick={() => void onCopy(field, value)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100"
            aria-label={`Copy ${label.toLowerCase()}`}
          >
            {copied === field ? (
              <Check size={15} className="text-emerald-600" />
            ) : (
              <Clipboard size={15} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
