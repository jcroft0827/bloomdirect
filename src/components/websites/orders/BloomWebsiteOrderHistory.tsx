import { AlertTriangle, History } from "lucide-react";

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function displayValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "Blank";

  if (
    typeof value === "number" &&
    (field.endsWith("Cents") || field.toLowerCase().includes("amountcents"))
  ) {
    return money(value);
  }

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  if (field === "status" || field === "payment.status") {
    return titleCase(String(value));
  }

  return String(value);
}

export default function BloomWebsiteOrderHistory({
  events,
}: {
  events: any[];
}) {
  const sorted = [...(events || [])].sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-center gap-2">
        <History size={19} className="text-purple-700" />
        <h2 className="text-xl font-black text-gray-950">Order History</h2>
      </div>
      <p className="mt-1 text-sm leading-6 text-gray-500">
        Permanent audit trail of meaningful changes to this order, including who made them and why.
      </p>

      {sorted.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
          This order predates unified order-history tracking. Existing fulfillment and refund records remain intact; new changes will be recorded here.
        </div>
      ) : (
        <div className="mt-6 divide-y divide-gray-100">
          {sorted.map((event) => {
            const changes = Array.isArray(event.changes) ? event.changes : [];
            const actorLabel =
              event.actor?.label ||
              (event.actor?.type ? titleCase(event.actor.type) : "Bloom system");

            return (
              <article key={event.eventId} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-gray-950">{event.summary}</p>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-gray-600">
                        {titleCase(event.kind || "history")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      {actorLabel}
                      {event.source ? ` · ${titleCase(event.source)}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs font-semibold text-gray-500">
                    {new Date(event.occurredAt).toLocaleString("en-US")}
                  </p>
                </div>

                {typeof event.amountCents === "number" && (
                  <p className="mt-3 text-sm font-black text-gray-900">
                    Amount: {money(event.amountCents)}
                  </p>
                )}

                {event.reason && (
                  <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3">
                    <p className="text-xs font-black uppercase tracking-wider text-gray-400">Reason</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                      {event.reason}
                    </p>
                  </div>
                )}

                {event.financialReviewRequired && (
                  <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                    <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                    <span>
                      This change may affect tax or delivery economics. The original paid financial snapshot was intentionally not rewritten.
                    </span>
                  </div>
                )}

                {changes.length > 0 && (
                  <details className="mt-3 rounded-xl border border-gray-200 bg-white">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-black text-purple-800">
                      View {changes.length} before/after {changes.length === 1 ? "change" : "changes"}
                    </summary>
                    <div className="space-y-3 border-t border-gray-100 p-4">
                      {changes.map((change: any, index: number) => (
                        <div
                          key={`${event.eventId}-${change.field}-${index}`}
                          className="rounded-xl bg-gray-50 p-3"
                        >
                          <p className="text-sm font-black text-gray-900">{change.label}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-gray-400">{change.field}</p>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Before</p>
                              <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-gray-700">
                                {displayValue(change.field, change.beforeValue)}
                              </pre>
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">After</p>
                              <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-gray-950">
                                {displayValue(change.field, change.afterValue)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
