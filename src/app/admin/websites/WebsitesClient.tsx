// /app/admin/websites/WebsitesClient.tsx

"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ExternalLink,
  Globe2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type WebsiteVerificationRequest = {
  _id: string;
  shopName: string;
  websiteUrl: string;
  failureReason: string;
  status: string;
  createdAt: string;
};

type WebsiteRequestsResponse = {
  requests?: WebsiteVerificationRequest[];
  error?: string;
};

type WebsiteDecisionResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  warning?: string | null;
  emailSent?: boolean;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeWebsiteUrl(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

export default function WebsitesClient() {
  const [requests, setRequests] = useState<WebsiteVerificationRequest[]>([]);
  const [currentRequestIndex, setCurrentRequestIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<
    "approve" | "decline" | null
  >(null);

  const [declineRequest, setDeclineRequest] =
    useState<WebsiteVerificationRequest | null>(null);

  const [declineReason, setDeclineReason] = useState("");

  const currentRequest = requests[currentRequestIndex];

  const loadRequests = useCallback(async (showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/admin/websites", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as WebsiteRequestsResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load website verification requests.",
        );
      }

      const nextRequests = Array.isArray(data.requests) ? data.requests : [];

      setRequests(nextRequests);
      setCurrentRequestIndex((currentIndex) => {
        if (nextRequests.length === 0) {
          return 0;
        }

        return Math.min(currentIndex, nextRequests.length - 1);
      });
    } catch (error: unknown) {
      console.error("Failed to load website verification requests:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  function goToPreviousRequest() {
    if (requests.length <= 1) {
      return;
    }

    setCurrentRequestIndex((currentIndex) =>
      currentIndex === 0 ? requests.length - 1 : currentIndex - 1,
    );
  }

  function goToNextRequest() {
    if (requests.length <= 1) {
      return;
    }

    setCurrentRequestIndex((currentIndex) =>
      currentIndex === requests.length - 1 ? 0 : currentIndex + 1,
    );
  }

  async function handleWebsiteDecision(
    requestId: string,
    decision: "approve" | "decline",
    reason?: string,
  ) {
    try {
      setActionLoading(decision);

      const response = await fetch(
        `/api/admin/websites/${requestId}/${decision}`,
        {
          method: "POST",
          headers:
            decision === "decline"
              ? {
                  "Content-Type": "application/json",
                }
              : undefined,

          body:
            decision === "decline"
              ? JSON.stringify({
                  reason,
                })
              : undefined,
        },
      );

      const data = (await response.json()) as WebsiteDecisionResponse;

      if (!response.ok) {
        throw new Error(
          data.error || `Failed to ${decision} verification request.`,
        );
      }

      setRequests((currentRequests) => {
        const nextRequests = currentRequests.filter(
          (request) => request._id !== requestId,
        );

        setCurrentRequestIndex((currentIndex) => {
          if (nextRequests.length === 0) {
            return 0;
          }

          return Math.min(currentIndex, nextRequests.length - 1);
        });

        return nextRequests;
      });

      if (decision === "decline") {
        setDeclineReason("");
        setDeclineReason("");
      }

      toast.success(
        data.message ||
          (decision === "approve"
            ? "Website verification approved."
            : "Website verification declined."),
      );

      if (data.warning) {
        toast.error(data.warning, {
          duration: 6000,
        });
      }
    } catch (error: unknown) {
      console.error(`Failed to ${decision} website verification:`, error);
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-400" />

          <p className="mt-3 text-sm text-slate-400">
            Loading verification requests...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm font-medium text-slate-400">Pending requests</p>

          <p className="mt-2 text-3xl font-black text-white">
            {requests.length}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Websites currently waiting for manual review.
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div>
            <p className="text-sm font-medium text-slate-400">
              Verification queue
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review websites that could not be verified automatically. Approval
              verifies the florist&apos;s website, while a decline explains what
              needs to be corrected.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadRequests(true)}
            disabled={refreshing}
            className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh queue
          </button>
        </div>
      </section>

      {requests.length === 0 || !currentRequest ? (
        <section className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
          </div>

          <h2 className="mt-5 text-xl font-bold text-white">
            The verification queue is clear
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
            There are currently no florist websites waiting for manual
            verification.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
            <div>
              <p className="text-sm font-semibold text-white">
                Request {currentRequestIndex + 1} of {requests.length}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Review the website and choose an action.
              </p>
            </div>

            {requests.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPreviousRequest}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Previous website request"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={goToNextRequest}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Next website request"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10">
                  <Globe2 className="h-6 w-6 text-violet-400" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white">
                    {currentRequest.shopName || "Unnamed florist"}
                  </h2>

                  <a
                    href={normalizeWebsiteUrl(currentRequest.websiteUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex max-w-full items-center gap-2 break-all text-sm font-medium text-violet-300 transition hover:text-violet-200"
                  >
                    {currentRequest.websiteUrl}
                    <ExternalLink className="h-4 w-4 shrink-0" />
                  </a>
                </div>
              </div>

              <div className="mt-8 rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
                  Automatic verification failure
                </p>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                  {currentRequest.failureReason ||
                    "No automatic verification failure reason was provided."}
                </p>
              </div>
            </div>

            <aside className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-5 w-5 text-slate-500" />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Submitted
                    </p>

                    <p className="mt-1 text-sm font-medium leading-6 text-slate-200">
                      {formatDateTime(currentRequest.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Current status
                  </p>

                  <span className="mt-2 inline-flex rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold capitalize text-amber-300">
                    {currentRequest.status || "pending"}
                  </span>
                </div>
              </div>

              <div className="grid gap-3">
                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={() =>
                    void handleWebsiteDecision(currentRequest._id, "approve")
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "approve" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Approve website
                </button>

                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={() => {
                    setDeclineRequest(currentRequest);
                    setDeclineReason(currentRequest.failureReason || "");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-400/[0.06] px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === "decline" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  Decline request
                </button>
              </div>
            </aside>
          </div>
        </section>
      )}

      {declineRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="decline-website-title"
        >
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-300">
                  Decline website
                </p>

                <h2
                  id="decline-website-title"
                  className="mt-2 text-xl font-bold text-white"
                >
                  Explain what needs to be corrected
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  This explanation may be sent to{" "}
                  <span className="font-semibold text-slate-300">
                    {declineRequest.shopName || "the florist"}
                  </span>
                  .
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (actionLoading === null) {
                    setDeclineRequest(null);
                    setDeclineReason("");
                  }
                }}
                disabled={actionLoading !== null}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                aria-label="Close decline modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6">
              <label
                htmlFor="website-decline-reason"
                className="text-sm font-semibold text-slate-200"
              >
                Decline reason
              </label>

              <textarea
                id="website-decline-reason"
                value={declineReason}
                onChange={(event) => setDeclineReason(event.target.value)}
                rows={5}
                maxLength={500}
                placeholder="Explain why the website could not be verified and what the florist should correct."
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-red-400/40 focus:ring-2 focus:ring-red-400/10"
              />

              <div className="mt-2 flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500">Minimum 10 characters.</p>

                <p className="text-xs text-slate-500">
                  {declineReason.length}/500
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={actionLoading !== null}
                onClick={() => {
                  setDeclineRequest(null);
                  setDeclineReason("");
                }}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  actionLoading !== null || declineReason.trim().length < 10
                }
                onClick={() =>
                  void handleWebsiteDecision(
                    declineRequest._id,
                    "decline",
                    declineReason.trim(),
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "decline" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Confirm decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
