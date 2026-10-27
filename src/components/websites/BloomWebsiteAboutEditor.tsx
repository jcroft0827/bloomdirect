"use client";

import { ArrowDown, ArrowUp, Check, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import BloomWebsiteAboutStorefront from "@/components/websites/storefront/BloomWebsiteAboutStorefront";
import type { BloomWebsiteStorefront } from "@/types/bloom-website";
import PageEditorLivePreview from "@/components/websites/PageEditorLivePreview";

import { generateBloomWebsiteAboutSections } from "@/lib/bloom-websites/about-content";
import type {
  BloomWebsiteAboutFacts,
  BloomWebsiteAboutSection,
} from "@/types/bloom-website";

type Props = {
  storefront: BloomWebsiteStorefront | null;
  businessName: string;
  city: string;
  state: string;
  storefrontAboutImage: string;
  suggestedSectionKeys: string[];
  initialValues: {
    useCustomImage: boolean;
    customImageUrl: string;
    enabled: boolean;
    heading: string;
    contentMode: "custom" | "guided";
    facts: BloomWebsiteAboutFacts;
    sections: BloomWebsiteAboutSection[];
  };
};

export default function BloomWebsiteAboutEditor({
  storefront,
  businessName,
  city,
  state,
  storefrontAboutImage,
  suggestedSectionKeys,
  initialValues,
}: Props) {
  const photoInput = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [values, setValues] = useState(initialValues);
  const [suggestedKeys, setSuggestedKeys] = useState<string[]>(suggestedSectionKeys);
  // Suggested content is draft-only and must be explicitly saved by the florist.
  // Preserve the original empty values in the saved snapshot so Save is enabled.
  const [saved, setSaved] = useState(() => ({
    ...initialValues,
    sections: initialValues.sections.map(section =>
      suggestedSectionKeys.includes(section.key) ? { ...section, body: "" } : section,
    ),
  }));
  const [saving, setSaving] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(saved),
    [values, saved],
  );

  async function toggleVisibility(enabled: boolean) {
    if (visibilitySaving) return;
    const previous = values.enabled;
    setValues(current => ({ ...current, enabled }));
    setVisibilitySaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/websites/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ section: "pageVisibility", data: { page: "aboutPage", enabled } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update page visibility.");
      setSaved(current => ({ ...current, enabled }));
      setMessage(enabled ? "About page is now visible to customers." : "About page is hidden from customers.");
    } catch (err) {
      setValues(current => ({ ...current, enabled: previous }));
      setError(err instanceof Error ? err.message : "Could not update page visibility.");
    } finally { setVisibilitySaving(false); }
  }

  async function uploadAboutPhoto(file?: File) {
    if (!file) return;
    setError(""); setUploadingPhoto(true);
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error("Choose a JPG, PNG or WebP photo under 8 MB.");
      const response = await fetch("/api/websites/images/upload-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assetType: "branding", fileType: file.type, fileSize: file.size }) });
      const data = await response.json();
      if (!response.ok || !data.uploadUrl || !data.publicUrl) throw new Error(data.error || "Could not prepare photo upload.");
      const upload = await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!upload.ok) throw new Error("Photo upload failed. Please try again.");
      setValues(current => ({ ...current, customImageUrl: data.publicUrl, useCustomImage: true }));
      setMessage("Photo uploaded. Save the About page to publish this change.");
    } catch (err) { setError(err instanceof Error ? err.message : "Photo upload failed."); }
    finally { setUploadingPhoto(false); if (photoInput.current) photoInput.current.value = ""; }
  }

  function addSection() {
    const next = (["extra1", "extra2", "extra3"] as const).find(key => !values.sections.some(section => section.key === key));
    if (!next) return;
    setValues(current => ({
      ...current,
      sections: [
        ...current.sections,
        {
          key: next,
          enabled: true,
          title: "A Little More About Us",
          body: "",
          textAlignment: "left",
          desktopTextAlignment: "left",
          mobileTextAlignment: "left",
          sortOrder: current.sections.length,
        },
      ],
    }));
  }

  function removeExtraSection(key: BloomWebsiteAboutSection["key"]) {
    setValues(current => ({ ...current, sections: current.sections.filter(section => section.key !== key).map((section, sortOrder) => ({ ...section, sortOrder })) }));
  }

  function updateFact(key: keyof BloomWebsiteAboutFacts, value: string) {
    setValues((current) => ({
      ...current,
      facts: { ...current.facts, [key]: value },
    }));
  }

  function updateSection(index: number, patch: Partial<BloomWebsiteAboutSection>) {
    if (Object.prototype.hasOwnProperty.call(patch, "body")) {
      setSuggestedKeys(current => current.filter(key => key !== values.sections[index]?.key));
    }
    setValues((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, ...patch } : section,
      ),
    }));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= values.sections.length) return;

    setValues((current) => {
      const sections = [...current.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return {
        ...current,
        sections: sections.map((section, sortOrder) => ({ ...section, sortOrder })),
      };
    });
  }

  function generateCopy() {
    const generated = generateBloomWebsiteAboutSections({
      businessName,
      city,
      state,
      facts: values.facts,
    });

    setValues((current) => {
      const currentSectionMap = new Map(current.sections.map((section) => [section.key, section]));
      return {
        ...current,
        contentMode: "guided",
        sections: [...generated, ...current.sections.filter(section => section.key.startsWith("extra"))]
          .map((section, sortOrder) => {
            const existing = currentSectionMap.get(section.key);
            return {
              ...section,
              textAlignment: existing?.textAlignment || "left",
              desktopTextAlignment: existing?.desktopTextAlignment || existing?.textAlignment || "left",
              mobileTextAlignment: existing?.mobileTextAlignment || existing?.textAlignment || "left",
              sortOrder,
            };
          }),
      };
    });
    setSuggestedKeys(generated.map(section => section.key));
    setMessage("Bloom drafted your About page. Review and edit it before saving.");
    setError("");
  }

  async function save() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/websites/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "aboutPage", data: values }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to save About page.");
      setSaved(values);
      setMessage("About page saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save About page.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,1fr)]"><div className="min-w-0 space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-purple-600">BloomWebsites</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">About page</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">
          Write it yourself or give Bloom the facts. Bloom will turn those facts into polished, local-search-friendly copy without inventing details.
        </p>
      </div>

      {message && <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800"><Check size={18} />{message}</div>}
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">{error}</div>}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-950">Page settings</h2>
            <p className="mt-1 text-sm text-gray-500">Keep the page live, rename it, or temporarily hide it.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <input type="checkbox" checked={values.enabled} disabled={visibilitySaving} onChange={(e) => void toggleVisibility(e.target.checked)} />
            Show About page
          </label>
        </div>
        <label className="mt-6 block text-sm font-bold text-gray-800">Page heading</label>
        <input className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3" maxLength={140} value={values.heading} onChange={(e) => setValues((c) => ({ ...c, heading: e.target.value }))} />
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black text-gray-950">About page photograph</h2>
        <p className="mt-2 text-sm text-gray-600">By default, we use the photo from your Storefront Editor. You can choose a separate image for this page.</p>
        <label className="mt-4 flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={values.useCustomImage} onChange={e => setValues(c => ({ ...c, useCustomImage: e.target.checked }))}/> Use a different photo for my About page</label>
        {values.useCustomImage && <div className="mt-4 space-y-3"><input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => void uploadAboutPhoto(e.target.files?.[0])}/><p className="text-xs text-gray-500">JPG, PNG or WebP · up to 8 MB</p>{uploadingPhoto && <p role="status" className="text-sm">Uploading photograph...</p>}</div>}
        {(values.useCustomImage ? values.customImageUrl : storefrontAboutImage) ? <img className="mt-4 aspect-[16/9] w-full rounded-2xl object-cover" src={values.useCustomImage ? values.customImageUrl : storefrontAboutImage} alt="About page photo preview"/> : <p className="mt-4 text-sm text-amber-700">No About photograph selected yet. Choose one in the Storefront Editor or upload a separate photo.</p>}
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black text-gray-950">How would you like to build this page?</h2>
        <p className="mt-1 text-sm text-gray-500">You can write every word yourself or give Bloom the facts and start from a polished draft.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setValues((current) => ({ ...current, contentMode: "custom" }))}
            className={`rounded-2xl border p-4 text-left transition ${
              values.contentMode === "custom"
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <p className="font-black text-gray-950">Write it myself</p>
            <p className="mt-1 text-sm leading-5 text-gray-500">Start with the editable sections below and make the page completely your own.</p>
          </button>
          <button
            type="button"
            onClick={() => setValues((current) => ({ ...current, contentMode: "guided" }))}
            className={`rounded-2xl border p-4 text-left transition ${
              values.contentMode === "guided"
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <p className="font-black text-gray-950">Let Bloom draft it</p>
            <p className="mt-1 text-sm leading-5 text-gray-500">Answer a few questions and Bloom turns those facts into editable SEO-friendly copy.</p>
          </button>
        </div>
      </section>

      {values.contentMode === "guided" && (
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <h2 className="text-xl font-black text-gray-950">Let Bloom help write it</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">Add only facts you are comfortable publishing. Empty fields are simply ignored.</p>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {([
            ["openingYear", "Opening year", "e.g. 1998"],
            ["founderNames", "Founder / owner names", "e.g. Maria and John Smith"],
            ["originStory", "How did the shop get started?", "Tell Bloom the real story."],
            ["specialties", "Specialties", "Weddings, sympathy, everyday design, plants..."],
            ["community", "Community involvement", "Local events, charities, schools, organizations..."],
            ["servicePhilosophy", "Service philosophy", "What do you want every customer to feel?"],
            ["differentiators", "What makes you different?", "Design style, sourcing, delivery, experience..."],
          ] as const).map(([key, label, placeholder]) => (
            <div key={key} className={key === "openingYear" || key === "founderNames" ? "" : "sm:col-span-2"}>
              <label className="text-sm font-bold text-gray-800">{label}</label>
              {key === "openingYear" || key === "founderNames" ? (
                <input className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3" value={values.facts[key]} placeholder={placeholder} onChange={(e) => updateFact(key, e.target.value)} />
              ) : (
                <textarea rows={3} className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3" value={values.facts[key]} placeholder={placeholder} onChange={(e) => updateFact(key, e.target.value)} />
              )}
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-purple-100 bg-purple-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-gray-950">Ready to turn those details into your About copy?</p>
            <p className="mt-1 text-sm leading-5 text-gray-600">Bloom will fill the editable About sections directly below. You can review and change every word before saving.</p>
          </div>
          <button type="button" onClick={generateCopy} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-3 text-sm font-black text-white">
            <Sparkles size={17} />
            Build my About copy
          </button>
        </div>
      </section>
      )}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black text-gray-950">Page sections</h2>
        <p className="mt-1 text-sm text-gray-500">Edit every word, hide sections you do not need, and move them into the order you prefer. Empty sections stay hidden from shoppers.</p>
        {values.sections.length < 6 && <button type="button" onClick={addSection} className="mt-4 rounded-xl border border-purple-300 px-4 py-2 text-sm font-bold text-purple-700 hover:bg-purple-50">+ Add another section ({values.sections.length}/6)</button>}

        <div className="mt-6 space-y-5">
          {values.sections.map((section, index) => (
            <div key={section.key} className="rounded-2xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <input type="checkbox" checked={section.enabled} onChange={(e) => updateSection(index, { enabled: e.target.checked })} />
                  Show section
                </label>
                <div className="flex gap-2">
                  {section.key.startsWith("extra") && <button type="button" onClick={() => removeExtraSection(section.key)} className="rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700">Remove</button>}
                  <button type="button" aria-label="Move section up" disabled={index === 0} onClick={() => moveSection(index, -1)} className="rounded-lg border border-gray-300 p-2 disabled:opacity-30"><ArrowUp size={16} /></button>
                  <button type="button" aria-label="Move section down" disabled={index === values.sections.length - 1} onClick={() => moveSection(index, 1)} className="rounded-lg border border-gray-300 p-2 disabled:opacity-30"><ArrowDown size={16} /></button>
                </div>
              </div>
              {suggestedKeys.includes(section.key) && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900" role="note">Suggested starter copy — please review and personalize before publishing.</p>}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">Desktop text alignment
                  <select className="mt-2 block w-full rounded-xl border border-gray-300 p-3" value={section.desktopTextAlignment || section.textAlignment || "left"} onChange={e=>updateSection(index,{textAlignment:e.target.value as "left"|"center"|"right",desktopTextAlignment:e.target.value as "left"|"center"|"right"})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>
                </label>
                <label className="block text-sm font-semibold">Mobile text alignment
                  <select className="mt-2 block w-full rounded-xl border border-gray-300 p-3" value={section.mobileTextAlignment || section.textAlignment || "left"} onChange={e=>updateSection(index,{mobileTextAlignment:e.target.value as "left"|"center"|"right"})}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select>
                </label>
              </div>
              <input className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 font-bold" maxLength={140} value={section.title} onChange={(e) => updateSection(index, { title: e.target.value })} />
              <textarea rows={section.key === "story" ? 9 : 5} className="mt-3 w-full rounded-xl border border-gray-300 px-4 py-3 leading-7" maxLength={6000} value={section.body} onChange={(e) => updateSection(index, { body: e.target.value })} />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button type="button" disabled={!dirty || saving} onClick={save} className="rounded-xl bg-gray-950 px-6 py-3 text-sm font-black text-white disabled:opacity-40">{saving ? "Saving..." : "Save About page"}</button>
      </div>
    </div>
    <PageEditorLivePreview enabled={values.enabled} shopName={businessName} title="About page" themeName={storefront?.website.theme}>
      {storefront ? <BloomWebsiteAboutStorefront editorPreview storefront={{...storefront, website: {...storefront.website, aboutPage: values, homepage: {...storefront.website.homepage, aboutImage: storefrontAboutImage}}}} /> : <p className="p-8 text-sm">A storefront preview is unavailable until the website is configured.</p>}
    </PageEditorLivePreview></div></div>
  );
}
