"use client";

import {
  ExternalLink,
  Facebook,
  ImageIcon,
  Instagram,
  Link2,
  Loader2,
  MapPin,
  Music2,
  Palette,
  RefreshCcw,
  Save,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, type ReactNode, useMemo, useState } from "react";

import BloomWebsiteLiveStorefrontViewer from "@/components/websites/BloomWebsiteLiveStorefrontViewer";
import { normalizeStorefrontHexColor } from "@/lib/bloom-websites/storefront-theme";
import { uploadWebsiteImage } from "@/lib/bloom-websites/uploadWebsiteImage";
import type {
  BloomWebsiteHeroInfoCardContent,
  BloomWebsiteLogoSize,
  BloomWebsiteButtonCorners,
  BloomWebsiteHeroSlide,
  BloomWebsiteHomepageSectionContent,
  BloomWebsiteThemeName,
  BloomWebsiteTrustPoint,
} from "@/types/bloom-website";

type BrandValues = {
  siteName: string;
  logo: string;
  logoSize: BloomWebsiteLogoSize;
  buttonCorners: BloomWebsiteButtonCorners;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  socialLinks: { facebook: string; instagram: string; pinterest: string; tiktok: string };
};

type Props = {
  previewSlug: string;
  initialValues: BrandValues;
  previewValues: {
    theme: BloomWebsiteThemeName;
    heroSlides: BloomWebsiteHeroSlide[];
    heroInfoCard: BloomWebsiteHeroInfoCardContent;
    trustPoints: BloomWebsiteTrustPoint[];
    sectionContent: BloomWebsiteHomepageSectionContent;
  };
  disabled?: boolean;
};

