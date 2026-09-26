"use client";

import {
  Check,
  ExternalLink,
  ImageIcon,
  Loader2,
  Palette,
  RefreshCcw,
  Save,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";

import {
  DEFAULT_BLOOM_WEBSITE_ACCENT_COLOR,
  DEFAULT_BLOOM_WEBSITE_PRIMARY_COLOR,
  normalizeStorefrontHexColor,
} from "@/lib/bloom-websites/storefront-theme";
import { uploadWebsiteImage } from "@/lib/bloom-websites/uploadWebsiteImage";
import BloomWebsiteLiveStorefrontViewer from "@/components/websites/BloomWebsiteLiveStorefrontViewer";

type BrandingValues = {
  siteName: string;

  logo: string;

  tagline: string;

  primaryColor: string;
  accentColor: string;

  heroImage: string;
};

type Props = {
  previewSlug: string;

  initialValues: BrandingValues;

  disabled?: boolean;
};

type ColorEditorProps = {
  label: string;
  description: string;

  value: string;

  fallback: string;

  onChange: (value: string) => void;
};

function normalizeColorForDisplay(value: string, fallback: string) {
  return normalizeStorefrontHexColor(value, fallback);
}

export default function BloomWebsiteBrandingEditor({
  previewSlug,
  initialValues,
  disabled = false,
}: Props) {
  const [values, setValues] = useState<BrandingValues>(initialValues);

  const [savedValues, setSavedValues] = useState<BrandingValues>(initialValues);

  const [saving, setSaving] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [uploadingHero, setUploadingHero] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const primaryColor = normalizeColorForDisplay(
    values.primaryColor,
    DEFAULT_BLOOM_WEBSITE_PRIMARY_COLOR,
  );

  const accentColor = normalizeColorForDisplay(
    values.accentColor,
    DEFAULT_BLOOM_WEBSITE_ACCENT_COLOR,
  );


  const hasChanges = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(savedValues),
    [values, savedValues],
  );

  function updateValue<Key extends keyof BrandingValues>(
    key: Key,
    value: BrandingValues[Key],
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));

    setSuccess("");
  }

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    type: "logo" | "heroImage",
  ) {
    const file = event.target.files?.[0];

    /*
     * Allow the same file to be selected again later.
     */
    event.target.value = "";

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

    if (type === "logo") {
      setUploadingLogo(true);
    } else {
      setUploadingHero(true);
    }

    try {
      const imageUrl = await uploadWebsiteImage({
        file,
        assetType: "branding",
      });

      updateValue(type, imageUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload image.",
      );
    } finally {
      if (type === "logo") {
        setUploadingLogo(false);
      } else {
        setUploadingHero(false);
      }
    }
  }

  function resetColors() {
    updateValue("primaryColor", DEFAULT_BLOOM_WEBSITE_PRIMARY_COLOR);

    updateValue("accentColor", DEFAULT_BLOOM_WEBSITE_ACCENT_COLOR);
  }

  function discardChanges() {
    setValues(savedValues);
    setError("");
    setSuccess("");
  }

  async function saveBranding() {
    if (disabled || saving || uploadingLogo || uploadingHero) {
      return;
    }

    const siteName = values.siteName.trim();

    if (!siteName) {
      setError("Your website needs a site name.");

      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/websites", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          siteName,

          branding: {
            logo: values.logo,

            tagline: values.tagline,

            primaryColor,

            accentColor,
          },

          homepage: {
            heroImage: values.heroImage,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to save branding.");
      }

      const nextValues: BrandingValues = {
        siteName: data.website?.siteName || siteName,

        logo: data.website?.branding?.logo || "",

        tagline: data.website?.branding?.tagline || "",

        primaryColor: data.website?.branding?.primaryColor || primaryColor,

        accentColor: data.website?.branding?.accentColor || accentColor,

        heroImage: data.website?.homepage?.heroImage || "",
      };

      setValues(nextValues);

      setSavedValues(nextValues);

      setSuccess("Branding saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save branding.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1800px] space-y-7 pb-12">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-purple-600">
            <Palette size={17} />
            BloomWebsites Branding
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
            Make the storefront yours.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
            Choose the identity customers will see across your BloomWebsite.
            Bloom handles the surrounding design, readability, spacing and
            neutral colors automatically.
          </p>
        </div>

        <Link
          href={`/websites/preview/${previewSlug}`}
          target="_blank"
          className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-800 shadow-sm transition hover:bg-gray-50"
        >
          Preview Website
          <ExternalLink size={17} />
        </Link>
      </header>

      {disabled ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          Website editing is unavailable while this shop is suspended.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
          <Check size={18} className="shrink-0" />

          {success}
        </div>
      ) : null}

      <div className="grid gap-7 xl:grid-cols-[minmax(0,0.82fr)_minmax(620px,1.18fr)] xl:items-start 2xl:grid-cols-[minmax(0,0.76fr)_minmax(760px,1.24fr)]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div>
              <h2 className="text-xl font-black text-gray-950">
                Shop Identity
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                These details identify your storefront to customers.
              </p>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <label
                  htmlFor="website-site-name"
                  className="text-sm font-bold text-gray-800"
                >
                  Site Name
                </label>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Usually your flower shop&apos;s public business name.
                </p>

                <input
                  id="website-site-name"
                  type="text"
                  maxLength={120}
                  value={values.siteName}
                  disabled={disabled}
                  onChange={(event) =>
                    updateValue("siteName", event.target.value)
                  }
                  className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
              </div>

              <div>
                <label
                  htmlFor="website-tagline"
                  className="text-sm font-bold text-gray-800"
                >
                  Tagline
                </label>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  A short statement that captures what makes your shop special.
                </p>

                <textarea
                  id="website-tagline"
                  maxLength={180}
                  rows={3}
                  value={values.tagline}
                  disabled={disabled}
                  onChange={(event) =>
                    updateValue("tagline", event.target.value)
                  }
                  placeholder="Fresh flowers, thoughtfully designed."
                  className="mt-3 w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 text-gray-950 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                />

                <div className="mt-1 text-right text-xs text-gray-400">
                  {values.tagline.length}/180
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div>
              <h2 className="text-xl font-black text-gray-950">Brand Colors</h2>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Pick your colors visually or enter exact hexadecimal brand
                values.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              <ColorEditor
                label="Primary Color"
                description="Used for important buttons and primary brand accents."
                value={values.primaryColor}
                fallback={DEFAULT_BLOOM_WEBSITE_PRIMARY_COLOR}
                onChange={(value) => updateValue("primaryColor", value)}
              />

              <ColorEditor
                label="Accent Color"
                description="Used for supporting highlights and secondary accents."
                value={values.accentColor}
                fallback={DEFAULT_BLOOM_WEBSITE_ACCENT_COLOR}
                onChange={(value) => updateValue("accentColor", value)}
              />

              <button
                type="button"
                disabled={disabled}
                onClick={resetColors}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCcw size={16} />
                Reset Colors
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-black text-gray-950">Logo</h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Use a clear version of your shop logo. PNG with a transparent
              background works especially well.
            </p>

            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-3">
                {values.logo ? (
                  <img
                    src={values.logo}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ImageIcon size={30} className="text-gray-300" />
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <label
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${
                    disabled || uploadingLogo
                      ? "cursor-not-allowed bg-gray-200 text-gray-500"
                      : "cursor-pointer bg-gray-950 text-white hover:bg-gray-800"
                  }`}
                >
                  {uploadingLogo ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Upload size={17} />
                  )}

                  {uploadingLogo ? "Uploading..." : "Upload Logo"}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={disabled || uploadingLogo}
                    onChange={(event) => handleImageUpload(event, "logo")}
                    className="hidden"
                  />
                </label>

                {values.logo ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => updateValue("logo", "")}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X size={17} />
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-xl font-black text-gray-950">Hero Image</h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Choose a strong floral image that represents your shop. We&apos;ll
              design the homepage around it.
            </p>

            <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
              {values.heroImage ? (
                <div className="relative aspect-[16/7]">
                  <img
                    src={values.heroImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/7] items-center justify-center">
                  <div className="text-center text-gray-400">
                    <ImageIcon size={34} className="mx-auto" />

                    <p className="mt-2 text-sm font-semibold">
                      No hero image yet
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <label
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${
                  disabled || uploadingHero
                    ? "cursor-not-allowed bg-gray-200 text-gray-500"
                    : "cursor-pointer bg-gray-950 text-white hover:bg-gray-800"
                }`}
              >
                {uploadingHero ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Upload size={17} />
                )}

                {uploadingHero
                  ? "Uploading..."
                  : values.heroImage
                    ? "Replace Hero Image"
                    : "Upload Hero Image"}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={disabled || uploadingHero}
                  onChange={(event) => handleImageUpload(event, "heroImage")}
                  className="hidden"
                />
              </label>

              {values.heroImage ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updateValue("heroImage", "")}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={17} />
                  Remove
                </button>
              ) : null}
            </div>
          </section>
        </div>

        <div className="min-w-0 xl:sticky xl:top-6">
          <BloomWebsiteLiveStorefrontViewer
            previewSlug={previewSlug}
            siteName={values.siteName}
            logo={values.logo}
            tagline={values.tagline}
            primaryColor={primaryColor}
            accentColor={accentColor}
            heroImage={values.heroImage}
          />
        </div>
      </div>

      <div className="sticky bottom-4 z-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="px-2">
            <p className="text-sm font-bold text-gray-900">
              {hasChanges
                ? "You have unsaved changes."
                : "Everything is saved."}
            </p>

            <p className="mt-0.5 text-xs text-gray-500">
              Image uploads are not published until you save your branding.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={discardChanges}
              disabled={disabled || !hasChanges || saving}
              className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              Discard
            </button>

            <button
              type="button"
              onClick={saveBranding}
              disabled={
                disabled ||
                !hasChanges ||
                saving ||
                uploadingLogo ||
                uploadingHero
              }
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 sm:flex-none"
            >
              {saving ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Save size={17} />
              )}

              {saving ? "Saving..." : "Save Branding"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorEditor({
  label,
  description,
  value,
  fallback,
  onChange,
}: ColorEditorProps) {
  const normalized = normalizeColorForDisplay(value, fallback);

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <label className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm">
          <input
            type="color"
            value={normalized}
            onChange={(event) => onChange(event.target.value)}
            aria-label={`${label} color picker`}
            className="absolute -inset-2 h-20 w-20 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-gray-900">{label}</p>

          <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
        </div>

        <input
          type="text"
          value={value}
          maxLength={7}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => onChange(normalized)}
          aria-label={`${label} hexadecimal value`}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-mono text-sm font-bold uppercase text-gray-800 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 sm:w-28"
        />
      </div>
    </div>
  );
}
