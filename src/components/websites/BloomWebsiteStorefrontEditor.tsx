"use client";

import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ImageIcon,
  Images,
  LayoutTemplate,
  Loader2,
  MapPinned,
  MonitorUp,
  PackagePlus,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { type ChangeEvent, type ReactNode, useMemo, useState } from "react";

import BloomWebsiteLiveStorefrontViewer from "@/components/websites/BloomWebsiteLiveStorefrontViewer";
import { BLOOM_WEBSITE_MAX_HERO_SLIDES } from "@/lib/bloom-websites/storefront-editor";
import { uploadWebsiteImage } from "@/lib/bloom-websites/uploadWebsiteImage";
import type {
  BloomWebsiteHeroInfoCardContent,
  BloomWebsiteHeroSlide,
  BloomWebsiteHomepageMerchandisingSection,
  BloomWebsiteHomepageSectionContent,
  BloomWebsiteHomepageSectionKey,
  BloomWebsiteHomepageSectionText,
  BloomWebsiteHomepageSectionVisibility,
  BloomWebsiteThemeName,
  BloomWebsiteTrustPoint,
} from "@/types/bloom-website";

type StorefrontValues = {
  theme: BloomWebsiteThemeName;
  heroSlides: BloomWebsiteHeroSlide[];
  heroInfoCard: BloomWebsiteHeroInfoCardContent;
  trustPoints: BloomWebsiteTrustPoint[];
  aboutImage: string;
  sectionContent: BloomWebsiteHomepageSectionContent;
  sectionOrder: BloomWebsiteHomepageSectionKey[];
  sectionVisibility: BloomWebsiteHomepageSectionVisibility;
  merchandisingSections: BloomWebsiteHomepageMerchandisingSection[];
};

type Props = {
  previewSlug: string;
  siteName: string;
  logo: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  socialLinks: {
    facebook: string;
    instagram: string;
    pinterest: string;
    tiktok: string;
  };
  availableCategories: string[];
  availableOccasions: string[];
  initialValues: StorefrontValues;
  disabled?: boolean;
};

type EditorSection = "style" | "banner" | "homepage";
type HomepageCopyKey = keyof BloomWebsiteHomepageSectionContent;

const HOMEPAGE_COPY_SECTIONS: Array<{
  key: HomepageCopyKey;
  label: string;
  help: string;
}> = [
  { key: "occasions", label: "Shop by Occasion", help: "The introduction above your occasion shortcuts." },
  { key: "featured", label: "Featured Flowers", help: "The introduction above your main product collection." },
  { key: "about", label: "Meet Your Florist", help: "The short story that introduces your shop on the homepage." },
  { key: "trust", label: "Why Shop Local", help: "The reasons customers should feel good ordering from your shop." },
  { key: "delivery", label: "Local Delivery", help: "How you introduce your delivery area and local service." },
  { key: "contact", label: "Contact & Map", help: "The introduction above your address, contact details, and map." },
];

const SECTION_LABELS: Record<BloomWebsiteHomepageSectionKey, { label: string; help: string }> = {
  occasions: { label: "Shop by Occasion", help: "Quick links into your strongest occasions." },
  featured: { label: "Featured Flowers", help: "Your primary product collection." },
  merchandising: { label: "More Product Collections", help: "Extra product rows for birthdays, sympathy, seasonal flowers, and more." },
  about: { label: "Meet Your Florist", help: "Your shop story and a dedicated florist photo." },
  trust: { label: "Why Shop Local", help: "Four reasons to order from your local florist." },
  delivery: { label: "Local Delivery", help: "Service areas, delivery details, and local destinations." },
  contact: { label: "Contact & Map", help: "Address, phone, email, and a storefront map." },
};

function createHeroSlide(siteName: string, index: number): BloomWebsiteHeroSlide {
  return {
    id: `hero-${Date.now()}-${index}`,
    headline: index === 0 ? `Beautiful flowers from ${siteName}.` : "A fresh moment, beautifully designed.",
    subheadline: "Fresh flowers for meaningful moments, designed and delivered by your local florist.",
    imageUrl: "",
    textStyle: "dark",
    overlay: "soft",
    alignment: "left",
    imagePosition: "center",
    ctaLabel: "Shop Flowers",
    ctaDestination: "shop",
    ctaHref: "",
  };
}

