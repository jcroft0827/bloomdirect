"use client";

import { ArrowDown, ArrowUp, Check, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { generateBloomWebsiteAboutSections } from "@/lib/bloom-websites/about-content";
import type {
  BloomWebsiteAboutFacts,
  BloomWebsiteAboutSection,
} from "@/types/bloom-website";

type Props = {
  businessName: string;
  city: string;
  state: string;
  initialValues: {
    enabled: boolean;
    heading: string;
    contentMode: "custom" | "guided";
    facts: BloomWebsiteAboutFacts;
    sections: BloomWebsiteAboutSection[];
  };
};

export default function BloomWebsiteAboutEditor({
  businessName,
  city,
  state,
  initialValues,
}: Props) {
  const [values, setValues] = useState(initialValues);
  const [saved, setSaved] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const dirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(saved),
    [values, saved],
  );

  function updateFact(key: keyof BloomWebsiteAboutFacts, value: string) {
    setValues((current) => ({
      ...current,
      facts: { ...current.facts, [key]: value },
    }));
  }

  function updateSection(index: number, patch: Partial<BloomWebsiteAboutSection>) {
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

    setValues((current) => ({
      ...current,
      contentMode: "guided",
      sections: generated,
    }));
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
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
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
            <input type="checkbox" checked={values.enabled} onChange={(e) => setValues((c) => ({ ...c, enabled: e.target.checked }))} />
            Show About page
          </label>
        </div>
        <label className="mt-6 block text-sm font-bold text-gray-800">Page heading</label>
        <input className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3" maxLength={140} value={values.heading} onChange={(e) => setValues((c) => ({ ...c, heading: e.target.value }))} />
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-950">Let Bloom help write it</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">Add only facts you are comfortable publishing. Empty fields are simply ignored.</p>
          </div>
          <button type="button" onClick={generateCopy} className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-3 text-sm font-black text-white"><Sparkles size={17} />Build my About copy</button>
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
      </section>
      )}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-black text-gray-950">Page sections</h2>
        <p className="mt-1 text-sm text-gray-500">Edit every word, hide sections you do not need, and move them into the order you prefer.</p>

        <div className="mt-6 space-y-5">
          {values.sections.map((section, index) => (
            <div key={section.key} className="rounded-2xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <input type="checkbox" checked={section.enabled} onChange={(e) => updateSection(index, { enabled: e.target.checked })} />
                  Show section
                </label>
                <div className="flex gap-2">
                  <button type="button" aria-label="Move section up" disabled={index === 0} onClick={() => moveSection(index, -1)} className="rounded-lg border border-gray-300 p-2 disabled:opacity-30"><ArrowUp size={16} /></button>
                  <button type="button" aria-label="Move section down" disabled={index === values.sections.length - 1} onClick={() => moveSection(index, 1)} className="rounded-lg border border-gray-300 p-2 disabled:opacity-30"><ArrowDown size={16} /></button>
                </div>
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
  );
}
