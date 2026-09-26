"use client";

import BloomWebsiteDomainRoutingPanel from "@/components/websites/BloomWebsiteDomainRoutingPanel";

import {
  Check,
  CheckCircle2,
  Clipboard,
  Globe2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type VerificationRecord = {
  type: "TXT";
  name: string;
  value: string;
};

type BloomWebsiteDomainSettingsProps = {
  initialDomain: string;
  initialVerified: boolean;
  initialVerifiedAt?: string | null;
  initialVerificationToken?: string;
  initialStatus?: "preview" | "live" | "paused";
};

export default function BloomWebsiteDomainSettings({
  initialDomain,
  initialVerified,
  initialVerifiedAt = null,
  initialVerificationToken = "",
  initialStatus = "preview",
}: BloomWebsiteDomainSettingsProps) {
  const [domain, setDomain] = useState(initialDomain);
  const [savedDomain, setSavedDomain] = useState(initialDomain);
  const [verified, setVerified] = useState(initialVerified);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(initialVerifiedAt);
  const [verification, setVerification] = useState<VerificationRecord | null>(
    initialDomain && initialVerificationToken
      ? {
          type: "TXT",
          name: `_bloomverify.${initialDomain}`,
          value: `bloom-site-verification=${initialVerificationToken}`,
        }
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [loadingVerification, setLoadingVerification] = useState(
    Boolean(initialDomain && !initialVerificationToken),
  );
  const [copiedField, setCopiedField] = useState<"name" | "value" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const dirty = domain.trim() !== savedDomain;

  const formattedVerifiedAt = useMemo(() => {
    if (!verifiedAt) {
      return "";
    }

    const date = new Date(verifiedAt);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }, [verifiedAt]);

  useEffect(() => {
    if (!savedDomain || verification) {
      setLoadingVerification(false);
      return;
    }

    let cancelled = false;

    async function loadVerification() {
      setLoadingVerification(true);

      try {
        const response = await fetch("/api/websites/domain", {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as {
          error?: string;
          website?: {
            customDomain?: string;
            domainVerified?: boolean;
            domainVerifiedAt?: string | null;
            verification?: VerificationRecord | null;
          };
        };

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load verification.");
        }

        if (cancelled) {
          return;
        }

        setVerified(Boolean(payload.website?.domainVerified));
        setVerifiedAt(payload.website?.domainVerifiedAt || null);
        setVerification(payload.website?.verification || null);
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load verification.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingVerification(false);
        }
      }
    }

    void loadVerification();

    return () => {
      cancelled = true;
    };
  }, [savedDomain, verification]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/websites/domain", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customDomain: domain,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        website?: {
          customDomain?: string;
          domainVerified?: boolean;
          domainVerifiedAt?: string | null;
          verification?: VerificationRecord | null;
        };
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save your domain.");
      }

      const nextDomain = payload.website?.customDomain || "";

      setDomain(nextDomain);
      setSavedDomain(nextDomain);
      setVerified(Boolean(payload.website?.domainVerified));
      setVerifiedAt(payload.website?.domainVerifiedAt || null);
      setVerification(payload.website?.verification || null);
      setMessage(
        payload.website?.domainVerified
          ? "Domain saved and remains verified."
          : "Domain saved. Add the TXT record below, then check verification.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save your domain.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckVerification() {
    if (checking || dirty || !savedDomain) {
      return;
    }

    setChecking(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/websites/domain", {
        method: "POST",
      });

      const payload = (await response.json()) as {
        error?: string;
        verified?: boolean;
        website?: {
          domainVerified?: boolean;
          domainVerifiedAt?: string | null;
          verification?: VerificationRecord | null;
        };
        verification?: VerificationRecord;
      };

      if (!response.ok) {
        if (payload.verification) {
          setVerification(payload.verification);
        }

        throw new Error(payload.error || "Domain verification failed.");
      }

      setVerified(Boolean(payload.website?.domainVerified ?? payload.verified));
      setVerifiedAt(payload.website?.domainVerifiedAt || new Date().toISOString());
      setVerification(payload.website?.verification || verification);
      setMessage("Domain ownership verified successfully.");
    } catch (caughtError) {
      setVerified(false);
      setVerifiedAt(null);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Domain verification failed.",
      );
    } finally {
      setChecking(false);
    }
  }

  async function handleRemoveDomain() {
    if (!savedDomain || removing || initialStatus === "live") {
      return;
    }

    setRemoving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/websites/domain", {
        method: "DELETE",
      });

      const payload = (await response.json()) as {
        error?: string;
        website?: {
          customDomain?: string;
          domainVerified?: boolean;
          domainVerifiedAt?: string | null;
          verification?: VerificationRecord | null;
        };
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to remove your domain.");
      }

      setDomain("");
      setSavedDomain("");
      setVerified(false);
      setVerifiedAt(null);
      setVerification(null);
      setConfirmingRemoval(false);
      setMessage(
        "Domain removed from this BloomWebsite and detached from Bloom hosting.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to remove your domain.",
      );
    } finally {
      setRemoving(false);
    }
  }

  async function copyValue(field: "name" | "value", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);

      window.setTimeout(() => {
        setCopiedField((current) => (current === field ? null : current));
      }, 1500);
    } catch {
      setError("Copy failed. Select the text and copy it manually.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
            <Globe2 size={24} />
          </div>

          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-950">
              Your website domain
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
              Enter the domain customers should use for your flower shop.
              Bloom verifies ownership before any public storefront routing is
              enabled.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="custom-domain"
              className="text-sm font-black text-gray-900"
            >
              Custom domain
            </label>

            <div className="mt-2 flex items-center overflow-hidden rounded-2xl border border-gray-300 bg-white focus-within:border-purple-500 focus-within:ring-4 focus-within:ring-purple-100">
              <span className="border-r border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-bold text-gray-500">
                https://
              </span>

              <input
                id="custom-domain"
                value={domain}
                onChange={(event) => {
                  setDomain(event.target.value);
                  setMessage("");
                  setError("");
                }}
                placeholder="www.yourflowershop.com"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="min-w-0 flex-1 border-0 px-4 py-3.5 text-base font-semibold text-gray-950 outline-none"
              />
            </div>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              You can enter the domain with or without https://. Paths such as
              /shop are removed automatically.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {message}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-bold">
              {verified ? (
                <>
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span className="text-emerald-700">
                    Domain verified
                    {formattedVerifiedAt ? ` · ${formattedVerifiedAt}` : ""}
                  </span>
                </>
              ) : savedDomain ? (
                <>
                  <ShieldCheck size={18} className="text-amber-600" />
                  <span className="text-amber-700">Verification required</span>
                </>
              ) : (
                <span className="text-gray-500">No domain saved yet</span>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || !domain.trim() || !dirty}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {saving ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save domain"
              )}
            </button>
          </div>
        </form>

        {savedDomain && (
          <div className="mt-6 border-t border-gray-100 pt-6">
            {initialStatus === "live" ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-950">
                  Pause the website before changing or removing its domain.
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-900/80">
                  Bloom keeps the active public hostname locked while the
                  storefront is live so customers are not unexpectedly sent to
                  a broken or detached site.
                </p>
              </div>
            ) : confirmingRemoval ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <p className="font-black text-red-950">
                  Remove {savedDomain} from this BloomWebsite?
                </p>
                <p className="mt-2 text-sm leading-6 text-red-900/80">
                  Bloom will detach the hostname from production hosting and
                  clear its ownership and routing state. Your DNS records at
                  the domain provider are not deleted automatically.
                </p>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void handleRemoveDomain()}
                    disabled={removing}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
                  >
                    {removing ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 size={17} />
                        Remove domain
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmingRemoval(false)}
                    disabled={removing}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-black text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Keep domain
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setConfirmingRemoval(true);
                  setMessage("");
                  setError("");
                }}
                disabled={saving || checking || dirty}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={17} />
                Remove domain
              </button>
            )}
          </div>
        )}
      </section>

      {savedDomain && (
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ShieldCheck size={24} />
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight text-gray-950">
                Verify domain ownership
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                Add this TXT record with the company that manages DNS for{" "}
                <span className="font-bold text-gray-900">{savedDomain}</span>.
                Bloom uses it only to confirm that this domain belongs to your
                shop.
              </p>
            </div>
          </div>

          {loadingVerification ? (
            <div className="mt-7 flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-4 text-sm font-bold text-gray-600">
              <Loader2 size={18} className="animate-spin" />
              Preparing verification record...
            </div>
          ) : verification ? (
            <div className="mt-7 space-y-4">
              <DnsField
                label="Type"
                value={verification.type}
              />

              <DnsField
                label="Full DNS name / host"
                value={verification.name}
                copyLabel="name"
                copiedField={copiedField}
                onCopy={copyValue}
              />

              <DnsField
                label="Value"
                value={verification.value}
                copyLabel="value"
                copiedField={copiedField}
                onCopy={copyValue}
              />

              <div className="rounded-2xl bg-purple-50 px-4 py-4 text-sm leading-6 text-purple-950">
                Some DNS providers automatically append your domain to the Host
                or Name field. If yours does, avoid entering the domain twice.
                The final TXT record must resolve at{" "}
                <span className="break-all font-black">
                  {verification.name}
                </span>
                .
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-gray-500">
                  DNS updates are not always immediate. If Bloom cannot see the
                  record yet, you can safely try again later.
                </p>

                <button
                  type="button"
                  onClick={handleCheckVerification}
                  disabled={checking || dirty}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {checking ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Checking DNS...
                    </>
                  ) : verified ? (
                    <>
                      <RefreshCw size={17} />
                      Check again
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      Check verification
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      )}

      <BloomWebsiteDomainRoutingPanel
        domain={savedDomain}
        ownershipVerified={verified && !dirty}
      />

      <section className="rounded-3xl border border-purple-100 bg-purple-50/70 p-6 sm:p-7">
        <p className="text-sm font-black text-purple-950">
          Ownership and routing are two separate checks.
        </p>
        <p className="mt-2 text-sm leading-6 text-purple-900/75">
          Bloom&apos;s TXT record proves the florist controls the domain.
          Hosting setup then attaches that exact hostname to Bloom&apos;s
          production project and verifies that customer traffic can reach it.
        </p>
      </section>
    </div>
  );
}

function DnsField({
  label,
  value,
  copyLabel,
  copiedField,
  onCopy,
}: {
  label: string;
  value: string;
  copyLabel?: "name" | "value";
  copiedField?: "name" | "value" | null;
  onCopy?: (field: "name" | "value", value: string) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">
        {label}
      </p>

      <div className="mt-2 flex items-start gap-3">
        <code className="min-w-0 flex-1 break-all text-sm font-bold text-gray-950">
          {value}
        </code>

        {copyLabel && onCopy && (
          <button
            type="button"
            onClick={() => void onCopy(copyLabel, value)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100"
            aria-label={`Copy ${label.toLowerCase()}`}
          >
            {copiedField === copyLabel ? (
              <Check size={16} className="text-emerald-600" />
            ) : (
              <Clipboard size={16} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
