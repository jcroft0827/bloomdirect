"use client";

import { Calculator, Save } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  settingsValuesEqual,
  useSettingsSectionActions,
  useSettingsSectionDirty,
} from "./SettingsDirtyState";

function stateFromWebsite(website: any) {
  const tax = website?.taxSettings ?? {};
  return {
    enabled: tax.enabled ?? true,
    defaultRatePercent: String(tax.defaultRatePercent ?? 0),
    deliveryTaxable: tax.deliveryTaxable ?? true,
    deliveryRatePercent:
      tax.deliveryRatePercent == null ? "" : String(tax.deliveryRatePercent),
    tipsEnabled: tax.tipsEnabled ?? true,
    suggestedTipPercentages: Array.isArray(tax.suggestedTipPercentages)
      ? tax.suggestedTipPercentages.join(", ")
      : "10, 15, 20",
    tipsTaxable: tax.tipsTaxable ?? false,
    tipRatePercent:
      tax.tipRatePercent == null ? "" : String(tax.tipRatePercent),
    taxExemptCustomersEnabled: tax.taxExemptCustomersEnabled ?? false,
  };
}

function rate(value: string, nullable = false) {
  if (nullable && !value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error("Tax rates must be between 0% and 100%.");
  }
  return parsed;
}

export default function BloomWebsiteTaxSettings({
  initialWebsite,
}: {
  initialWebsite: any;
}) {
  const [settings, setSettings] = useState(() => stateFromWebsite(initialWebsite));
  const [saved, setSaved] = useState(() => stateFromWebsite(initialWebsite));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const next = stateFromWebsite(initialWebsite);
    setSettings(next);
    setSaved(next);
  }, [initialWebsite]);

  const dirty = !settingsValuesEqual(settings, saved);

  useSettingsSectionDirty(
    { id: "website-taxes", label: "Taxes & Tips", anchorId: "website-taxes" },
    dirty,
  );

  async function save() {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const suggestedTipPercentages = settings.suggestedTipPercentages
        .split(",")
        .map((value: string) => Number(value.trim()))
        .filter(Number.isFinite);

      const response = await fetch("/api/websites/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "taxSettings",
          data: {
            enabled: settings.enabled,
            defaultRatePercent: rate(settings.defaultRatePercent),
            deliveryTaxable: settings.deliveryTaxable,
            deliveryRatePercent: rate(settings.deliveryRatePercent, true),
            tipsEnabled: settings.tipsEnabled,
            suggestedTipPercentages,
            tipsTaxable: settings.tipsTaxable,
            tipRatePercent: rate(settings.tipRatePercent, true),
            taxExemptCustomersEnabled: settings.taxExemptCustomersEnabled,
          },
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Unable to save tax settings.");

      const next = stateFromWebsite(data.website);
      setSettings(next);
      setSaved(next);
      toast.success("Website tax and tip settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save tax settings.");
    } finally {
      setIsSaving(false);
    }
  }

  useSettingsSectionActions("website-taxes", {
    save,
    discard: () => setSettings(saved),
    isSaving,
  });

  const input =
    "mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900";

  return (
    <section
      id="website-taxes"
      className="scroll-mt-28 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-100 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
            <Calculator size={21} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-gray-950">Taxes & Tips</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Bloom applies the rates you configure. Individual products and add-ons can override the default rate.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7">
        <label className="flex items-center justify-between gap-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <span className="font-black text-gray-950">Collect sales tax</span>
          <input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))} />
        </label>

        <label className="block max-w-sm text-sm font-black text-gray-900">
          Default website tax rate
          <input type="number" min="0" max="100" step="0.001" value={settings.defaultRatePercent} onChange={(e) => setSettings((s) => ({ ...s, defaultRatePercent: e.target.value }))} className={input} />
        </label>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 p-4">
            <label className="flex items-center justify-between gap-4 font-black text-gray-950">
              Tax delivery fees
              <input type="checkbox" checked={settings.deliveryTaxable} onChange={(e) => setSettings((s) => ({ ...s, deliveryTaxable: e.target.checked }))} />
            </label>
            <input type="number" min="0" max="100" step="0.001" placeholder="Use default rate" value={settings.deliveryRatePercent} onChange={(e) => setSettings((s) => ({ ...s, deliveryRatePercent: e.target.value }))} className={input} />
          </div>

          <div className="rounded-2xl border border-gray-200 p-4">
            <label className="flex items-center justify-between gap-4 font-black text-gray-950">
              Allow tax-exempt customers
              <input type="checkbox" checked={settings.taxExemptCustomersEnabled} onChange={(e) => setSettings((s) => ({ ...s, taxExemptCustomersEnabled: e.target.checked }))} />
            </label>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              Exemptions must be verified before checkout applies zero tax.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 p-4">
          <label className="flex items-center justify-between gap-4 font-black text-gray-950">
            Accept tips
            <input type="checkbox" checked={settings.tipsEnabled} onChange={(e) => setSettings((s) => ({ ...s, tipsEnabled: e.target.checked }))} />
          </label>

          {settings.tipsEnabled && (
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <label className="text-sm font-bold text-gray-700">
                Suggested tip percentages
                <input value={settings.suggestedTipPercentages} onChange={(e) => setSettings((s) => ({ ...s, suggestedTipPercentages: e.target.value }))} className={input} placeholder="10, 15, 20" />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold lg:self-end">
                <input type="checkbox" checked={settings.tipsTaxable} onChange={(e) => setSettings((s) => ({ ...s, tipsTaxable: e.target.checked }))} />
                Tax tips
              </label>
              <label className="text-sm font-bold text-gray-700">
                Tip tax-rate override
                <input type="number" min="0" max="100" step="0.001" placeholder="Use default rate" value={settings.tipRatePercent} onChange={(e) => setSettings((s) => ({ ...s, tipRatePercent: e.target.value }))} className={input} />
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={save} disabled={!dirty || isSaving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
            <Save size={17} />
            {isSaving ? "Saving..." : "Save tax settings"}
          </button>
        </div>
      </div>
    </section>
  );
}
