"use client";

import { useEffect, useState } from "react";
import AppModal from "@/components/ui/AppModal";
import AppButton from "@/components/ui/AppButton";

type Coupon = {
  id: string; code: string; description: string; discountType: "percentage" | "fixed";
  amount: number; minimumMerchandiseCents: number; startsAt: string; expiresAt: string;
  usageLimit: number | null; redemptionCount: number; isActive: boolean;
};

type FormState = {
  code: string; description: string; discountType: "percentage" | "fixed";
  amount: string; minimum: string; startsAt: string; expiresAt: string;
  usageLimit: string; isActive: boolean;
};

const empty: FormState = { code: "", description: "", discountType: "percentage", amount: "10", minimum: "0", startsAt: "", expiresAt: "", usageLimit: "", isActive: false };

function fromCoupon(c: Coupon): FormState {
  return {
    code: c.code, description: c.description, discountType: c.discountType,
    amount: c.discountType === "percentage" ? String(c.amount / 100) : String(c.amount / 100),
    minimum: String(c.minimumMerchandiseCents / 100), startsAt: c.startsAt, expiresAt: c.expiresAt,
    usageLimit: c.usageLimit === null ? "" : String(c.usageLimit), isActive: c.isActive,
  };
}

function moneyToCents(value: string): number | null {
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

export default function CouponsManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/websites/coupons", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not load coupons.");
      setCoupons(json.coupons);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load coupons."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({...current, [key]: value}));
  }

  async function save() {
    setError(""); setMessage("");
    const amount = moneyToCents(form.amount);
    const minimumMerchandiseCents = moneyToCents(form.minimum);
    const usageLimit = form.usageLimit === "" ? null : Number(form.usageLimit);
    if (amount === null || amount < 1 || minimumMerchandiseCents === null ||
        (form.discountType === "percentage" && amount > 10000) ||
        (usageLimit !== null && (!Number.isSafeInteger(usageLimit) || usageLimit < 1))) {
      setError("Please check the discount amount, minimum order value, and usage limit."); return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/websites/coupons", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { id: editing } : {}),
          code: form.code, description: form.description,
          discountType: form.discountType, amount,
          minimumMerchandiseCents, startsAt: form.startsAt || null,
          expiresAt: form.expiresAt || null, usageLimit, isActive: form.isActive,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed.");
      setMessage(editing ? "Coupon updated." : "Coupon created.");
      setEditing(null); setForm(empty);
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed."); }
    finally { setBusy(false); }
  }

  async function remove(coupon: Coupon) {
    if (coupon.redemptionCount > 0) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/websites/coupons", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Delete failed.");
      if (editing === coupon.id) {setEditing(null); setForm(empty);}
      setDeleteTarget(null);
      setMessage("Coupon deleted."); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Delete failed."); }
    finally { setBusy(false); }
  }

  async function setActive(coupon: Coupon, isActive: boolean) {
    setBusy(true); setError(""); setMessage("");
    try {
      // Reuse the existing tenant-scoped PATCH validator rather than adding a
      // second mutation endpoint. Preserve all financial terms exactly.
      const payload = {
        id: coupon.id, code: coupon.code, description: coupon.description,
        discountType: coupon.discountType, amount: coupon.amount,
        minimumMerchandiseCents: coupon.minimumMerchandiseCents,
        startsAt: coupon.startsAt || null, expiresAt: coupon.expiresAt || null,
        usageLimit: coupon.usageLimit, isActive,
      };
      const response = await fetch("/api/websites/coupons", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update coupon status.");
      // Avoid showing the now-stale edit form status after direct toggle.
      if (editing === coupon.id) update("isActive", isActive);
      setMessage(`${coupon.code} ${isActive ? "activated" : "paused"}. Coupon status updated. Test payments are limited to authorized development checkout.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update coupon status.");
    } finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
    <div><h1 className="text-3xl font-black">Coupons & promotions</h1><p className="mt-2 text-slate-600">Create and manage promotional codes for your flower shop.</p></div>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Coupon payments are available only in authorized development checkout testing. Public coupon redemption will be enabled after release verification.</div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{message}</p>}
    <section className="space-y-4 rounded-2xl border bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{editing ? "Edit coupon" : "Create a coupon"}</h2>{editing && <button type="button" onClick={() => {setEditing(null); setForm(empty);}} className="rounded-lg border px-3 py-2 text-sm">Cancel editing</button>}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Coupon code <input className="mt-2 w-full rounded-lg border p-3 uppercase" maxLength={32} value={form.code} onChange={event=>update("code",event.target.value.toUpperCase())} placeholder="SPRING15" /></label>
        <label className="text-sm font-semibold">Internal description <input className="mt-2 w-full rounded-lg border p-3" maxLength={240} value={form.description} onChange={event=>update("description",event.target.value)} placeholder="Spring promotion" /></label>
        <label className="text-sm font-semibold">Discount type<select className="mt-2 w-full rounded-lg border p-3" value={form.discountType} onChange={event=>update("discountType",event.target.value as FormState["discountType"])}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed amount ($)</option></select></label>
        <label className="text-sm font-semibold">Discount {form.discountType === "percentage" ? "percentage" : "amount in dollars"}<input className="mt-2 w-full rounded-lg border p-3" inputMode="decimal" value={form.amount} onChange={event=>update("amount",event.target.value)} /></label>
        <label className="text-sm font-semibold">Minimum merchandise subtotal ($)<input className="mt-2 w-full rounded-lg border p-3" inputMode="decimal" value={form.minimum} onChange={event=>update("minimum",event.target.value)} /></label>
        <label className="text-sm font-semibold">Maximum total redemptions (optional)<input className="mt-2 w-full rounded-lg border p-3" type="number" min={1} max={10000000} value={form.usageLimit} onChange={event=>update("usageLimit",event.target.value)} /></label>
        <label className="text-sm font-semibold">Start date (optional)<input className="mt-2 w-full rounded-lg border p-3" type="date" value={form.startsAt} onChange={event=>update("startsAt",event.target.value)} /></label>
        <label className="text-sm font-semibold">End date (optional)<input className="mt-2 w-full rounded-lg border p-3" type="date" value={form.expiresAt} onChange={event=>update("expiresAt",event.target.value)} /></label>
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.isActive} onChange={event=>update("isActive",event.target.checked)} /> Mark active for future checkout redemption</label>
      <button type="button" disabled={busy} onClick={()=>void save()} className="rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : editing ? "Save changes" : "Create coupon"}</button>
    </section>
    <section className="rounded-2xl border bg-white p-5 sm:p-7"><h2 className="text-xl font-bold">Your coupon codes</h2>
      {loading ? <p className="mt-4 text-sm text-slate-500">Loading coupons…</p> : coupons.length === 0 ? <p className="mt-4 text-sm text-slate-500">No coupons created yet.</p> : <div className="mt-4 space-y-3">{coupons.map(coupon=><div key={coupon.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"><div><p className="font-black">{coupon.code} <span className="text-xs font-medium text-slate-500">{coupon.isActive ? "Active (checkout pending)" : "Paused"}</span></p><p className="text-sm text-slate-600">{coupon.discountType === "percentage" ? `${coupon.amount/100}%` : `$${(coupon.amount/100).toFixed(2)}`} off merchandise · {coupon.redemptionCount}{coupon.usageLimit === null ? "" : `/${coupon.usageLimit}`} uses</p>{coupon.description && <p className="text-xs text-slate-500">{coupon.description}</p>}</div><div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={()=>void setActive(coupon, !coupon.isActive)} className={`rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-40 ${coupon.isActive ? "border-amber-300 text-amber-800 hover:bg-amber-50" : "border-emerald-300 text-emerald-800 hover:bg-emerald-50"}`}>{coupon.isActive ? "Pause" : "Activate"}</button>
        <button type="button" disabled={busy} onClick={()=>{setEditing(coupon.id);setForm(fromCoupon(coupon)); window.scrollTo({top:0,behavior:"smooth"});}} className="rounded-lg border px-4 py-2 text-sm font-semibold">Edit</button>
        <button type="button" disabled={busy || coupon.redemptionCount > 0} onClick={()=>setDeleteTarget(coupon)} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-40">Delete</button>
      </div></div>)}</div>}
    </section>
    <AppModal
      open={Boolean(deleteTarget)}
      title="Delete coupon?"
      description="This action permanently removes an unused coupon."
      maxWidth="sm"
      onClose={() => { if (!busy) setDeleteTarget(null); }}
      footer={<div className="flex flex-wrap justify-end gap-3">
        <AppButton variant="outline" disabled={busy} onClick={() => setDeleteTarget(null)}>Cancel</AppButton>
        <AppButton variant="danger" disabled={busy} onClick={() => { if (deleteTarget) void remove(deleteTarget); }}>
          {busy ? "Deleting…" : "Delete coupon"}
        </AppButton>
      </div>}
    >
      <p className="text-sm leading-6 text-slate-700">Are you sure you want to permanently delete <strong>{deleteTarget?.code}</strong>? This cannot be undone.</p>
    </AppModal>
  </main>;
}
