"use client";

import {
  Check,
  ExternalLink,
  Facebook,
  ImageIcon,
  Instagram,
  Link2,
  Music2,
  Loader2,
  Palette,
  MapPin,
  RefreshCcw,
  Save,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, type ReactNode, useMemo, useState } from "react";

import {
  buildBloomWebsiteHeroHeadline,
} from "@/lib/bloom-websites/branding-copy";
import {
  BLOOM_WEBSITE_HERO_CARD_DESCRIPTION_MAX,
  BLOOM_WEBSITE_HERO_CARD_EYEBROW_MAX,
  BLOOM_WEBSITE_HERO_CARD_HEADING_MAX,
  BLOOM_WEBSITE_SECTION_DESCRIPTION_MAX,
  BLOOM_WEBSITE_SECTION_EYEBROW_MAX,
  BLOOM_WEBSITE_SECTION_HEADING_MAX,
  BLOOM_WEBSITE_TRUST_POINT_DESCRIPTION_MAX,
  BLOOM_WEBSITE_TRUST_POINT_TITLE_MAX,
  getBloomWebsiteHeroInfoCardDefaults,
  getBloomWebsiteHomepageSectionDefaults,
  getBloomWebsiteTrustPointDefaults,
} from "@/lib/bloom-websites/storefront-content";
import type {
  BloomWebsiteHeroInfoCardContent,
  BloomWebsiteHomepageSectionContent,
  BloomWebsiteHomepageSectionText,
  BloomWebsiteTrustPoint,
} from "@/types/bloom-website";
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

  heroHeadline: string;
  heroSubheadline: string;
  heroInfoCard: BloomWebsiteHeroInfoCardContent;
  trustPoints: BloomWebsiteTrustPoint[];

  socialLinks: {
    facebook: string;
    instagram: string;
    pinterest: string;
    tiktok: string;
  };

  sectionContent: BloomWebsiteHomepageSectionContent;

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

