"use client";

import {
  Check,
  ExternalLink,
  Globe2,
  ImageIcon,
  Loader2,
  Search,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";

import {
  BLOOM_WEBSITE_BUSINESS_DAYS,
  normalizeBloomWebsiteBusinessHours,
} from "@/lib/bloom-websites/storefront-seo";
import { uploadWebsiteImage } from "@/lib/bloom-websites/uploadWebsiteImage";
import type {
  BloomWebsiteBusinessHour,
  BloomWebsiteLocalSeoContent,
} from "@/types/bloom-website";

type SeoValues = {
  homepageTitle: string;
  homepageDescription: string;
  socialTitle: string;
  socialDescription: string;
  socialImageUrl: string;
  businessDescription: string;
  googleBusinessProfileUrl: string;
  googleSiteVerification: string;
  bingSiteVerification: string;
  businessHours: BloomWebsiteBusinessHour[];
  localDelivery: BloomWebsiteLocalSeoContent;
};

type Props = {
  previewSlug: string;
  initialValues: SeoValues;
  defaults: {
    homepageTitle: string;
    homepageDescription: string;
    socialTitle: string;
    socialDescription: string;
    socialImageUrl: string;
    businessDescription: string;
  };
  businessIdentity: {
    businessName: string;
    phone: string;
    address: string;
    showPhone: boolean;
    showAddress: boolean;
  };
  configuredDeliveryZipCodes: string[];
  indexing: {
    status: "preview" | "live" | "paused";
    customDomain: string;
    domainVerified: boolean;
    domainRoutingReady: boolean;
  };
  disabled?: boolean;
};

function valuesEqual(a: SeoValues, b: SeoValues) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function displayValue(value: string, fallback: string) {
  return value.trim() || fallback;
}

function listToTextarea(values: string[]) {
  return values.join("\n");
}

function textareaToList(value: string) {
  // Preserve what the florist is actively typing. In particular, trailing
  // spaces and a newly-created blank line must remain in the controlled
  // textarea or Space/Enter appears broken. The settings API performs the
  // authoritative trim, dedupe, validation, and empty-line cleanup on save.
  return value.split(/\r?\n/).slice(0, 12);
}

export default function BloomWebsiteSeoEditor({
  previewSlug,
  initialValues,
  defaults,
  businessIdentity,
  configuredDeliveryZipCodes,
  indexing,
  disabled = false,
}: Props) {
  const [values, setValues] = useState<SeoValues>({
    ...initialValues,
    businessHours: normalizeBloomWebsiteBusinessHours(
      initialValues.businessHours,
    ),
  });
  const [savedValues, setSavedValues] = useState<SeoValues>({
    ...initialValues,
    businessHours: normalizeBloomWebsiteBusinessHours(
      initialValues.businessHours,
    ),
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const dirty = useMemo(
    () => !valuesEqual(values, savedValues),
    [values, savedValues],
  );

  const liveOrigin =
    indexing.status === "live" && indexing.customDomain
      ? `https://${indexing.customDomain}`
      : "";
  const searchUrl = liveOrigin || `getbloomdirect.com/websites/preview/${previewSlug}`;
  const sitemapUrl = liveOrigin ? `${liveOrigin}/sitemap.xml` : "";

  const effectiveTitle = displayValue(
    values.homepageTitle,
    defaults.homepageTitle,
  );
  const effectiveDescription = displayValue(
    values.homepageDescription,
    defaults.homepageDescription,
  );
  const effectiveSocialImage = displayValue(
    values.socialImageUrl,
    defaults.socialImageUrl,
  );

  function updateValue<K extends keyof Omit<SeoValues, "businessHours">>(
    key: K,
    value: SeoValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  }

  function updateLocalDelivery<K extends keyof BloomWebsiteLocalSeoContent>(
    key: K,
    value: BloomWebsiteLocalSeoContent[K],
  ) {
    setValues((current) => ({
      ...current,
      localDelivery: {
        ...current.localDelivery,
        [key]: value,
      },
    }));
    setError("");
    setSuccess("");
  }

  function updateHours(
    day: BloomWebsiteBusinessHour["day"],
    patch: Partial<BloomWebsiteBusinessHour>,
  ) {
    setValues((current) => ({
      ...current,
      businessHours: current.businessHours.map((entry) =>
        entry.day === day ? { ...entry, ...patch } : entry,
      ),
    }));
    setError("");
    setSuccess("");
  }

  async function handleSocialImageUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const url = await uploadWebsiteImage({
        file,
        assetType: "branding",
      });

      updateValue("socialImageUrl", url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload social image.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (disabled || saving) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/websites/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "seo",
          data: values,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to save SEO settings.");
      }

      const normalized = {
        ...values,
        businessHours: normalizeBloomWebsiteBusinessHours(
          values.businessHours,
        ),
      };

      setValues(normalized);
      setSavedValues(normalized);
      setSuccess("SEO settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save SEO settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-purple-600">
            <Search size={17} />
            BloomWebsites SEO
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
            Strong SEO without the technical work.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">
            Leave fields blank and Bloom uses sensible defaults from your shop.
            Override only what you want to control.
          </p>
        </div>
        <Link
          href={`/websites/preview/${previewSlug}`}
          target="_blank"
          className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-800 shadow-sm transition hover:bg-gray-50"
        >
          Preview Website <ExternalLink size={17} />
        </Link>
      </header>

      {disabled ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          Website editing is unavailable while this shop is suspended.
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">{error}</div>
      ) : null}
      {success ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
          <Check size={18} /> {success}
        </div>
      ) : null}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black text-gray-950">Homepage search appearance</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          These values control the homepage title and description. Empty fields use Bloom&apos;s automatic local-florist defaults.
        </p>

        <div className="mt-6 grid gap-5">
          <div>
            <label className="text-sm font-bold text-gray-800">SEO title</label>
            <input
              value={values.homepageTitle}
              maxLength={70}
              disabled={disabled}
              onChange={(event) => updateValue("homepageTitle", event.target.value)}
              placeholder={defaults.homepageTitle}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
            />
            <div className="mt-1 flex justify-between gap-4 text-xs text-gray-400">
              <span>Blank = automatic title</span><span>{values.homepageTitle.length}/70</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-800">Meta description</label>
            <textarea
              rows={3}
              value={values.homepageDescription}
              maxLength={170}
              disabled={disabled}
              onChange={(event) => updateValue("homepageDescription", event.target.value)}
              placeholder={defaults.homepageDescription}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
            />
            <div className="mt-1 flex justify-between gap-4 text-xs text-gray-400">
              <span>Blank = automatic description</span><span>{values.homepageDescription.length}/170</span>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Google-style preview</p>
          <p className="mt-4 truncate text-sm text-emerald-700">{searchUrl}</p>
          <p className="mt-1 text-xl font-medium text-blue-700">{effectiveTitle}</p>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">{effectiveDescription}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black text-gray-950">Social sharing</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          Optional overrides for link previews on social networks and messaging apps.
        </p>
        <div className="mt-6 grid gap-5">
          <div>
            <label className="text-sm font-bold text-gray-800">Social title</label>
            <input
              value={values.socialTitle}
              maxLength={100}
              disabled={disabled}
              onChange={(event) => updateValue("socialTitle", event.target.value)}
              placeholder={defaults.socialTitle}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-800">Social description</label>
            <textarea
              rows={3}
              value={values.socialDescription}
              maxLength={250}
              disabled={disabled}
              onChange={(event) => updateValue("socialDescription", event.target.value)}
              placeholder={defaults.socialDescription}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-800">Social image</label>
            <p className="mt-1 text-xs leading-5 text-gray-500">Blank uses your hero image, then your logo.</p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-28 w-44 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-2">
                {effectiveSocialImage ? (
                  <img src={effectiveSocialImage} alt="" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="text-gray-300" size={30} />
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <label className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${disabled || uploading ? "cursor-not-allowed bg-gray-200 text-gray-500" : "cursor-pointer bg-gray-950 text-white"}`}>
                  {uploading ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}
                  {uploading ? "Uploading..." : "Upload Image"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || uploading} onChange={handleSocialImageUpload} className="hidden" />
                </label>
                {values.socialImageUrl ? (
                  <button type="button" disabled={disabled} onClick={() => updateValue("socialImageUrl", "")} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700">
                    <X size={17} /> Use automatic image
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black text-gray-950">Local business SEO</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          Bloom uses these facts in florist structured data. Keep them accurate; Bloom does not invent local business details.
        </p>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm">
          <p className="font-black text-gray-950">Business identity used by Bloom</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><dt className="text-xs font-bold uppercase tracking-wide text-gray-500">Business</dt><dd className="mt-1 text-gray-800">{businessIdentity.businessName || "Not set"}</dd></div>
            <div><dt className="text-xs font-bold uppercase tracking-wide text-gray-500">Phone</dt><dd className="mt-1 text-gray-800">{businessIdentity.phone || "Not set"}{!businessIdentity.showPhone ? " (not published in structured data)" : ""}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-wide text-gray-500">Address</dt><dd className="mt-1 text-gray-800">{businessIdentity.address || "Not set"}{!businessIdentity.showAddress ? " (not published as a structured address)" : ""}</dd></div>
          </dl>
          <Link href="/dashboard/settings" className="mt-4 inline-flex items-center gap-1 font-bold text-purple-700 hover:text-purple-900">Review shared shop information <ExternalLink size={14} /></Link>
        </div>

        <div className="mt-6 grid gap-5">
          <div>
            <label className="text-sm font-bold text-gray-800">SEO business description</label>
            <textarea
              rows={5}
              value={values.businessDescription}
              maxLength={1600}
              disabled={disabled}
              onChange={(event) => updateValue("businessDescription", event.target.value)}
              placeholder={defaults.businessDescription}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-400">Blank = Bloom uses your About/story, tagline, and homepage details.</p>
          </div>
          <div>
            <label className="text-sm font-bold text-gray-800">Google Business Profile URL</label>
            <input
              type="url"
              value={values.googleBusinessProfileUrl}
              maxLength={500}
              disabled={disabled}
              onChange={(event) => updateValue("googleBusinessProfileUrl", event.target.value)}
              placeholder="https://..."
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
            />
          </div>
        </div>

        <div className="mt-7">
          <h3 className="font-black text-gray-950">Business hours</h3>
          <p className="mt-1 text-sm text-gray-500">Enable only days when the shop is normally open to customers.</p>
          <div className="mt-4 divide-y divide-gray-200 rounded-2xl border border-gray-200">
            {BLOOM_WEBSITE_BUSINESS_DAYS.map((day) => {
              const hours = values.businessHours.find((entry) => entry.day === day.key)!;
              return (
                <div key={day.key} className="grid gap-3 p-4 sm:grid-cols-[150px_110px_1fr_1fr] sm:items-center">
                  <span className="font-bold text-gray-800">{day.label}</span>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <input type="checkbox" checked={hours.enabled} disabled={disabled} onChange={(event) => updateHours(day.key, { enabled: event.target.checked })} /> Open
                  </label>
                  <input type="time" value={hours.opens} disabled={disabled || !hours.enabled} onChange={(event) => updateHours(day.key, { opens: event.target.value })} className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm disabled:bg-gray-100" />
                  <input type="time" value={hours.closes} disabled={disabled || !hours.enabled} onChange={(event) => updateHours(day.key, { closes: event.target.value })} className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm disabled:bg-gray-100" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black text-gray-950">Local delivery & community</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          Add only real places your shop serves. Bloom uses these facts to make the local-delivery section more useful to customers and to strengthen local-search context without creating keyword-stuffed pages.
        </p>

        <div className="mt-6">
          <label className="text-sm font-bold text-gray-800">Local delivery note</label>
          <textarea
            rows={4}
            value={values.localDelivery.localDeliveryNote}
            maxLength={600}
            disabled={disabled}
            onChange={(event) =>
              updateLocalDelivery("localDeliveryNote", event.target.value)
            }
            placeholder="Example: We deliver throughout Batavia and nearby Genesee County communities, including homes, workplaces, hospitals, funeral homes, and event venues."
            className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
          />
          <p className="mt-1 text-xs text-gray-400">
            Optional. Blank keeps Bloom&apos;s automatic local-delivery copy. Never add locations you do not actually serve.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <p className="font-black text-gray-950">Configured delivery ZIP codes</p>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            These come directly from your shared delivery settings, so Bloom does not maintain a second ZIP-code list just for SEO.
          </p>
          {configuredDeliveryZipCodes.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {configuredDeliveryZipCodes.map((zip) => (
                <span key={zip} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700">
                  {zip}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm font-bold text-gray-500">
              No ZIP-based delivery zones are currently configured. Distance-based shops can still list service cities below.
            </p>
          )}
          <Link href="/dashboard/settings" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-purple-700 hover:text-purple-900">
            Review delivery settings <ExternalLink size={14} />
          </Link>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {[
            ["serviceCities", "Service cities / towns", "Batavia\nLe Roy\nCorfu"],
            ["neighborhoods", "Neighborhoods / local areas", "Downtown Batavia\nEast Pembroke"],
            ["hospitals", "Hospitals / medical centers", "One real destination per line"],
            ["funeralHomes", "Funeral homes", "One real destination per line"],
            ["seniorLiving", "Senior / assisted living", "One real destination per line"],
            ["schools", "Schools / universities", "One real destination per line"],
            ["venues", "Wedding / event venues", "One real destination per line"],
            ["businesses", "Businesses / organizations", "One real destination per line"],
          ].map(([key, label, placeholder]) => (
            <div key={key}>
              <label className="text-sm font-bold text-gray-800">{label}</label>
              <textarea
                rows={4}
                value={listToTextarea(
                  values.localDelivery[
                    key as keyof BloomWebsiteLocalSeoContent
                  ] as string[],
                )}
                disabled={disabled}
                onChange={(event) =>
                  updateLocalDelivery(
                    key as Exclude<
                      keyof BloomWebsiteLocalSeoContent,
                      "localDeliveryNote"
                    >,
                    textareaToList(event.target.value),
                  )
                }
                placeholder={placeholder}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
              />
              <p className="mt-1 text-xs text-gray-400">One item per line · up to 12</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black text-gray-950">Search engines & indexing</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">Optional verification values are added only to the live custom-domain homepage. Preview storefronts remain noindex.</p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-gray-800">Google site verification value</label>
            <input value={values.googleSiteVerification} maxLength={250} disabled={disabled} onChange={(event) => updateValue("googleSiteVerification", event.target.value)} placeholder="Verification token only" className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100" />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-800">Bing site verification value</label>
            <input value={values.bingSiteVerification} maxLength={250} disabled={disabled} onChange={(event) => updateValue("bingSiteVerification", event.target.value)} placeholder="msvalidate.01 content value" className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100" />
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-start gap-3">
            <Globe2 className="mt-0.5 shrink-0 text-purple-700" size={20} />
            <div>
              <p className="font-black text-gray-950">Indexing status</p>
              {liveOrigin && indexing.domainVerified && indexing.domainRoutingReady ? (
                <p className="mt-1 text-sm leading-6 text-gray-600">Your website is live on <strong>{indexing.customDomain}</strong>. Bloom exposes robots.txt and an XML sitemap for the live domain.</p>
              ) : indexing.status === "paused" ? (
                <p className="mt-1 text-sm leading-6 text-gray-600">This website is paused. Public indexing should resume only after the site is live again and launch requirements pass.</p>
              ) : (
                <p className="mt-1 text-sm leading-6 text-gray-600">Preview storefronts are intentionally blocked from indexing. Your public sitemap becomes available when the custom domain is live.</p>
              )}
              {sitemapUrl ? (
                <a href={sitemapUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-purple-700 hover:text-purple-900">{sitemapUrl} <ExternalLink size={14} /></a>
              ) : (
                <p className="mt-3 text-sm font-bold text-gray-500">Sitemap: available after public launch</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button type="button" disabled={disabled || !dirty || saving || uploading} onClick={save} className="rounded-xl bg-gray-950 px-6 py-3 text-sm font-black text-white disabled:opacity-40">
          {saving ? "Saving..." : "Save SEO settings"}
        </button>
      </div>
    </div>
  );
}