function createMerchandisingSection(index: number): BloomWebsiteHomepageMerchandisingSection {
  return {
    id: `collection-${Date.now()}-${index}`,
    enabled: true,
    eyebrow: "Shop the moment",
    heading: "Flowers for Every Occasion",
    description: "Explore more fresh designs created for the moments that matter.",
    sourceType: "occasion",
    sourceValue: "",
    productLimit: 6,
  };
}

export default function BloomWebsiteStorefrontEditor({
  previewSlug,
  siteName,
  logo,
  tagline,
  primaryColor,
  accentColor,
  socialLinks,
  availableCategories,
  availableOccasions,
  initialValues,
  disabled = false,
}: Props) {
  const [values, setValues] = useState(initialValues);
  const [savedValues, setSavedValues] = useState(initialValues);
  const [activeSection, setActiveSection] = useState<EditorSection>("style");
  const [selectedHeroIndex, setSelectedHeroIndex] = useState(0);
  const [homepageCopySection, setHomepageCopySection] = useState<HomepageCopyKey>("occasions");
  const [uploadingHeroIndex, setUploadingHeroIndex] = useState<number | null>(null);
  const [uploadingAboutImage, setUploadingAboutImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasChanges = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(savedValues),
    [values, savedValues],
  );

  const selectedHero = values.heroSlides[selectedHeroIndex] || values.heroSlides[0];
  const primaryHero = values.heroSlides[0];
  const activeHomepageCopy = values.sectionContent[homepageCopySection];

  function touch() {
    setSuccess("");
  }

  function updateHero(patch: Partial<BloomWebsiteHeroSlide>) {
    setValues((current) => ({
      ...current,
      heroSlides: current.heroSlides.map((slide, index) =>
        index === selectedHeroIndex ? { ...slide, ...patch } : slide,
      ),
    }));
    touch();
  }

  function addHero() {
    if (values.heroSlides.length >= BLOOM_WEBSITE_MAX_HERO_SLIDES) return;
    setValues((current) => ({
      ...current,
      heroSlides: [...current.heroSlides, createHeroSlide(siteName, current.heroSlides.length)],
    }));
    setSelectedHeroIndex(values.heroSlides.length);
    setActiveSection("banner");
    touch();
  }

  function removeHero(index: number) {
    if (values.heroSlides.length <= 1) return;
    setValues((current) => ({
      ...current,
      heroSlides: current.heroSlides.filter((_, itemIndex) => itemIndex !== index),
    }));
    setSelectedHeroIndex((current) => Math.max(0, Math.min(current, values.heroSlides.length - 2)));
    touch();
  }

  function moveHero(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= values.heroSlides.length) return;
    setValues((current) => {
      const next = [...current.heroSlides];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, heroSlides: next };
    });
    setSelectedHeroIndex(target);
    touch();
  }

  async function uploadHero(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || disabled || uploadingHeroIndex !== null) return;

    setUploadingHeroIndex(selectedHeroIndex);
    setError("");
    try {
      const imageUrl = await uploadWebsiteImage({ file, assetType: "branding" });
      updateHero({ imageUrl });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload main banner image.");
    } finally {
      setUploadingHeroIndex(null);
    }
  }

  async function uploadAboutImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || disabled || uploadingAboutImage) return;

    setUploadingAboutImage(true);
    setError("");
    try {
      const imageUrl = await uploadWebsiteImage({ file, assetType: "branding" });
      setValues((current) => ({ ...current, aboutImage: imageUrl }));
      touch();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload florist image.");
    } finally {
      setUploadingAboutImage(false);
    }
  }

  function updateHomepageCopy(field: keyof BloomWebsiteHomepageSectionText, value: string) {
    setValues((current) => ({
      ...current,
      sectionContent: {
        ...current.sectionContent,
        [homepageCopySection]: {
          ...current.sectionContent[homepageCopySection],
          [field]: value,
        },
      },
    }));
    touch();
  }

  function updateTrustPoint(index: number, field: keyof BloomWebsiteTrustPoint, value: string) {
    setValues((current) => ({
      ...current,
      trustPoints: current.trustPoints.map((point, pointIndex) =>
        pointIndex === index ? { ...point, [field]: value } : point,
      ),
    }));
    touch();
  }

  function updateHeroInfoCard(field: keyof BloomWebsiteHeroInfoCardContent, value: string) {
    setValues((current) => ({
      ...current,
      heroInfoCard: { ...current.heroInfoCard, [field]: value },
    }));
    touch();
  }

  function moveHomepageSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= values.sectionOrder.length) return;
    setValues((current) => {
      const next = [...current.sectionOrder];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, sectionOrder: next };
    });
    touch();
  }

  function toggleHomepageSection(key: BloomWebsiteHomepageSectionKey) {
    setValues((current) => ({
      ...current,
      sectionVisibility: {
        ...current.sectionVisibility,
        [key]: !current.sectionVisibility[key],
      },
    }));
    touch();
  }

  function addMerchandisingSection() {
    if (values.merchandisingSections.length >= 8) return;
    setValues((current) => ({
      ...current,
      merchandisingSections: [
        ...current.merchandisingSections,
        createMerchandisingSection(current.merchandisingSections.length),
      ],
    }));
    touch();
  }

  function updateMerchandisingSection(
    index: number,
    patch: Partial<BloomWebsiteHomepageMerchandisingSection>,
  ) {
    setValues((current) => ({
      ...current,
      merchandisingSections: current.merchandisingSections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, ...patch } : section,
      ),
    }));
    touch();
  }

  function moveMerchandisingSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= values.merchandisingSections.length) return;
    setValues((current) => {
      const next = [...current.merchandisingSections];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, merchandisingSections: next };
    });
    touch();
  }

  function removeMerchandisingSection(index: number) {
    setValues((current) => ({
      ...current,
      merchandisingSections: current.merchandisingSections.filter((_, itemIndex) => itemIndex !== index),
    }));
    touch();
  }

  function resetHomepageCopy() {
    setValues((current) => ({
      ...current,
      sectionContent: {
        ...current.sectionContent,
        [homepageCopySection]: { eyebrow: "", heading: "", description: "" },
      },
    }));
    touch();
  }

  function resetTrustPoint(index: number) {
    setValues((current) => ({
      ...current,
      trustPoints: current.trustPoints.map((point, pointIndex) =>
        pointIndex === index ? { title: "", description: "" } : point,
      ),
    }));
    touch();
  }

  function resetHeroInfoCard() {
    setValues((current) => ({
      ...current,
      heroInfoCard: { eyebrow: "", heading: "", description: "" },
    }));
    touch();
  }

  function discardChanges() {
    setValues(savedValues);
    setSelectedHeroIndex(0);
    setError("");
    setSuccess("");
  }

  async function saveStorefront() {
    if (disabled || saving || uploadingHeroIndex !== null || uploadingAboutImage) return;
    if (!values.heroSlides.length || values.heroSlides.some((slide) => !slide.headline.trim())) {
      setError("Every main banner needs a headline before you save.");
      setActiveSection("banner");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/websites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          theme: values.theme,
          homepage: {
            heroSlides: values.heroSlides,
            heroInfoCard: values.heroInfoCard,
            trustPoints: values.trustPoints,
            aboutImage: values.aboutImage,
            sectionContent: values.sectionContent,
            sectionOrder: values.sectionOrder,
            sectionVisibility: values.sectionVisibility,
            merchandisingSections: values.merchandisingSections,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to save storefront.");

      const nextValues: StorefrontValues = {
        theme: data.website?.theme || values.theme,
        heroSlides: data.website?.homepage?.heroSlides || values.heroSlides,
        heroInfoCard: data.website?.homepage?.heroInfoCard || values.heroInfoCard,
        trustPoints: data.website?.homepage?.trustPoints || values.trustPoints,
        aboutImage: data.website?.homepage?.aboutImage ?? values.aboutImage,
        sectionContent: data.website?.homepage?.sectionContent || values.sectionContent,
        sectionOrder: data.website?.homepage?.sectionOrder || values.sectionOrder,
        sectionVisibility: data.website?.homepage?.sectionVisibility || values.sectionVisibility,
        merchandisingSections: data.website?.homepage?.merchandisingSections || values.merchandisingSections,
      };
      setValues(nextValues);
      setSavedValues(nextValues);
      setSuccess("Storefront saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save storefront.");
    } finally {
      setSaving(false);
    }
  }

  const tabs: Array<{ key: EditorSection; label: string; help: string; icon: typeof LayoutTemplate }> = [
    { key: "style", label: "Storefront Style", help: "Choose the overall look customers see.", icon: LayoutTemplate },
    { key: "banner", label: "Main Banner", help: "Photos and messages at the top of your homepage.", icon: Images },
    { key: "homepage", label: "Homepage", help: "Arrange sections, products, story, contact, and map.", icon: MonitorUp },
  ];

  return (
    <div className="pb-28">
      <div className="mb-6 px-2 md:px-0">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-600">Storefront Editor</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950">Build the website your customers see.</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
          Start with the overall style, then customize the top banner and arrange your homepage. Changes appear in the preview before you save.
        </p>
      </div>

      {error ? <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div> : null}
      {success ? <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{success}</div> : null}

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {tabs.map(({ key, label, help, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveSection(key)}
            className={`rounded-2xl border p-4 text-left transition ${
              activeSection === key
                ? "border-purple-400 bg-purple-50 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${activeSection === key ? "bg-purple-700 text-white" : "bg-gray-100 text-gray-500"}`}>
                <Icon size={19} />
              </div>
              <div>
                <p className="font-black text-gray-950">{label}</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">{help}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)]">
        <div className="min-w-0">
          {activeSection === "style" ? (
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">Storefront Style</p>
              <h2 className="mt-2 text-2xl font-black text-gray-950">Choose the feeling of your website.</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">Your products and content stay the same. This changes how Bloom presents them.</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ThemeCard
                  selected={values.theme === "bloom-classic"}
                  title="Bloom Classic"
                  description="Friendly, modern, and feature-forward. Strong cards, clear actions, and a familiar shopping experience."
                  onClick={() => { setValues((current) => ({ ...current, theme: "bloom-classic" })); touch(); }}
                  previewClass="bg-gradient-to-br from-purple-100 via-white to-emerald-50"
                />
                <ThemeCard
                  selected={values.theme === "bloom-elegant"}
                  title="Bloom Atelier"
                  description="Clean, elegant, image-led, and editorial. More whitespace, refined typography, and quieter shopping controls."
                  onClick={() => { setValues((current) => ({ ...current, theme: "bloom-elegant" })); touch(); }}
                  previewClass="bg-gradient-to-br from-stone-100 via-[#fffdf9] to-[#eee6dc]"
                />
              </div>
            </section>
          ) : null}

          {activeSection === "banner" && selectedHero ? (
            <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">Main Banner</p>
                  <h2 className="mt-2 text-2xl font-black text-gray-950">Set the first thing customers see.</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
                    Bloom Atelier can rotate up to five banners automatically. Classic uses your first banner.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addHero}
                  disabled={values.heroSlides.length >= BLOOM_WEBSITE_MAX_HERO_SLIDES}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40"
                >
                  <Plus size={16} /> Add Banner
                </button>
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {values.heroSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setSelectedHeroIndex(index)}
                    className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${selectedHeroIndex === index ? "border-purple-400 bg-purple-50" : "border-gray-200 bg-gray-50 hover:bg-white"}`}
                  >
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
                      {slide.imageUrl ? <img src={slide.imageUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={20} className="text-gray-300" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400">Banner {index + 1}</p>
                      <p className="mt-0.5 truncate text-sm font-black text-gray-900">{slide.headline || "Untitled banner"}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-5">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-gray-950">Banner {selectedHeroIndex + 1}</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">Upload the photo and choose how the text should sit on top of it.</p>
                    </div>
                    <div className="flex gap-1">
                      <IconButton label="Move banner up" disabled={selectedHeroIndex === 0} onClick={() => moveHero(selectedHeroIndex, -1)}><ChevronUp size={16} /></IconButton>
                      <IconButton label="Move banner down" disabled={selectedHeroIndex === values.heroSlides.length - 1} onClick={() => moveHero(selectedHeroIndex, 1)}><ChevronDown size={16} /></IconButton>
                      <IconButton label="Delete banner" disabled={values.heroSlides.length <= 1} onClick={() => removeHero(selectedHeroIndex)} danger><Trash2 size={16} /></IconButton>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    {selectedHero.imageUrl ? (
                      <div className="relative aspect-[16/7] bg-gray-100">
                        <img src={selectedHero.imageUrl} alt="" className="h-full w-full object-cover" style={{ objectPosition: selectedHero.imagePosition }} />
                        <button type="button" onClick={() => updateHero({ imageUrl: "" })} className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-black text-white">Remove</button>
                      </div>
                    ) : (
                      <div className="flex aspect-[16/7] items-center justify-center bg-gray-50 text-gray-300"><Images size={36} /></div>
                    )}
                    <label className="flex cursor-pointer items-center justify-center gap-2 border-t border-gray-200 px-4 py-3 text-sm font-black text-purple-700 hover:bg-purple-50">
                      {uploadingHeroIndex === selectedHeroIndex ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {selectedHero.imageUrl ? "Replace Photo" : "Upload Photo"}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadHero} disabled={uploadingHeroIndex !== null || disabled} />
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Headline" value={selectedHero.headline} maxLength={160} onChange={(value) => updateHero({ headline: value })} />
                  <TextField label="Button Text" value={selectedHero.ctaLabel} maxLength={80} disabled={selectedHero.ctaDestination === "none"} onChange={(value) => updateHero({ ctaLabel: value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Supporting Text</label>
                  <textarea rows={4} value={selectedHero.subheadline} maxLength={300} onChange={(event) => updateHero({ subheadline: event.target.value })} className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm leading-6" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Choice label="Text on the Photo" value={selectedHero.textStyle} options={[["dark", "Dark text"], ["light", "Light text"]]} onChange={(value) => updateHero({ textStyle: value as BloomWebsiteHeroSlide["textStyle"] })} />
                  <Choice label="Photo Overlay" value={selectedHero.overlay} options={[["none", "None"], ["soft", "Soft"], ["medium", "Medium"], ["strong", "Strong"]]} onChange={(value) => updateHero({ overlay: value as BloomWebsiteHeroSlide["overlay"] })} />
                  <Choice label="Text Position" value={selectedHero.alignment} options={[["left", "Left"], ["center", "Center"]]} onChange={(value) => updateHero({ alignment: value as BloomWebsiteHeroSlide["alignment"] })} />
                  <Choice label="Photo Focus" value={selectedHero.imagePosition} options={[["top", "Top"], ["center", "Center"], ["bottom", "Bottom"]]} onChange={(value) => updateHero({ imagePosition: value as BloomWebsiteHeroSlide["imagePosition"] })} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-gray-600">Button Goes To</label>
                    <select value={selectedHero.ctaDestination} onChange={(event) => updateHero({ ctaDestination: event.target.value as BloomWebsiteHeroSlide["ctaDestination"] })} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm">
                      <option value="shop">Shop Flowers</option>
                      <option value="about">About Page</option>
                      <option value="custom">Custom Link</option>
                      <option value="none">No Button</option>
                    </select>
                  </div>
                  {selectedHero.ctaDestination === "custom" ? <TextField label="Custom Link" value={selectedHero.ctaHref} maxLength={2000} onChange={(value) => updateHero({ ctaHref: value })} /> : null}
                </div>

                {values.theme === "bloom-classic" && selectedHeroIndex === 0 && !selectedHero.imageUrl ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-sm font-black text-blue-950">Classic image-free banner card</p><p className="mt-1 text-xs leading-5 text-blue-800">When Classic has no main photo, this supporting card fills the right side on larger screens.</p></div>
                      <button type="button" onClick={resetHeroInfoCard} className="shrink-0 text-xs font-black text-blue-800 hover:text-blue-950">Use Bloom defaults</button>
                    </div>
                    <div className="mt-4 space-y-3">
                      <TextField label="Small Label" value={values.heroInfoCard.eyebrow} maxLength={80} onChange={(value) => updateHeroInfoCard("eyebrow", value)} />
                      <TextField label="Card Heading" value={values.heroInfoCard.heading} maxLength={120} onChange={(value) => updateHeroInfoCard("heading", value)} />
                      <div><label className="text-xs font-bold text-gray-600">Card Description</label><textarea rows={4} value={values.heroInfoCard.description} maxLength={320} onChange={(event) => updateHeroInfoCard("description", event.target.value)} className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm leading-6" /></div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {activeSection === "homepage" ? (
            <div className="space-y-5">
              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">Homepage Layout</p>
                <h2 className="mt-2 text-2xl font-black text-gray-950">Put the important things in the right order.</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">Turn sections on or off, then move them up or down. Your main banner always stays at the top.</p>
                <div className="mt-6 space-y-2">
                  {values.sectionOrder.map((key, index) => {
                    const visible = values.sectionVisibility[key];
                    return (
                      <div key={key} className={`flex items-center gap-3 rounded-2xl border p-3 ${visible ? "border-gray-200 bg-white" : "border-gray-200 bg-gray-50 opacity-65"}`}>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                          {key === "contact" ? <MapPinned size={18} /> : key === "merchandising" ? <PackagePlus size={18} /> : <LayoutTemplate size={18} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-gray-950">{SECTION_LABELS[key].label}</p>
                          <p className="mt-0.5 text-xs leading-5 text-gray-500">{SECTION_LABELS[key].help}</p>
                        </div>
                        <button type="button" onClick={() => toggleHomepageSection(key)} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-900" aria-label={visible ? `Hide ${SECTION_LABELS[key].label}` : `Show ${SECTION_LABELS[key].label}`}>
                          {visible ? <Eye size={17} /> : <EyeOff size={17} />}
                        </button>
                        <div className="flex flex-col gap-1">
                          <IconButton label="Move section up" disabled={index === 0} onClick={() => moveHomepageSection(index, -1)}><ChevronUp size={15} /></IconButton>
                          <IconButton label="Move section down" disabled={index === values.sectionOrder.length - 1} onClick={() => moveHomepageSection(index, 1)}><ChevronDown size={15} /></IconButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">Meet Your Florist</p>
                <h2 className="mt-2 text-xl font-black text-gray-950">Give your shop story its own photo.</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">Use a storefront, team, designer, or behind-the-scenes photo. Bloom will no longer reuse the main banner here.</p>
                <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                  {values.aboutImage ? (
                    <div className="relative aspect-[16/10] bg-gray-100">
                      <img src={values.aboutImage} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => { setValues((current) => ({ ...current, aboutImage: "" })); touch(); }} className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-black text-white">Remove</button>
                    </div>
                  ) : (
                    <div className="flex aspect-[16/10] items-center justify-center text-center text-gray-400"><div><ImageIcon size={32} className="mx-auto" /><p className="mt-2 text-sm font-bold">No florist story photo yet</p></div></div>
                  )}
                  <label className="flex cursor-pointer items-center justify-center gap-2 border-t border-gray-200 bg-white px-4 py-3 text-sm font-black text-purple-700 hover:bg-purple-50">
                    {uploadingAboutImage ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {values.aboutImage ? "Replace Photo" : "Upload Photo"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadAboutImage} disabled={uploadingAboutImage || disabled} />
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">Homepage Product Collections</p>
                    <h2 className="mt-2 text-xl font-black text-gray-950">Show customers more reasons to shop.</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">Add focused product rows for Birthday, Sympathy, Anniversary, seasonal collections, categories, or all products.</p>
                  </div>
                  <button type="button" onClick={addMerchandisingSection} disabled={values.merchandisingSections.length >= 8} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40"><Plus size={16} /> Add Collection</button>
                </div>

                {values.merchandisingSections.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
                    <PackagePlus size={28} className="mx-auto text-gray-300" />
                    <p className="mt-3 text-sm font-black text-gray-800">No extra product collections yet.</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">Your Featured Flowers section still works normally.</p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {values.merchandisingSections.map((section, index) => (
                      <div key={section.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => updateMerchandisingSection(index, { enabled: !section.enabled })} className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${section.enabled ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-500"}`}>{section.enabled ? "Shown" : "Hidden"}</button>
                            <p className="font-black text-gray-950">{section.heading || `Collection ${index + 1}`}</p>
                          </div>
                          <div className="flex gap-1">
                            <IconButton label="Move collection up" disabled={index === 0} onClick={() => moveMerchandisingSection(index, -1)}><ChevronUp size={15} /></IconButton>
                            <IconButton label="Move collection down" disabled={index === values.merchandisingSections.length - 1} onClick={() => moveMerchandisingSection(index, 1)}><ChevronDown size={15} /></IconButton>
                            <IconButton label="Delete collection" onClick={() => removeMerchandisingSection(index)} danger><Trash2 size={15} /></IconButton>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <TextField label="Small Label" value={section.eyebrow} maxLength={80} onChange={(value) => updateMerchandisingSection(index, { eyebrow: value })} />
                          <TextField label="Section Heading" value={section.heading} maxLength={140} onChange={(value) => updateMerchandisingSection(index, { heading: value })} />
                        </div>
                        <div className="mt-4"><label className="text-xs font-bold text-gray-600">Description</label><textarea rows={3} value={section.description} maxLength={420} onChange={(event) => updateMerchandisingSection(index, { description: event.target.value })} className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm leading-6" /></div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
                          <div>
                            <label className="text-xs font-bold text-gray-600">Show Products From</label>
                            <select value={section.sourceType} onChange={(event) => updateMerchandisingSection(index, { sourceType: event.target.value as BloomWebsiteHomepageMerchandisingSection["sourceType"], sourceValue: "" })} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm">
                              <option value="occasion">Occasion</option>
                              <option value="category">Category</option>
                              <option value="featured">Featured Products</option>
                              <option value="all">All Products</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-600">{section.sourceType === "occasion" ? "Occasion" : section.sourceType === "category" ? "Category" : "Selection"}</label>
                            {section.sourceType === "occasion" ? (
                              <select value={section.sourceValue} onChange={(event) => updateMerchandisingSection(index, { sourceValue: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"><option value="">Choose occasion</option>{availableOccasions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                            ) : section.sourceType === "category" ? (
                              <select value={section.sourceValue} onChange={(event) => updateMerchandisingSection(index, { sourceValue: event.target.value })} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"><option value="">Choose category</option>{availableCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
                            ) : (
                              <div className="mt-2 flex min-h-[42px] items-center rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-500">Automatic</div>
                            )}
                          </div>
                          <div><label className="text-xs font-bold text-gray-600">Products</label><select value={section.productLimit} onChange={(event) => updateMerchandisingSection(index, { productLimit: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm">{[3,4,6,8,9,12].map((count) => <option key={count} value={count}>{count}</option>)}</select></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">Section Wording</p>
                <h2 className="mt-2 text-xl font-black text-gray-950">Make the homepage sound like your flower shop.</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">Choose a section and edit only the words customers will read.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {HOMEPAGE_COPY_SECTIONS.map((section) => (
                    <button key={section.key} type="button" onClick={() => setHomepageCopySection(section.key)} className={`rounded-full px-3 py-2 text-xs font-black transition ${homepageCopySection === section.key ? "bg-purple-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{section.label}</button>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-black text-gray-950">{HOMEPAGE_COPY_SECTIONS.find((item) => item.key === homepageCopySection)?.label}</p><p className="mt-1 text-xs leading-5 text-gray-500">{HOMEPAGE_COPY_SECTIONS.find((item) => item.key === homepageCopySection)?.help}</p></div>
                    <button type="button" onClick={resetHomepageCopy} className="shrink-0 text-xs font-black text-purple-700 hover:text-purple-900">Use Bloom defaults</button>
                  </div>
                  <div className="mt-5 space-y-4">
                    <TextField label="Small Label" value={activeHomepageCopy.eyebrow} maxLength={80} onChange={(value) => updateHomepageCopy("eyebrow", value)} />
                    <TextField label="Section Heading" value={activeHomepageCopy.heading} maxLength={140} onChange={(value) => updateHomepageCopy("heading", value)} />
                    <div><label className="text-xs font-bold text-gray-600">Description</label><textarea rows={5} value={activeHomepageCopy.description} maxLength={420} onChange={(event) => updateHomepageCopy("description", event.target.value)} className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm leading-6" /></div>
                  </div>
                </div>

                {homepageCopySection === "trust" ? (
                  <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5">
                    <p className="font-black text-gray-950">Why Shop Local points</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      {values.trustPoints.map((point, index) => (
                        <div key={index} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-400">Point {index + 1}</p><button type="button" onClick={() => resetTrustPoint(index)} className="text-[10px] font-black text-purple-700 hover:text-purple-900">Use default</button></div>
                          <div className="mt-3 space-y-3"><TextField label="Heading" value={point.title} maxLength={100} onChange={(value) => updateTrustPoint(index, "title", value)} /><div><label className="text-xs font-bold text-gray-600">Description</label><textarea rows={3} value={point.description} maxLength={260} onChange={(event) => updateTrustPoint(index, "description", event.target.value)} className="mt-2 w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm leading-6" /></div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}
        </div>

        <div className="min-w-0 xl:sticky xl:top-6 xl:h-fit">
          <BloomWebsiteLiveStorefrontViewer
            previewSlug={previewSlug}
            theme={values.theme}
            siteName={siteName}
            logo={logo}
            tagline={tagline}
            heroHeadline={primaryHero?.headline || ""}
            heroSubheadline={primaryHero?.subheadline || ""}
            heroInfoCard={values.heroInfoCard}
            trustPoints={values.trustPoints}
            socialLinks={socialLinks}
            sectionContent={values.sectionContent}
            sectionOrder={values.sectionOrder}
            sectionVisibility={values.sectionVisibility}
            merchandisingSections={values.merchandisingSections}
            aboutImage={values.aboutImage}
            primaryColor={primaryColor}
            accentColor={accentColor}
            heroImage={primaryHero?.imageUrl || ""}
            heroSlides={values.heroSlides}
          />
        </div>
      </div>

      <div className="fixed bottom-4 left-4 right-4 z-30 lg:left-auto lg:right-8 lg:w-[min(720px,calc(100vw-4rem))]">
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="px-2"><p className="text-sm font-black text-gray-900">{hasChanges ? "You have unsaved storefront changes." : "Your storefront is saved."}</p><p className="mt-0.5 text-xs text-gray-500">Uploaded images are not published until you save.</p></div>
          <div className="flex gap-2"><button type="button" onClick={discardChanges} disabled={!hasChanges || saving || disabled} className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-black text-gray-700 disabled:opacity-40">Discard</button><button type="button" onClick={saveStorefront} disabled={!hasChanges || saving || disabled || uploadingHeroIndex !== null || uploadingAboutImage} className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-black text-white disabled:opacity-40">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? "Saving..." : "Save Storefront"}</button></div>
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ selected, title, description, onClick, previewClass }: { selected: boolean; title: string; description: string; onClick: () => void; previewClass: string }) {
  return (
    <button type="button" onClick={onClick} className={`overflow-hidden rounded-2xl border text-left transition ${selected ? "border-purple-500 ring-2 ring-purple-100" : "border-gray-200 hover:border-gray-300"}`}>
      <div className={`h-28 ${previewClass}`}><div className="mx-auto flex h-full max-w-[78%] items-center"><div className="w-full space-y-2"><div className="h-2 w-20 rounded bg-gray-400/40" /><div className="h-5 w-2/3 rounded bg-gray-900/60" /><div className="h-2 w-full rounded bg-gray-400/30" /><div className="h-2 w-4/5 rounded bg-gray-400/30" /></div></div></div>
      <div className="bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="font-black text-gray-950">{title}</p>{selected ? <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-purple-800">Selected</span> : null}</div><p className="mt-2 text-xs leading-5 text-gray-500">{description}</p></div>
    </button>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: readonly (readonly [string, string])[]; onChange: (value: string) => void }) {
  return <div><p className="text-xs font-bold text-gray-600">{label}</p><div className="mt-2 grid grid-cols-2 gap-2">{options.map(([key, text]) => <button key={key} type="button" onClick={() => onChange(key)} className={`rounded-xl border px-3 py-2.5 text-xs font-black transition ${value === key ? "border-purple-500 bg-purple-50 text-purple-900" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>{text}</button>)}</div></div>;
}

function TextField({ label, value, maxLength, onChange, disabled = false }: { label: string; value: string; maxLength: number; onChange: (value: string) => void; disabled?: boolean }) {
  return <div><label className="text-xs font-bold text-gray-600">{label}</label><input value={value} maxLength={maxLength} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm disabled:bg-gray-100" /></div>;
}

function IconButton({ label, onClick, disabled = false, danger = false, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={`rounded-lg border p-2 transition disabled:opacity-30 ${danger ? "border-red-200 bg-white text-red-600 hover:bg-red-50" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900"}`}>{children}</button>;
}