const STOREFRONT_CONTENT_SECTIONS: Array<{
  key: keyof BloomWebsiteHomepageSectionContent;
  label: string;
  description: string;
}> = [
  {
    key: "occasions",
    label: "Shop by Occasion",
    description: "The introduction above your occasion shortcuts.",
  },
  {
    key: "featured",
    label: "Featured Flowers",
    description: "The introduction above your featured product collection.",
  },
  {
    key: "about",
    label: "Homepage About",
    description: "The story text customers see before the full About page.",
  },
  {
    key: "trust",
    label: "Why Shop Local",
    description: "The headline above Bloom's local-florist trust points.",
  },
  {
    key: "delivery",
    label: "Local Delivery",
    description: "The main message introducing local delivery information.",
  },
  {
    key: "contact",
    label: "Contact",
    description: "The introduction above your address, phone and email details.",
  },
];

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

  const sectionDefaults = useMemo(
    () =>
      getBloomWebsiteHomepageSectionDefaults({
        businessName: values.siteName,
      }),
    [values.siteName],
  );

  const heroInfoCardDefaults = useMemo(
    () => getBloomWebsiteHeroInfoCardDefaults({ siteName: values.siteName }),
    [values.siteName],
  );

  const trustPointDefaults = useMemo(
    () => getBloomWebsiteTrustPointDefaults(),
    [],
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

  function updateSectionContent(
    section: keyof BloomWebsiteHomepageSectionContent,
    field: keyof BloomWebsiteHomepageSectionText,
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      sectionContent: {
        ...current.sectionContent,
        [section]: {
          ...current.sectionContent[section],
          [field]: value,
        },
      },
    }));

    setSuccess("");
  }

  function resetSectionContent(
    section: keyof BloomWebsiteHomepageSectionContent,
  ) {
    setValues((current) => ({
      ...current,
      sectionContent: {
        ...current.sectionContent,
        [section]: {
          eyebrow: "",
          heading: "",
          description: "",
        },
      },
    }));

    setSuccess("");
  }

  function updateHeroInfoCard(
    field: keyof BloomWebsiteHeroInfoCardContent,
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      heroInfoCard: {
        ...current.heroInfoCard,
        [field]: value,
      },
    }));
    setSuccess("");
  }

  function resetHeroInfoCard() {
    setValues((current) => ({
      ...current,
      heroInfoCard: { eyebrow: "", heading: "", description: "" },
    }));
    setSuccess("");
  }

  function updateTrustPoint(
    index: number,
    field: keyof BloomWebsiteTrustPoint,
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      trustPoints: current.trustPoints.map((point, pointIndex) =>
        pointIndex === index ? { ...point, [field]: value } : point,
      ),
    }));
    setSuccess("");
  }

  function resetTrustPoint(index: number) {
    setValues((current) => ({
      ...current,
      trustPoints: current.trustPoints.map((point, pointIndex) =>
        pointIndex === index ? { title: "", description: "" } : point,
      ),
    }));
    setSuccess("");
  }

  function updateSocialLink(
    field: keyof BrandingValues["socialLinks"],
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      socialLinks: {
        ...current.socialLinks,
        [field]: value,
      },
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
    const heroHeadline = values.heroHeadline.trim();

    if (!siteName) {
      setError("Your website needs a site name.");

      return;
    }

    if (!heroHeadline) {
      setError("Your homepage needs a hero headline.");
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
            heroHeadline,
            heroSubheadline: values.heroSubheadline,
            heroImage: values.heroImage,
            heroInfoCard: values.heroInfoCard,
            trustPoints: values.trustPoints,
            sectionContent: values.sectionContent,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to save branding.");
      }

      const socialLinksChanged =
        JSON.stringify(values.socialLinks) !== JSON.stringify(savedValues.socialLinks);

      if (socialLinksChanged) {
        const socialResponse = await fetch("/api/shops/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "socialLinks",
            data: { socialLinks: values.socialLinks },
          }),
        });

        const socialData = await socialResponse.json();

        if (!socialResponse.ok) {
          throw new Error(
            socialData?.error ||
              "Your website branding saved, but the shared social links could not be saved.",
          );
        }
      }

      const nextValues: BrandingValues = {
        siteName: data.website?.siteName || siteName,

        logo: data.website?.branding?.logo || "",

        tagline: data.website?.branding?.tagline || "",

        primaryColor: data.website?.branding?.primaryColor || primaryColor,

        accentColor: data.website?.branding?.accentColor || accentColor,

        heroHeadline: data.website?.homepage?.heroHeadline || heroHeadline,

        heroSubheadline: data.website?.homepage?.heroSubheadline || "",

        heroImage: data.website?.homepage?.heroImage || "",

        heroInfoCard:
          data.website?.homepage?.heroInfoCard || values.heroInfoCard,

        trustPoints:
          data.website?.homepage?.trustPoints || values.trustPoints,

        socialLinks: values.socialLinks,

        sectionContent:
          data.website?.homepage?.sectionContent || values.sectionContent,
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
                  Website / Storefront Name
                </label>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  The public name of this website. Bloom also uses it for
                  storefront identity and automatic SEO defaults. Your hero
                  headline is edited separately and will not be overwritten.
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <label
                      htmlFor="website-hero-headline"
                      className="text-sm font-bold text-gray-800"
                    >
                      Hero Headline
                    </label>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      The large headline customers see first on your homepage.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      updateValue(
                        "heroHeadline",
                        buildBloomWebsiteHeroHeadline(values.siteName),
                      )
                    }
                    className="inline-flex w-fit items-center rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Use suggested headline
                  </button>
                </div>

                <textarea
                  id="website-hero-headline"
                  maxLength={160}
                  rows={3}
                  value={values.heroHeadline}
                  disabled={disabled}
                  onChange={(event) =>
                    updateValue("heroHeadline", event.target.value)
                  }
                  placeholder="Beautiful flowers for life's meaningful moments."
                  className="mt-3 w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 text-gray-950 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                />

                <div className="mt-1 text-right text-xs text-gray-400">
                  {values.heroHeadline.length}/160
                </div>
              </div>

              <div>
                <label
                  htmlFor="website-hero-subheadline"
                  className="text-sm font-bold text-gray-800"
                >
                  Hero Supporting Text
                </label>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  The smaller message below your hero headline. Leave this blank
                  and Bloom will use its built-in default.
                </p>

                <textarea
                  id="website-hero-subheadline"
                  maxLength={300}
                  rows={3}
                  value={values.heroSubheadline}
                  disabled={disabled}
                  onChange={(event) =>
                    updateValue("heroSubheadline", event.target.value)
                  }
                  placeholder="Fresh flowers for life's meaningful moments, designed and delivered by your local florist."
                  className="mt-3 w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 text-gray-950 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                />

                <div className="mt-1 text-right text-xs text-gray-400">
                  {values.heroSubheadline.length}/300
                </div>
              </div>

            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div>
              <h2 className="text-xl font-black text-gray-950">
                Storefront Content
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Make each homepage section sound like your shop without having
                to design the page yourself. Leave any field blank and Bloom
                will use its polished default.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {STOREFRONT_CONTENT_SECTIONS.map((section) => (
                <div key={section.key} className="space-y-3">
                  <SectionContentEditor
                    sectionKey={section.key}
                    label={section.label}
                    description={section.description}
                    value={values.sectionContent[section.key]}
                    fallback={sectionDefaults[section.key]}
                    disabled={disabled}
                    onChange={(field, value) =>
                      updateSectionContent(section.key, field, value)
                    }
                    onReset={() => resetSectionContent(section.key)}
                  />

                  {section.key === "trust" ? (
                    <TrustPointsEditor
                      values={values.trustPoints}
                      defaults={trustPointDefaults}
                      disabled={disabled}
                      onChange={updateTrustPoint}
                      onReset={resetTrustPoint}
                    />
                  ) : null}
                </div>
              ))}
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

            <p className="mt-2 rounded-xl bg-purple-50 px-3 py-2 text-xs leading-5 text-purple-800">
              With a hero photo, Bloom intentionally uses the image as the
              visual focus and hides the desktop information card that appears
              on image-free heroes.
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

            {values.heroImage ? (
              <div className="mt-6 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm leading-6 text-purple-900">
                <p className="font-black">Hero information card hidden</p>
                <p className="mt-1 text-xs leading-5 text-purple-800">
                  Because a Hero Image is active, Bloom hides the desktop information
                  card so the photo stays visible. Remove the Hero Image to show and
                  edit that card.
                </p>
              </div>
            ) : (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-black text-gray-950">Hero Information Card</h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      This card fills the right side of an image-free desktop Hero.
                      Bloom keeps the location and delivery details accurate from your
                      shop settings; you control the introduction below.
                    </p>
                  </div>

                  {(values.heroInfoCard.eyebrow ||
                    values.heroInfoCard.heading ||
                    values.heroInfoCard.description) ? (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={resetHeroInfoCard}
                      className="shrink-0 text-xs font-bold text-purple-700 hover:text-purple-900 disabled:opacity-50"
                    >
                      Use Bloom defaults
                    </button>
                  ) : null}
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="hero-card-eyebrow" className="text-sm font-bold text-gray-800">
                      Small Label
                    </label>
                    <input
                      id="hero-card-eyebrow"
                      type="text"
                      maxLength={BLOOM_WEBSITE_HERO_CARD_EYEBROW_MAX}
                      value={values.heroInfoCard.eyebrow}
                      disabled={disabled}
                      onChange={(event) => updateHeroInfoCard("eyebrow", event.target.value)}
                      placeholder={heroInfoCardDefaults.eyebrow}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label htmlFor="hero-card-heading" className="text-sm font-bold text-gray-800">
                      Card Heading
                    </label>
                    <input
                      id="hero-card-heading"
                      type="text"
                      maxLength={BLOOM_WEBSITE_HERO_CARD_HEADING_MAX}
                      value={values.heroInfoCard.heading}
                      disabled={disabled}
                      onChange={(event) => updateHeroInfoCard("heading", event.target.value)}
                      placeholder={heroInfoCardDefaults.heading}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label htmlFor="hero-card-description" className="text-sm font-bold text-gray-800">
                      Card Description
                    </label>
                    <textarea
                      id="hero-card-description"
                      rows={4}
                      maxLength={BLOOM_WEBSITE_HERO_CARD_DESCRIPTION_MAX}
                      value={values.heroInfoCard.description}
                      disabled={disabled}
                      onChange={(event) => updateHeroInfoCard("description", event.target.value)}
                      placeholder={heroInfoCardDefaults.description}
                      className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div>
              <h2 className="text-xl font-black text-gray-950">Footer</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Customize the brand statement and shared social accounts shown near
                the bottom of your storefront. These social links are shared with
                your GetBloomDirect public profile.
              </p>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <label htmlFor="website-tagline" className="text-sm font-bold text-gray-800">
                  Footer Brand Statement
                </label>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  A short sentence that appears beneath your shop identity in the footer.
                </p>
                <textarea
                  id="website-tagline"
                  maxLength={180}
                  rows={3}
                  value={values.tagline}
                  disabled={disabled}
                  onChange={(event) => updateValue("tagline", event.target.value)}
                  placeholder="Fresh flowers, thoughtful design, and personal service."
                  className="mt-3 w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 text-gray-950 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
                />
                <div className="mt-1 text-right text-xs text-gray-400">
                  {values.tagline.length}/180
                </div>
              </div>

              <div className="border-t border-gray-200 pt-5">
                <div className="flex items-start gap-3">
                  <Link2 size={18} className="mt-0.5 shrink-0 text-purple-600" />
                  <div>
                    <p className="text-sm font-black text-gray-900">Shared Social Media</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Edit once here or in Shared Shop Settings. The same links power
                      your GetBloomDirect public profile, BloomWebsite footer, and SEO
                      business profiles. Website visibility is controlled in Contact & Display settings.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <SocialLinkInput
                    label="Facebook"
                    icon={<Facebook size={17} />}
                    value={values.socialLinks.facebook}
                    placeholder="https://facebook.com/yourshop"
                    disabled={disabled}
                    onChange={(value) => updateSocialLink("facebook", value)}
                  />
                  <SocialLinkInput
                    label="Instagram"
                    icon={<Instagram size={17} />}
                    value={values.socialLinks.instagram}
                    placeholder="https://instagram.com/yourshop"
                    disabled={disabled}
                    onChange={(value) => updateSocialLink("instagram", value)}
                  />
                  <SocialLinkInput
                    label="Pinterest"
                    icon={<MapPin size={17} />}
                    value={values.socialLinks.pinterest}
                    placeholder="https://pinterest.com/yourshop"
                    disabled={disabled}
                    onChange={(value) => updateSocialLink("pinterest", value)}
                  />
                  <SocialLinkInput
                    label="TikTok"
                    icon={<Music2 size={17} />}
                    value={values.socialLinks.tiktok}
                    placeholder="https://tiktok.com/@yourshop"
                    disabled={disabled}
                    onChange={(value) => updateSocialLink("tiktok", value)}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="min-w-0 xl:sticky xl:top-6">
          <BloomWebsiteLiveStorefrontViewer
            previewSlug={previewSlug}
            siteName={values.siteName}
            logo={values.logo}
            tagline={values.tagline}
            heroHeadline={values.heroHeadline}
            heroSubheadline={values.heroSubheadline}
            heroInfoCard={values.heroInfoCard}
            trustPoints={values.trustPoints}
            socialLinks={values.socialLinks}
            sectionContent={values.sectionContent}
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

type SectionContentEditorProps = {
  sectionKey: keyof BloomWebsiteHomepageSectionContent;
  label: string;
  description: string;
  value: BloomWebsiteHomepageSectionText;
  fallback: BloomWebsiteHomepageSectionText;
  disabled: boolean;
  onChange: (field: keyof BloomWebsiteHomepageSectionText, value: string) => void;
  onReset: () => void;
};

function SectionContentEditor({
  sectionKey,
  label,
  description,
  value,
  fallback,
  disabled,
  onChange,
  onReset,
}: SectionContentEditorProps) {
  const customized = Boolean(
    value.eyebrow.trim() || value.heading.trim() || value.description.trim(),
  );

  return (
    <details className="group rounded-2xl border border-gray-200 bg-gray-50 open:bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="font-black text-gray-950">{label}</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
            customized
              ? "bg-purple-100 text-purple-700"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {customized ? "Custom" : "Bloom default"}
        </span>
      </summary>

      <div className="border-t border-gray-200 px-4 py-5 sm:px-5">
        <div className="space-y-5">
          <div>
            <label
              htmlFor={`storefront-${sectionKey}-eyebrow`}
              className="text-sm font-bold text-gray-800"
            >
              Small Label
            </label>
            <input
              id={`storefront-${sectionKey}-eyebrow`}
              type="text"
              maxLength={BLOOM_WEBSITE_SECTION_EYEBROW_MAX}
              value={value.eyebrow}
              disabled={disabled}
              onChange={(event) => onChange("eyebrow", event.target.value)}
              placeholder={fallback.eyebrow || "Optional small label"}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor={`storefront-${sectionKey}-heading`}
              className="text-sm font-bold text-gray-800"
            >
              Section Heading
            </label>
            <input
              id={`storefront-${sectionKey}-heading`}
              type="text"
              maxLength={BLOOM_WEBSITE_SECTION_HEADING_MAX}
              value={value.heading}
              disabled={disabled}
              onChange={(event) => onChange("heading", event.target.value)}
              placeholder={fallback.heading}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor={`storefront-${sectionKey}-description`}
              className="text-sm font-bold text-gray-800"
            >
              Supporting Text
            </label>
            <textarea
              id={`storefront-${sectionKey}-description`}
              maxLength={BLOOM_WEBSITE_SECTION_DESCRIPTION_MAX}
              rows={4}
              value={value.description}
              disabled={disabled}
              onChange={(event) => onChange("description", event.target.value)}
              placeholder={
                fallback.description ||
                "Optional — add a short sentence in your shop's voice."
              }
              className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 text-gray-950 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[11px] leading-5 text-gray-400">
            Blank fields automatically use Bloom&apos;s current default copy.
          </p>

          {customized ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onReset}
              className="shrink-0 text-xs font-bold text-purple-700 transition hover:text-purple-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Use Bloom defaults
            </button>
          ) : null}
        </div>
      </div>
    </details>
  );
}

