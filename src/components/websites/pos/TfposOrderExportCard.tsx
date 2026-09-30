"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, Code2, Loader2, RefreshCcw, Send, TriangleAlert } from "lucide-react";

type Attempt = {
  attemptNumber: number;
  trigger: "automatic" | "manual" | "retry" | "system";
  status: "processing" | "uploaded" | "failed";
  startedAt: string;
  completedAt?: string | null;
  errorMessage?: string;
};

type ExportState = {
  paid: boolean;
  integrationConfigured: boolean;
  integrationEnabled: boolean;
  automaticExport: boolean;
  protocol: string;
  export: null | {
    id: string;
    status: "pending" | "processing" | "uploaded" | "failed";
    filename: string;
    transportProtocol: string;
    firstUploadedAt?: string | null;
    lastUploadedAt?: string | null;
    lastAttemptAt?: string | null;
    lastErrorCode?: string;
    lastErrorMessage?: string;
    attempts: Attempt[];
  };
};

export default function TfposOrderExportCard({ orderId }: { orderId: string }) {
  const [state, setState] = useState<ExportState | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/websites/orders/${orderId}/tfpos-export`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load TFPOS status.");
      setState(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load TFPOS status.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    setSending(true);
    setError("");

    try {
      const response = await fetch(`/api/websites/orders/${orderId}/tfpos-export`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send order to TFPOS.");
      setState(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send order to TFPOS.");
      await load();
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
          <Loader2 size={17} className="animate-spin" />
          Loading TFPOS export status...
        </div>
      </section>
    );
  }

  if (!state?.paid) return null;

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-950">The Floral POS</h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Track the XML handoff for this paid website order.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <a
            href={`/api/websites/orders/${orderId}/tfpos-preview`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-black text-purple-800 transition hover:border-purple-300 hover:bg-purple-100"
          >
            <Code2 size={16} />
            Preview XML
          </a>

          {state.integrationConfigured && state.integrationEnabled ? (
            <button
              type="button"
              onClick={send}
              disabled={sending || state.export?.status === "processing"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-black text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending || state.export?.status === "processing" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : state.export ? (
                <RefreshCcw size={16} />
              ) : (
                <Send size={16} />
              )}
              {state.export ? "Resend to TFPOS" : "Send to TFPOS"}
            </button>
          ) : (
            <Link
              href="/dashboard/websites/integrations/tfpos"
              className="inline-flex items-center justify-center rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-black text-purple-800"
            >
              Configure TFPOS
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <TriangleAlert size={17} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!state.integrationConfigured && (
        <p className="mt-4 text-sm text-gray-500">
          The Floral POS has not been configured for this BloomWebsite yet.
        </p>
      )}

      {state.integrationConfigured && !state.integrationEnabled && (
        <p className="mt-4 text-sm text-gray-500">
          The Floral POS integration exists but is currently disabled.
        </p>
      )}

      {state.export && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {state.export.status === "uploaded" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800">
                <CheckCircle2 size={14} /> Uploaded
              </span>
            ) : state.export.status === "failed" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-800">
                <TriangleAlert size={14} /> Failed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                <Clock3 size={14} /> {state.export.status === "processing" ? "Sending" : "Pending"}
              </span>
            )}
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {state.export.transportProtocol.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">{state.export.filename}</span>
          </div>

          {state.export.lastUploadedAt && (
            <p className="mt-3 text-sm text-gray-600">
              Last uploaded {new Date(state.export.lastUploadedAt).toLocaleString()}.
            </p>
          )}

          {state.export.lastErrorMessage && (
            <p className="mt-3 text-sm font-semibold text-red-700">
              {state.export.lastErrorMessage}
            </p>
          )}

          {state.export.attempts?.length > 0 && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <p className="text-xs font-black uppercase tracking-wider text-gray-400">
                Recent attempts
              </p>
              <div className="mt-2 space-y-2">
                {state.export.attempts.map((attempt) => (
                  <div
                    key={attempt.attemptNumber}
                    className="flex flex-col justify-between gap-1 text-xs text-gray-600 sm:flex-row sm:gap-4"
                  >
                    <span>
                      #{attempt.attemptNumber} · {attempt.trigger} · {attempt.status}
                    </span>
                    <span>{new Date(attempt.startedAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
