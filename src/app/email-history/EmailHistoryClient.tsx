"use client";

import { useEffect, useMemo, useState } from "react";
import BloomSpinner from "@/components/BloomSpinner";
import { EmailEvent } from "@/models/EmailEvent";
import { sendInvite as sendInviteRequest } from "@/lib/client/sendInvite";
import toast from "react-hot-toast";

type EmailEvent = {
  _id: string;
  type: string;
  to: string;
  subject: string;
  status: "pending" | "sent" | "failed";
  error?: string;
  payload?: Record<string, any>;
  resendId?: string;
  createdAt: string;
  updatedAt: string;
};

export default function EmailHistoryClient() {
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // ------------------------------
  // Resend States
  // ------------------------------
  const [resendingId, setResendingId] = useState("");

  // ------------------------------
  // Fetch all email events
  // ------------------------------
  const fetchEmailEvents = async () => {
      try {
        const res = await fetch("/api/email/email-history");
        if (!res.ok) throw new Error("Failed to fetch email history");
        const data: EmailEvent[] = await res.json();
        setEvents(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unexpected error";
        setError(message);
      } finally {
        setLoading(false);
      }
  }

  useEffect(() => {
    fetchEmailEvents();
  }, []);

  // ------------------------------
  // Filtered & searchable events
  // ------------------------------
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (search && !e.to.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [events, statusFilter, typeFilter, search]);

  const eventTypes = useMemo(() => {
    return [...new Set(events.map((e) => e.type).filter(Boolean))];
  }, [events]);

  // ------------------------------
  // Resend email handler
  // ------------------------------
  const handleResend = async (id: string) => {
    try {
      setResendingId(id);

      const res = await fetch(`/api/email/email-history/${id}`);
      if (!res.ok) throw new Error("Failed to fetch email history");

      const event = await res.json();

      if (event.type === "invite-florist") {
        await sendInviteRequest({
          to: event.to,
          shopName: event.payload.shopName,
          inviteLink: event.payload.inviteLink,
          personalMessage: event.payload.personalMessage,
        });
      } else {
        throw new Error("Unsupported email type");
      }

      toast.success("Invite send successfully!");
    } catch (error) {
      console.error("RESEND ERROR:", error);
      toast.error(
        "Failed to resend invite. Please try again. If the issue persists, contact GetBloomDirect support."
    );
    } finally {
      setResendingId("");
      fetchEmailEvents();
    }
  };

  // ------------------------------
  // Loading / error states
  // ------------------------------
  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <BloomSpinner size={72} />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center mt-12 text-red-600 font-semibold">{error}</p>
    );
  }

  // ------------------------------
  // Render
  // ------------------------------
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold mb-6 text-purple-700">
        🌸 Email History
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <input
          type="text"
          placeholder="Search by recipient…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-xl border border-purple-200 shadow-sm"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-purple-200"
        >
          <option value="all">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-purple-200"
        >
          <option value="all">All Types</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {!filteredEvents.length ? (
        <p className="text-center mt-12 text-gray-500 text-lg">
          No emails match your filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEvents.map((e) => {
            const typeLabel = e.type || "UNKNOWN TYPE";
            const statusLabel = e.status || "PENDING";
            const createdAt = e.createdAt
              ? new Date(e.createdAt).toLocaleString()
              : "Unknown";

            return (
              <div
                key={e._id} // unique key
                className="bg-gradient-to-br from-white to-purple-50 border border-purple-100 rounded-3xl p-6 shadow-lg"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-xl text-purple-800">
                      {e.subject}
                    </p>
                    <p className="text-gray-600 mt-1 text-sm">
                      {typeLabel.replaceAll("_", " ")}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-white font-semibold text-sm ${
                      statusLabel === "sent"
                        ? "bg-green-500"
                        : statusLabel === "failed"
                          ? "bg-red-500"
                          : "bg-yellow-400 text-gray-800"
                    }`}
                  >
                    {statusLabel.toUpperCase()}
                  </span>
                </div>

                <div className="mt-4 text-gray-700 space-y-1 text-sm">
                  <p>
                    <span className="font-semibold">To:</span> {e.to}
                  </p>

                  {e.error && (
                    <p className="text-red-600 text-xs mt-1">
                      Error: {e.error}
                    </p>
                  )}

                  <p className="text-gray-500 text-xs mt-2">
                    Sent: {createdAt}
                  </p>
                </div>

                <button
                  disabled={resendingId === e._id}
                  onClick={() => handleResend(e._id)}
                  className="mt-4 w-full rounded-xl bg-purple-600 text-white py-2 font-semibold hover:bg-purple-700 disabled:opacity-50"
                >
                  {resendingId === e._id ? <BloomSpinner /> : "Resend Email"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