type TrustPointsEditorProps = {
  values: BloomWebsiteTrustPoint[];
  defaults: BloomWebsiteTrustPoint[];
  disabled: boolean;
  onChange: (
    index: number,
    field: keyof BloomWebsiteTrustPoint,
    value: string,
  ) => void;
  onReset: (index: number) => void;
};

function TrustPointsEditor({
  values,
  defaults,
  disabled,
  onChange,
  onReset,
}: TrustPointsEditorProps) {
  return (
    <details className="rounded-2xl border border-purple-100 bg-purple-50/70">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black text-purple-900 sm:px-5">
        Customize the 4 Why Shop Local points
      </summary>

      <div className="grid gap-4 border-t border-purple-100 p-4 sm:p-5">
        {defaults.map((fallback, index) => {
          const value = values[index] || { title: "", description: "" };
          const customized = Boolean(value.title.trim() || value.description.trim());

          return (
            <div key={index} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-gray-900">Point {index + 1}</p>
                {customized ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onReset(index)}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 disabled:opacity-50"
                  >
                    Use Bloom default
                  </button>
                ) : null}
              </div>

              <div className="mt-3 space-y-3">
                <input
                  type="text"
                  maxLength={BLOOM_WEBSITE_TRUST_POINT_TITLE_MAX}
                  value={value.title}
                  disabled={disabled}
                  onChange={(event) => onChange(index, "title", event.target.value)}
                  placeholder={fallback.title}
                  aria-label={`Why Shop Local point ${index + 1} title`}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
                />
                <textarea
                  rows={3}
                  maxLength={BLOOM_WEBSITE_TRUST_POINT_DESCRIPTION_MAX}
                  value={value.description}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange(index, "description", event.target.value)
                  }
                  placeholder={fallback.description}
                  aria-label={`Why Shop Local point ${index + 1} description`}
                  className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
                />
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

type SocialLinkInputProps = {
  label: string;
  icon: ReactNode;
  value: string;
  placeholder: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

function SocialLinkInput({
  label,
  icon,
  value,
  placeholder,
  disabled,
  onChange,
}: SocialLinkInputProps) {
  return (
    <label className="block">
      <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-800">
        {icon}
        {label}
      </span>
      <input
        type="url"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100"
      />
    </label>
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
