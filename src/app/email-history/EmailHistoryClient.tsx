"use client";

import { useEffect, useMemo, useState } from "react";
import BloomSpinner from "@/components/BloomSpinner";

type EmailEvent = {
  _id: string;
  actorId: string;
  eventType: string;
  label?: string;
  to: string;
  template: string;
  status: "pending" | "sent" | "failed";
  provider?: string;
  providerMessageId?: string;
  providerError?: string;
  retryCount?: number;
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

  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmailEvents = async () => {
      try {
        const res = await fetch("/api/email-history");
        if (!res.ok) throw new Error("Failed to fetch email history");
        const data = await res.json();
        setEvents(data);
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    };

    fetchEmailEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (typeFilter !== "all" && e.eventType !== typeFilter) return false;
      if (search && !e.to.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [events, statusFilter, typeFilter, search]);

  const handleResend = async (id: string) => {
    try {
      setResendingId(id);
      const res = await fetch("/api/email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailEventId: id }),
      });

      if (!res.ok) throw new Error("Resend failed");

      const newEvent = await res.json();
      setEvents((prev) => [newEvent, ...prev]);
    } catch (err) {
      alert("Failed to resend email.");
    } finally {
      setResendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <BloomSpinner size={72} />
      </div>
    );
  }

  if (error) {
    return <p className="text-center mt-12 text-red-600 font-semibold">{error}</p>;
  }

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
          {[...new Set(events.map((e) => e.eventType))].map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
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
          {filteredEvents.map((e) => (
            <div
              key={e._id}
              className="bg-gradient-to-br from-white to-purple-50 border border-purple-100 rounded-3xl p-6 shadow-lg"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-xl text-purple-800">
                    {e.label || e.template}
                  </p>
                  <p className="text-gray-600 mt-1 text-sm">
                    {e.eventType.replace("_", " ")}
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-white font-semibold text-sm ${
                    e.status === "sent"
                      ? "bg-green-500"
                      : e.status === "failed"
                      ? "bg-red-500"
                      : "bg-yellow-400 text-gray-800"
                  }`}
                >
                  {e.status.toUpperCase()}
                </span>
              </div>

              <div className="mt-4 text-gray-700 space-y-1 text-sm">
                <p>
                  <span className="font-semibold">To:</span> {e.to}
                </p>

                <p className="text-gray-500 text-xs mt-2">
                  Sent: {new Date(e.createdAt).toLocaleString()}
                </p>
              </div>

              <button
                disabled={resendingId === e._id}
                onClick={() => handleResend(e._id)}
                className="mt-4 w-full rounded-xl bg-purple-600 text-white py-2 font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                {resendingId === e._id ? "Resending…" : "Resend Email"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}