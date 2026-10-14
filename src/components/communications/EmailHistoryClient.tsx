"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Mail,
  RefreshCw,
  Search,
  Send,
  TriangleAlert,
} from "lucide-react";
import toast from "react-hot-toast";

import BloomSpinner from "@/components/BloomSpinner";

type EmailEvent = {
  _id: string;
  type: string;
  to: string;
  subject: string;
  status: "sent" | "failed";
  error?: string;
  resendId?: string;
  createdAt: string;
  updatedAt: string;
};

type EmailSource =
  | "BloomWebsites"
  | "GetBloomDirect"
  | "Invitations"
  | "Account"
  | "System";

function formatTypeLabel(type: string) {
  const labels: Record<string, string> = {
    invite_florist: "Florist Invitation",
    "invite-florist": "Florist Invitation",
    admin_invite_florist: "Florist Invitation",
    outside_network_order_email: "Outside-Network Order",
    password_reset: "Password Reset",
    bloomwebsite_customer_order_confirmation: "Website Order Confirmation",
    bloomwebsite_florist_new_order: "Website New Order",
    bloomwebsite_customer_status_update: "Website Status Update",
    bloomwebsite_customer_delivery_confirmation: "Website Delivery Confirmation",
    bloomwebsite_customer_refund_confirmation: "Website Refund Confirmation",
    bloomwebsite_customer_arrangement_photo: "Website Arrangement Photo",
  };

  if (labels[type]) return labels[type];

  return type
    .replace(/^bloomwebsite_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getEmailSource(type: string): EmailSource {
  if (
    type === "invite_florist" ||
    type === "invite-florist" ||
    type === "admin_invite_florist"
  ) {
    return "Invitations";
  }

  if (type.startsWith("bloomwebsite_")) {
    return "BloomWebsites";
  }

  if (type === "outside_network_order_email") {
    return "GetBloomDirect";
  }

  if (type === "password_reset") {
    return "Account";
  }

  return "System";
}

function sourceBadgeClass(source: EmailSource) {
  switch (source) {
    case "BloomWebsites":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "GetBloomDirect":
      return "border-purple-200 bg-purple-50 text-purple-700";
    case "Invitations":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "Account":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function isResendableInvitation(type: string) {
  return type === "invite_florist" || type === "invite-florist";
}

export default function EmailHistoryClient() {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [resendingId, setResendingId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchEmailEvents = async (showRefreshState = false) => {
    if (showRefreshState) setRefreshing(true);

    try {
      setError(null);
      const res = await fetch("/api/email/email-history", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch email history");
      }

      setEvents(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchEmailEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return events.filter((event) => {
      const source = getEmailSource(event.type);

      if (statusFilter !== "all" && event.status !== statusFilter) return false;
      if (typeFilter !== "all" && event.type !== typeFilter) return false;
      if (sourceFilter !== "all" && source !== sourceFilter) return false;

      if (
        searchTerm &&
        !event.to.toLowerCase().includes(searchTerm) &&
        !event.subject.toLowerCase().includes(searchTerm)
      ) {
        return false;
      }

      return true;
    });
  }, [events, search, sourceFilter, statusFilter, typeFilter]);

  const eventTypes = useMemo(
    () => [...new Set(events.map((event) => event.type).filter(Boolean))].sort(),
    [events],
  );

  const counts = useMemo(() => {
    const sent = events.filter((event) => event.status === "sent").length;
    const failed = events.filter((event) => event.status === "failed").length;

    return { total: events.length, sent, failed };
  }, [events]);

  const handleResend = async (id: string) => {
    try {
      setResendingId(id);

      const res = await fetch("/api/email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailEventId: id }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to resend email");
      }

      toast.success("Invitation email sent again.");
      await fetchEmailEvents();
    } catch (resendError) {
      console.error("RESEND ERROR:", resendError);
      toast.error(
        "Failed to resend the invitation. Please try again. If the issue persists, contact GetBloomDirect support.",
      );
    } finally {
      setResendingId("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <BloomSpinner size={72} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-br from-purple-50 via-white to-emerald-50 px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-purple-600">
                <Mail className="h-4 w-4" aria-hidden="true" />
                Communications
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Email History
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                See email activity from BloomWebsites, GetBloomDirect, florist invitations, and account messages in one shared place.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void fetchEmailEvents(true)}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-purple-200 hover:text-purple-700 disabled:cursor-wait disabled:opacity-60 lg:self-auto"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-3 px-5 py-5 sm:grid-cols-3 sm:px-7">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Recorded</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{counts.total}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-600">Sent</p>
            <p className="mt-1 text-2xl font-black text-emerald-800">{counts.sent}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-red-500">Failed</p>
            <p className="mt-1 text-2xl font-black text-red-700">{counts.failed}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,0.7fr))]">
          <label className="relative block">
            <span className="sr-only">Search email history</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search recipient or subject…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
            />
          </label>

          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
          >
            <option value="all">All Sources</option>
            <option value="BloomWebsites">BloomWebsites</option>
            <option value="GetBloomDirect">GetBloomDirect</option>
            <option value="Invitations">Invitations</option>
            <option value="Account">Account</option>
            <option value="System">System</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
          >
            <option value="all">All Email Types</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {formatTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">Email history could not be loaded.</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        ) : null}

        {!error && !filteredEvents.length ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
            <Mail className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-base font-bold text-slate-700">No emails match these filters.</p>
            <p className="mt-1 text-sm text-slate-500">Try clearing a filter or changing your search.</p>
          </div>
        ) : null}

        {!error && filteredEvents.length ? (
          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
            {filteredEvents.map((event) => {
              const source = getEmailSource(event.type);
              const createdAt = event.createdAt
                ? new Date(event.createdAt).toLocaleString()
                : "Unknown";

              return (
                <article
                  key={event._id}
                  className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-purple-50/40 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${sourceBadgeClass(source)}`}
                        >
                          {source}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {formatTypeLabel(event.type)}
                        </span>
                      </div>

                      <h2 className="mt-3 break-words text-lg font-black leading-snug text-slate-900">
                        {event.subject}
                      </h2>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide ${
                        event.status === "sent"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {event.status === "sent" ? (
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {event.status}
                    </span>
                  </div>

                  <div className="mt-5 space-y-2 text-sm text-slate-600">
                    <p className="break-all">
                      <span className="font-bold text-slate-800">To:</span> {event.to}
                    </p>
                    <p>
                      <span className="font-bold text-slate-800">Recorded:</span> {createdAt}
                    </p>

                    {event.error ? (
                      <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700">
                        <span className="font-black">Error:</span> {event.error}
                      </div>
                    ) : null}
                  </div>

                  {isResendableInvitation(event.type) ? (
                    <button
                      type="button"
                      disabled={resendingId === event._id}
                      onClick={() => void handleResend(event._id)}
                      className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-700 disabled:cursor-wait disabled:opacity-50"
                    >
                      {resendingId === event._id ? (
                        <BloomSpinner />
                      ) : (
                        <>
                          <Send className="h-4 w-4" aria-hidden="true" />
                          Resend Invitation
                        </>
                      )}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
