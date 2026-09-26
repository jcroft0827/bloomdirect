"use client";

import {
  Check,
  CircleDollarSign,
  Loader2,
  Package,
  ReceiptText,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

export type BloomWebsiteRefundComponent = {
  kind: "product" | "addon" | "delivery" | "tip";
  referenceId: string;
  label: string;
  detail: string;
  itemIndex: number | null;
  addonIndex: number | null;
  unitAmountCents: number;
  originalQuantity: number | null;
  remainingQuantity: number | null;
  originalPrincipalCents: number;
  remainingPrincipalCents: number;
  originalTaxCents: number;
  remainingTaxCents: number;
};

export type BloomWebsiteRefundContext = {
  orderTotalCents: number;
  successfulRefundedCents: number;
  pendingRefundCents: number;
  committedRefundCents: number;
  remainingRefundableCents: number;
  unallocatedRefundCents: number;
  components: BloomWebsiteRefundComponent[];
};

type Mode = "components" | "tax" | "custom";

type ComponentState = {
  enabled: boolean;
  quantity: number;
  amount: string;
  includeTax: boolean;
};

type TaxState = {
  enabled: boolean;
  amount: string;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function dollarsToCents(value: string) {
  const normalized = value.trim();

  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;

  const [whole, decimal = ""] = normalized.split(".");
  const amount =
    Number(whole) * 100 + Number(decimal.padEnd(2, "0"));

  return Number.isSafeInteger(amount) ? amount : null;
}

function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

function proportionalTax(
  remainingTaxCents: number,
  selectedPrincipalCents: number,
  remainingPrincipalCents: number,
) {
  if (
    remainingTaxCents <= 0 ||
    selectedPrincipalCents <= 0 ||
    remainingPrincipalCents <= 0
  ) {
    return 0;
  }

  if (selectedPrincipalCents >= remainingPrincipalCents) {
    return remainingTaxCents;
  }

  return Math.min(
    remainingTaxCents,
    Math.round(
      (remainingTaxCents * selectedPrincipalCents) /
        remainingPrincipalCents,
    ),
  );
}

function makeRequestKey() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `refund_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function iconFor(kind: BloomWebsiteRefundComponent["kind"]) {
  if (kind === "delivery") return <Truck size={17} />;
  if (kind === "tip") return <CircleDollarSign size={17} />;
  return <Package size={17} />;
}

export default function BloomWebsiteRefundBuilder({
  orderId,
  context,
  onClose,
  onCompleted,
}: {
  orderId: string;
  context: BloomWebsiteRefundContext;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [mode, setMode] = useState<Mode>("components");
  const [componentState, setComponentState] = useState<
    Record<string, ComponentState>
  >({});
  const [taxState, setTaxState] = useState<Record<string, TaxState>>({});
  const [customAmount, setCustomAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const principalComponents = context.components.filter(
    (component) => component.remainingPrincipalCents > 0,
  );
  const taxComponents = context.components.filter(
    (component) => component.remainingTaxCents > 0,
  );

  function componentValue(component: BloomWebsiteRefundComponent) {
    return (
      componentState[component.referenceId] || {
        enabled: false,
        quantity: 1,
        amount: centsToInput(component.remainingPrincipalCents),
        includeTax: component.remainingTaxCents > 0,
      }
    );
  }

  function taxValue(component: BloomWebsiteRefundComponent) {
    return (
      taxState[component.referenceId] || {
        enabled: false,
        amount: centsToInput(component.remainingTaxCents),
      }
    );
  }

  function updateComponent(
    component: BloomWebsiteRefundComponent,
    patch: Partial<ComponentState>,
  ) {
    setComponentState((current) => ({
      ...current,
      [component.referenceId]: {
        ...componentValue(component),
        ...current[component.referenceId],
        ...patch,
      },
    }));
  }

  function updateTax(
    component: BloomWebsiteRefundComponent,
    patch: Partial<TaxState>,
  ) {
    setTaxState((current) => ({
      ...current,
      [component.referenceId]: {
        ...taxValue(component),
        ...current[component.referenceId],
        ...patch,
      },
    }));
  }

  const componentQuote = useMemo(() => {
    let total = 0;

    for (const component of principalComponents) {
      const state =
        componentState[component.referenceId] || {
          enabled: false,
          quantity: 1,
          amount: centsToInput(component.remainingPrincipalCents),
          includeTax: component.remainingTaxCents > 0,
        };

      if (!state.enabled) continue;

      let principal = 0;

      if (
        component.kind === "product" ||
        component.kind === "addon"
      ) {
        const quantity = Math.max(
          1,
          Math.min(
            state.quantity,
            component.remainingQuantity || 1,
          ),
        );
        principal = component.unitAmountCents * quantity;
      } else {
        principal = dollarsToCents(state.amount) || 0;
      }

      principal = Math.min(
        principal,
        component.remainingPrincipalCents,
      );

      const tax = state.includeTax
        ? proportionalTax(
            component.remainingTaxCents,
            principal,
            component.remainingPrincipalCents,
          )
        : 0;

      total += principal + tax;
    }

    return total;
  }, [componentState, principalComponents]);

  const taxQuote = useMemo(() => {
    let total = 0;

    for (const component of taxComponents) {
      const state =
        taxState[component.referenceId] || {
          enabled: false,
          amount: centsToInput(component.remainingTaxCents),
        };

      if (!state.enabled) continue;

      total += Math.min(
        dollarsToCents(state.amount) || 0,
        component.remainingTaxCents,
      );
    }

    return total;
  }, [taxState, taxComponents]);

  const customQuote = dollarsToCents(customAmount) || 0;
  const quotedTotal =
    mode === "components"
      ? componentQuote
      : mode === "tax"
        ? taxQuote
        : customQuote;

  function selections() {
    if (mode === "tax") {
      return taxComponents
        .filter((component) => taxValue(component).enabled)
        .map((component) => ({
          kind: "tax" as const,
          referenceId: component.referenceId,
          amountCents:
            dollarsToCents(taxValue(component).amount) || 0,
        }));
    }

    return principalComponents
      .filter((component) => componentValue(component).enabled)
      .map((component) => {
        const state = componentValue(component);

        if (
          component.kind === "product" ||
          component.kind === "addon"
        ) {
          return {
            kind: component.kind,
            referenceId: component.referenceId,
            quantity: state.quantity,
            includeTax: state.includeTax,
          };
        }

        return {
          kind: component.kind,
          referenceId: component.referenceId,
          amountCents: dollarsToCents(state.amount) || 0,
          includeTax: state.includeTax,
        };
      });
  }

  async function submit() {
    if (
      quotedTotal <= 0 ||
      quotedTotal > context.remainingRefundableCents
    ) {
      toast.error(
        quotedTotal > context.remainingRefundableCents
          ? "Refund exceeds the remaining paid balance."
          : "Choose something to refund.",
      );
      return;
    }

    setBusy(true);

    try {
      const body: Record<string, unknown> = {
        reason: reason.trim(),
        idempotencyKey: makeRequestKey(),
      };

      if (mode === "custom") {
        body.amountCents = customQuote;
      } else {
        body.selections = selections();
      }

      const response = await fetch(
        `/api/websites/orders/${orderId}/refund`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Unable to issue refund.");
      }

      toast.success(
        data?.refundStatus === "pending"
          ? `${money(data.amountCents)} refund submitted.`
          : `${money(data.amountCents)} refunded.`,
      );

      onCompleted();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to issue refund.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-3 py-5 sm:px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-builder-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5 sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-red-600">
              Payment
            </p>
            <h2
              id="refund-builder-title"
              className="mt-1 text-2xl font-black text-gray-950"
            >
              Build refund
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
              Refund the exact item, charge, tax, tip, or a custom amount.
              Bloom uses the original order and tax snapshot.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close refund builder"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 p-3 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                Order
              </p>
              <p className="mt-1 text-sm font-black text-gray-950">
                {money(context.orderTotalCents)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                Refunded
              </p>
              <p className="mt-1 text-sm font-black text-gray-950">
                {money(context.successfulRefundedCents)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                Pending
              </p>
              <p className="mt-1 text-sm font-black text-gray-950">
                {money(context.pendingRefundCents)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                Available
              </p>
              <p className="mt-1 text-sm font-black text-red-700">
                {money(context.remainingRefundableCents)}
              </p>
            </div>
          </div>

          {context.unallocatedRefundCents > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {money(context.unallocatedRefundCents)} of earlier refunds was
              issued as a custom/unallocated amount. Bloom will still prevent
              over-refunding the order, but cannot know which original line
              that older refund represented.
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1.5">
            {[
              ["components", "Items & charges"],
              ["tax", "Tax only"],
              ["custom", "Custom amount"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value as Mode)}
                className={`rounded-xl px-3 py-2.5 text-xs font-black transition sm:text-sm ${
                  mode === value
                    ? "bg-white text-gray-950 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "components" && (
            <div className="mt-5 space-y-3">
              {principalComponents.length === 0 ? (
                <p className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  No item or charge balances remain.
                </p>
              ) : (
                principalComponents.map((component) => {
                  const state = componentValue(component);
                  const quantityBased =
                    component.kind === "product" ||
                    component.kind === "addon";

                  return (
                    <div
                      key={component.referenceId}
                      className={`rounded-2xl border p-4 transition ${
                        state.enabled
                          ? "border-purple-300 bg-purple-50/40"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={state.enabled}
                          onChange={(event) =>
                            updateComponent(component, {
                              enabled: event.target.checked,
                            })
                          }
                          className="mt-1 h-4 w-4 accent-purple-600"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                            <div>
                              <p className="flex items-center gap-2 font-black text-gray-950">
                                <span className="text-purple-700">
                                  {iconFor(component.kind)}
                                </span>
                                {component.label}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {component.detail}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-black text-gray-950">
                              {money(component.remainingPrincipalCents)} remaining
                            </p>
                          </div>

                          {state.enabled && (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              {quantityBased ? (
                                <label>
                                  <span className="mb-1.5 block text-xs font-black text-gray-500">
                                    Quantity
                                  </span>
                                  <select
                                    value={state.quantity}
                                    onChange={(event) =>
                                      updateComponent(component, {
                                        quantity: Number(event.target.value),
                                      })
                                    }
                                    className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-900"
                                  >
                                    {Array.from(
                                      {
                                        length:
                                          component.remainingQuantity || 0,
                                      },
                                      (_, index) => index + 1,
                                    ).map((quantity) => (
                                      <option key={quantity} value={quantity}>
                                        {quantity} × {money(component.unitAmountCents)}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ) : (
                                <label>
                                  <span className="mb-1.5 block text-xs font-black text-gray-500">
                                    Amount
                                  </span>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                                      $
                                    </span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={state.amount}
                                      onChange={(event) =>
                                        updateComponent(component, {
                                          amount: event.target.value,
                                        })
                                      }
                                      className="min-h-11 w-full rounded-xl border border-gray-300 bg-white pl-7 pr-3 text-sm font-bold text-gray-900"
                                    />
                                  </div>
                                </label>
                              )}

                              <label className="flex min-h-11 items-center gap-2 self-end rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={
                                    state.includeTax &&
                                    component.remainingTaxCents > 0
                                  }
                                  disabled={component.remainingTaxCents <= 0}
                                  onChange={(event) =>
                                    updateComponent(component, {
                                      includeTax: event.target.checked,
                                    })
                                  }
                                  className="h-4 w-4 accent-purple-600"
                                />
                                {component.remainingTaxCents > 0
                                  ? `Include original tax (up to ${money(
                                      component.remainingTaxCents,
                                    )})`
                                  : "No tax was charged"}
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {mode === "tax" && (
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                Tax is shown by the original charge it came from. This handles
                mixed taxable/non-taxable items, different tax rates, taxed or
                untaxed delivery, and taxed tips without guessing.
              </div>

              {taxComponents.length === 0 ? (
                <p className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  No refundable tax remains on this order.
                </p>
              ) : (
                taxComponents.map((component) => {
                  const state = taxValue(component);

                  return (
                    <div
                      key={component.referenceId}
                      className="rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={state.enabled}
                          onChange={(event) =>
                            updateTax(component, {
                              enabled: event.target.checked,
                            })
                          }
                          className="mt-1 h-4 w-4 accent-purple-600"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="flex items-center gap-2 font-black text-gray-950">
                                <ReceiptText
                                  size={17}
                                  className="text-purple-700"
                                />
                                Tax on {component.label}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                Originally {money(component.originalTaxCents)} tax
                              </p>
                            </div>
                            <p className="text-sm font-black text-gray-950">
                              {money(component.remainingTaxCents)} remaining
                            </p>
                          </div>

                          {state.enabled && (
                            <label className="mt-3 block">
                              <span className="mb-1.5 block text-xs font-black text-gray-500">
                                Tax amount to refund
                              </span>
                              <div className="relative max-w-xs">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                                  $
                                </span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={state.amount}
                                  onChange={(event) =>
                                    updateTax(component, {
                                      amount: event.target.value,
                                    })
                                  }
                                  className="min-h-11 w-full rounded-xl border border-gray-300 bg-white pl-7 pr-3 text-sm font-bold text-gray-900"
                                />
                              </div>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {mode === "custom" && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
              <p className="font-black text-gray-950">
                Custom refund amount
              </p>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Use this for goodwill adjustments or unusual situations that do
                not map cleanly to an item, tax line, delivery charge, add-on,
                or tip.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={(event) =>
                      setCustomAmount(event.target.value)
                    }
                    placeholder="0.00"
                    className="min-h-12 w-full rounded-xl border border-gray-300 bg-white pl-7 pr-3 text-base font-bold text-gray-950"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCustomAmount(
                      centsToInput(context.remainingRefundableCents),
                    )
                  }
                  className="min-h-12 rounded-xl border border-gray-300 bg-white px-4 text-sm font-black text-gray-700"
                >
                  Refund all remaining
                </button>
              </div>
            </div>
          )}

          <label className="mt-5 block">
            <span className="text-sm font-black text-gray-900">
              Refund reason
              <span className="ml-2 text-xs font-semibold text-gray-400">
                Optional
              </span>
            </span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Example: Customer canceled delivery, item unavailable, price adjustment..."
              className="mt-2 w-full resize-none rounded-2xl border border-gray-300 px-3.5 py-3 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
          </label>
        </div>

        <div className="border-t border-gray-100 bg-gray-50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-gray-400">
              Refund total
            </p>
            <p
              className={`mt-1 text-2xl font-black ${
                quotedTotal > context.remainingRefundableCents
                  ? "text-red-600"
                  : "text-gray-950"
              }`}
            >
              {money(quotedTotal)}
            </p>
          </div>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:mt-0 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm font-black text-gray-700 disabled:opacity-50"
            >
              Keep order
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={
                busy ||
                quotedTotal <= 0 ||
                quotedTotal > context.remainingRefundableCents
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Check size={16} className="mr-2" />
              )}
              Issue {money(quotedTotal)} refund
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