export default function BloomWebsiteBrandIdentityEditor({ previewSlug, initialValues, previewValues, disabled = false }: Props) {
  const [values, setValues] = useState(initialValues);
  const [savedValues, setSavedValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const primaryColor = normalizeStorefrontHexColor(values.primaryColor, "#654783");
  const accentColor = normalizeStorefrontHexColor(values.accentColor, "#37a156");
  const hasChanges = useMemo(() => JSON.stringify(values) !== JSON.stringify(savedValues), [values, savedValues]);
  const primaryHero = previewValues.heroSlides[0];

  function update<Key extends keyof BrandValues>(key: Key, value: BrandValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    setSuccess("");
  }

  function updateSocial(field: keyof BrandValues["socialLinks"], value: string) {
    setValues((current) => ({ ...current, socialLinks: { ...current.socialLinks, [field]: value } }));
    setSuccess("");
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || disabled || uploadingLogo) return;
    setUploadingLogo(true);
    setError("");
    try {
      const imageUrl = await uploadWebsiteImage({ file, assetType: "branding" });
      update("logo", imageUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function saveBranding() {
    if (disabled || saving || uploadingLogo) return;
    const siteName = values.siteName.trim();
    if (!siteName) { setError("Your website needs a site name."); return; }

    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/websites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          branding: {
            logo: values.logo,
            logoSize: values.logoSize,
            buttonCorners: values.buttonCorners,
            tagline: values.tagline,
            primaryColor,
            accentColor,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to save branding.");

      const socialChanged = JSON.stringify(values.socialLinks) !== JSON.stringify(savedValues.socialLinks);
      if (socialChanged) {
        const socialResponse = await fetch("/api/shops/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section: "socialLinks", data: { socialLinks: values.socialLinks } }),
        });
        const socialData = await socialResponse.json();
        if (!socialResponse.ok) throw new Error(socialData?.error || "Branding saved, but social links could not be saved.");
      }

      const next: BrandValues = {
        siteName: data.website?.siteName || siteName,
        logo: data.website?.branding?.logo || "",
        logoSize: data.website?.branding?.logoSize || values.logoSize,
        buttonCorners: data.website?.branding?.buttonCorners || values.buttonCorners,
        tagline: data.website?.branding?.tagline || "",
        primaryColor: data.website?.branding?.primaryColor || primaryColor,
        accentColor: data.website?.branding?.accentColor || accentColor,
        socialLinks: values.socialLinks,
      };
      setValues(next); setSavedValues(next); setSuccess("Branding saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save branding.");
    } finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-6 pb-28">
      <header className="flex flex-col justify-between gap-5 px-2 md:px-0 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-purple-600"><Palette size={17} /> Branding</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">Make the brand unmistakably yours.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">Branding is your identity: shop name, logo, colors, and brand statement. Homepage layout and hero content now live in the Storefront Editor.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/websites/storefront" className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-3 text-sm font-black text-white transition hover:bg-purple-800">Edit Storefront <ExternalLink size={16} /></Link>
          <Link href={`/websites/preview/${previewSlug}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-800 shadow-sm transition hover:bg-gray-50">Preview Website <ExternalLink size={16} /></Link>
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{success}</div> : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,760px)_minmax(420px,1fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-black text-gray-950">Shop Identity</h2><p className="mt-1 text-sm leading-6 text-gray-500">The name and logo customers recognize everywhere on your website.</p>
            <div className="mt-6 space-y-5">
              <div><label className="text-sm font-black text-gray-800">Website Name</label><input value={values.siteName} maxLength={120} disabled={disabled} onChange={(e) => update("siteName", e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100" /></div>
              <div><label className="text-sm font-black text-gray-800">Logo</label><div className="mt-2 flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5">{values.logo ? <img src={values.logo} alt="Current logo" className="max-h-28 max-w-full object-contain" /> : <div className="text-center text-gray-400"><ImageIcon size={28} className="mx-auto" /><p className="mt-2 text-xs font-bold">No logo uploaded</p></div>}</div>
                {values.logo ? (
                  <div className="mt-4">
                    <p className="text-sm font-black text-gray-800">Logo Size</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">Choose how prominently your logo appears in the storefront header. Larger options also make the header a little taller.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {([
                        ["small", "Small"],
                        ["standard", "Standard"],
                        ["large", "Large"],
                        ["xlarge", "Extra Large"],
                      ] as Array<[BloomWebsiteLogoSize, string]>).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          disabled={disabled}
                          onClick={() => update("logoSize", value)}
                          className={`rounded-xl border px-3 py-2.5 text-xs font-black transition ${
                            values.logoSize === value
                              ? "border-purple-500 bg-purple-50 text-purple-800 ring-2 ring-purple-100"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-xs font-black text-white"><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={disabled || uploadingLogo} onChange={uploadLogo} />{uploadingLogo ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}{uploadingLogo ? "Uploading..." : values.logo ? "Replace Logo" : "Upload Logo"}</label>{values.logo ? <button type="button" onClick={() => update("logo", "")} className="rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-black text-gray-700">Remove Logo</button> : null}</div></div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-gray-950">Brand Colors</h2><p className="mt-1 text-sm leading-6 text-gray-500">Bloom protects contrast and readability while using these colors throughout the storefront.</p></div><button type="button" onClick={() => { update("primaryColor", "#654783"); update("accentColor", "#37a156"); }} className="inline-flex items-center gap-1 text-xs font-black text-purple-700"><RefreshCcw size={14} /> Reset</button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><ColorField label="Primary Color" value={values.primaryColor} fallback="#654783" onChange={(value) => update("primaryColor", value)} /><ColorField label="Accent Color" value={values.accentColor} fallback="#37a156" onChange={(value) => update("accentColor", value)} /></div></section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-black text-gray-950">Button shape</h2>
            <p className="mt-1 text-sm text-gray-500">Choose how buttons look on your customer-facing website. Dashboard buttons are unchanged.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {(["subtle", "rounded", "pill"] as const).map((corner) => (
                <button type="button" key={corner} onClick={() => update("buttonCorners", corner)} aria-pressed={values.buttonCorners === corner}
                  className={`flex flex-col items-center gap-3 rounded-xl border p-4 transition ${values.buttonCorners === corner ? "border-purple-600 bg-purple-50 ring-2 ring-purple-100" : "border-gray-200 hover:border-purple-300"}`}>
                  <span className={`inline-flex bg-purple-700 px-4 py-2 text-xs font-bold text-white ${corner === "subtle" ? "rounded" : corner === "rounded" ? "rounded-xl" : "rounded-full"}`}>Shop Flowers</span>
                  <span className="text-sm font-semibold capitalize">{corner}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-black text-gray-950">Brand Statement</h2><p className="mt-1 text-sm leading-6 text-gray-500">A short line that appears with your shop identity in the footer and supporting brand areas.</p><textarea rows={3} maxLength={180} value={values.tagline} onChange={(e) => update("tagline", e.target.value)} placeholder="Fresh flowers, thoughtful design, and personal service." className="mt-5 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm leading-6" /></section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-start gap-3"><Link2 size={18} className="mt-0.5 text-purple-600" /><div><h2 className="text-xl font-black text-gray-950">Social Media</h2><p className="mt-1 text-sm leading-6 text-gray-500">These shared links power your BloomWebsite footer and GetBloomDirect public profile.</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><SocialInput label="Facebook" icon={<Facebook size={16} />} value={values.socialLinks.facebook} onChange={(value) => updateSocial("facebook", value)} /><SocialInput label="Instagram" icon={<Instagram size={16} />} value={values.socialLinks.instagram} onChange={(value) => updateSocial("instagram", value)} /><SocialInput label="Pinterest" icon={<MapPin size={16} />} value={values.socialLinks.pinterest} onChange={(value) => updateSocial("pinterest", value)} /><SocialInput label="TikTok" icon={<Music2 size={16} />} value={values.socialLinks.tiktok} onChange={(value) => updateSocial("tiktok", value)} /></div></section>
        </div>

        <div className="min-w-0 xl:sticky xl:top-6 xl:h-fit">
          <BloomWebsiteLiveStorefrontViewer previewSlug={previewSlug} buttonCorners={values.buttonCorners} theme={previewValues.theme} siteName={values.siteName} logo={values.logo} logoSize={values.logoSize} tagline={values.tagline} heroHeadline={primaryHero?.headline || ""} heroSubheadline={primaryHero?.subheadline || ""} heroInfoCard={previewValues.heroInfoCard} trustPoints={previewValues.trustPoints} socialLinks={values.socialLinks} sectionContent={previewValues.sectionContent} primaryColor={primaryColor} accentColor={accentColor} heroImage={primaryHero?.imageUrl || ""} heroSlides={previewValues.heroSlides} />
        </div>
      </div>

      <div className="fixed bottom-4 left-4 right-4 z-30 lg:left-auto lg:right-8 lg:w-[min(720px,calc(100vw-4rem))]"><div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between"><div className="px-2"><p className="text-sm font-black text-gray-900">{hasChanges ? "You have unsaved branding changes." : "Your branding is saved."}</p><p className="mt-0.5 text-xs text-gray-500">Logo uploads are not published until you save.</p></div><div className="flex gap-2"><button type="button" onClick={() => { setValues(savedValues); setError(""); setSuccess(""); }} disabled={!hasChanges || saving} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-black text-gray-700 disabled:opacity-40">Discard</button><button type="button" onClick={saveBranding} disabled={!hasChanges || saving || uploadingLogo || disabled} className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-black text-white disabled:opacity-40">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? "Saving..." : "Save Branding"}</button></div></div></div>
    </div>
  );
}

function ColorField({ label, value, fallback, onChange }: { label: string; value: string; fallback: string; onChange: (value: string) => void }) {
  const normalized = normalizeStorefrontHexColor(value, fallback);
  return <div><label className="text-sm font-black text-gray-800">{label}</label><div className="mt-2 flex gap-2"><input type="color" value={normalized} onChange={(e) => onChange(e.target.value)} className="h-12 w-14 cursor-pointer rounded-xl border border-gray-300 bg-white p-1" /><input value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm font-mono uppercase" /></div></div>;
}

function SocialInput({ label, icon, value, onChange }: { label: string; icon: ReactNode; value: string; onChange: (value: string) => void }) {
  return <div><label className="flex items-center gap-2 text-xs font-black text-gray-600">{icon}{label}</label><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={`https://${label.toLowerCase()}.com/...`} className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm" /></div>;
}
