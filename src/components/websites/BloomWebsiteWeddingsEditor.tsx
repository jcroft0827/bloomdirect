"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import PageEditorLivePreview from "@/components/websites/PageEditorLivePreview";
import BloomWebsiteWeddingsStorefront from "@/components/websites/storefront/BloomWebsiteWeddingsStorefront";
import type {
  BloomWebsiteStorefront,
  BloomWebsiteTextAlignment,
  BloomWebsiteWeddingFloralDecoration,
  BloomWebsiteWeddingsPage,
} from "@/types/bloom-website";

const ALIGNMENT_OPTIONS: Array<{
  value: BloomWebsiteTextAlignment;
  label: string;
}> = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

function AlignmentControls({
  label,
  desktopValue,
  mobileValue,
  onDesktopChange,
  onMobileChange,
}: {
  label: string;
  desktopValue: BloomWebsiteTextAlignment;
  mobileValue: BloomWebsiteTextAlignment;
  onDesktopChange: (value: BloomWebsiteTextAlignment) => void;
  onMobileChange: (value: BloomWebsiteTextAlignment) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Desktop
          <select
            className="mt-2 block w-full rounded-lg border p-3"
            value={desktopValue}
            onChange={(event) =>
              onDesktopChange(event.target.value as BloomWebsiteTextAlignment)
            }
          >
            {ALIGNMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Mobile
          <select
            className="mt-2 block w-full rounded-lg border p-3"
            value={mobileValue}
            onChange={(event) =>
              onMobileChange(event.target.value as BloomWebsiteTextAlignment)
            }
          >
            {ALIGNMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

export default function BloomWebsiteWeddingsEditor({
  initialValues,
  previewSlug,
  shopName,
  storefront,
}: {
  initialValues: BloomWebsiteWeddingsPage;
  previewSlug: string;
  shopName: string;
  storefront: BloomWebsiteStorefront | null;
}) {
  const [values, setValues] = useState<BloomWebsiteWeddingsPage>(initialValues);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function movePhoto(index: number, delta: number) {
    setValues((previous) => {
      const next = [...previous.portfolio];
      const target = index + delta;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...previous, portfolio: next };
    });
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return;

    const selected = Array.from(files);
    if (values.portfolio.length + selected.length > 18) {
      setMessage("A portfolio can have up to 18 images.");
      return;
    }

    setUploading(true);
    setMessage("");
    let uploaded = 0;

    try {
      for (const file of selected) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 8 * 1024 * 1024 ||
          file.size === 0
        ) {
          throw new Error("Choose JPG, PNG, or WebP images smaller than 8 MB.");
        }

        const signed = await fetch("/api/websites/images/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetType: "wedding",
            fileType: file.type,
            fileSize: file.size,
          }),
        });
        const data = await signed.json();

        if (!signed.ok || !data.uploadUrl || !data.publicUrl) {
          throw new Error(data.error || "Could not prepare image upload.");
        }

        const result = await fetch(data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error("Image upload failed. Please try again.");
        }

        setValues((previous) => ({
          ...previous,
          portfolio: [
            ...previous.portfolio,
            { url: data.publicUrl, alt: "", caption: "" },
          ],
        }));
        uploaded += 1;
      }

      setMessage(
        `${uploaded} photo${uploaded === 1 ? "" : "s"} uploaded. Add descriptions and save the page to publish changes.`,
      );
    } catch (error) {
      setMessage(
        `${error instanceof Error ? error.message : "Upload failed."}${
          uploaded ? ` ${uploaded} photo(s) were added; save the page to keep them.` : ""
        }`,
      );
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function toggleVisibility(enabled: boolean) {
    if (visibilitySaving) return;

    const previous = values.enabled;
    setValues((current) => ({ ...current, enabled }));
    setVisibilitySaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/websites/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "pageVisibility",
          data: { page: "weddingsPage", enabled },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not update visibility.");
      }
      setMessage(
        enabled
          ? "Weddings page is visible to customers."
          : "Weddings page is hidden from customers.",
      );
    } catch (error) {
      setValues((current) => ({ ...current, enabled: previous }));
      setMessage(
        error instanceof Error ? error.message : "Visibility change failed.",
      );
    } finally {
      setVisibilitySaving(false);
    }
  }

  function updateField(key: keyof BloomWebsiteWeddingsPage, value: string | boolean) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  const textFields: Array<{
    key:
      | "heading"
      | "introduction"
      | "services"
      | "eventTypes"
      | "serviceArea"
      | "consultationText"
      | "portfolioHeading"
      | "portfolioDescription";
    label: string;
    max: number;
    multiline?: boolean;
  }> = [
    { key: "heading", label: "Page heading", max: 140 },
    {
      key: "introduction",
      label: "Welcome / introduction",
      max: 1600,
      multiline: true,
    },
    {
      key: "portfolioHeading",
      label: "Portfolio heading",
      max: 120,
    },
    {
      key: "portfolioDescription",
      label: "Portfolio supporting text",
      max: 220,
    },
    {
      key: "services",
      label: "Floral services (one per line)",
      max: 2000,
      multiline: true,
    },
    {
      key: "eventTypes",
      label: "Events you design for (one per line)",
      max: 1200,
      multiline: true,
    },
    {
      key: "serviceArea",
      label: "Service area",
      max: 600,
      multiline: true,
    },
    {
      key: "consultationText",
      label: "Consultation invitation",
      max: 600,
      multiline: true,
    },
  ];

  async function save() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/websites/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "weddingsPage", data: values }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Save failed");
      setMessage("Saved. Preview your Weddings & Events page to review changes.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 sm:px-6">
      <div>
        <Link className="text-sm text-slate-500 underline" href="/dashboard/websites">
          ← Websites
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Weddings &amp; Events</h1>
        <p className="mt-2 text-slate-600">
          Create a beautiful portfolio for weddings, celebrations, and custom floral work.
          Keep the page hidden until ready.
        </p>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,1fr)]">
        <div className="min-w-0 space-y-6">
          <label className="flex items-center gap-3 rounded-xl border p-5">
            <input
              type="checkbox"
              checked={values.enabled}
              disabled={visibilitySaving}
              onChange={(event) => void toggleVisibility(event.target.checked)}
            />
            <span className="font-semibold">Show Weddings &amp; Events on my website</span>
          </label>

          <section className="space-y-4 rounded-2xl border p-5 sm:p-8">
            <div>
              <h2 className="text-xl font-bold">Page appearance</h2>
              <p className="mt-1 text-sm text-slate-600">
                Choose a polished look. The preview updates as you make changes; save to publish them.
              </p>
            </div>

            <AlignmentControls
              label="Banner text alignment"
              desktopValue={values.headingAlignmentDesktop || values.headingAlignment || "center"}
              mobileValue={values.headingAlignmentMobile || values.headingAlignment || "center"}
              onDesktopChange={(value) =>
                setValues((current) => ({
                  ...current,
                  headingAlignment: value,
                  headingAlignmentDesktop: value,
                }))
              }
              onMobileChange={(value) =>
                setValues((current) => ({
                  ...current,
                  headingAlignmentMobile: value,
                }))
              }
            />

            <AlignmentControls
              label="Service and event text alignment"
              desktopValue={values.contentAlignmentDesktop || values.contentAlignment || "left"}
              mobileValue={values.contentAlignmentMobile || values.contentAlignment || "left"}
              onDesktopChange={(value) =>
                setValues((current) => ({
                  ...current,
                  contentAlignment: value,
                  contentAlignmentDesktop: value,
                }))
              }
              onMobileChange={(value) =>
                setValues((current) => ({
                  ...current,
                  contentAlignmentMobile: value,
                }))
              }
            />
          </section>

          <section className="grid gap-6 rounded-2xl border p-5 sm:p-8">
            {textFields.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-2 block text-sm font-semibold">{field.label}</span>
                {field.multiline ? (
                  <textarea
                    className="min-h-28 w-full rounded-lg border p-3"
                    maxLength={field.max}
                    value={values[field.key] as string}
                    onChange={(event) => updateField(field.key, event.target.value)}
                  />
                ) : (
                  <input
                    className="w-full rounded-lg border p-3"
                    maxLength={field.max}
                    value={values[field.key] as string}
                    onChange={(event) => updateField(field.key, event.target.value)}
                  />
                )}
              </label>
            ))}
          </section>

          <section className="space-y-5 rounded-2xl border p-5 sm:p-8">
            <div>
              <h2 className="text-xl font-bold">Wedding &amp; event portfolio</h2>
              <p className="mt-1 text-sm text-slate-600">
                Upload up to 18 JPG, PNG, or WebP photos (8 MB each). The first photo is featured.
                Reorder photos to change their appearance on your storefront.
              </p>
            </div>

            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              aria-label="Choose wedding portfolio photos"
              onChange={(event) => void uploadPhotos(event.target.files)}
            />
            <button
              type="button"
              disabled={uploading || busy || values.portfolio.length >= 18}
              className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? "Uploading photos…" : "Upload photos"}
            </button>
            <p className="text-xs text-slate-500">
              Images upload to your shop&apos;s media storage first. Select Save Weddings &amp; Events below to publish your changes.
            </p>

            {values.portfolio.map((photo, index) => (
              <div
                key={`${photo.url}-${index}`}
                className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-[9rem_1fr]"
              >
                <div>
                  {photo.url ? (
                    <img
                      src={photo.url}
                      alt={photo.alt || "Portfolio preview"}
                      className="aspect-[4/5] w-full rounded-lg object-cover"
                    />
                  ) : null}
                  {index === 0 ? (
                    <span className="mt-2 block text-xs font-bold text-amber-700">
                      Featured photo
                    </span>
                  ) : null}
                </div>
                <div className="space-y-3">
                  {(["alt", "caption"] as const).map((field) => (
                    <label key={field} className="block text-sm">
                      <span className="mb-1 block font-medium">
                        {field === "alt"
                          ? "Image description (accessibility)"
                          : "Optional caption"}
                      </span>
                      <input
                        className="w-full rounded-lg border p-2"
                        value={photo[field]}
                        maxLength={field === "alt" ? 180 : 240}
                        onChange={(event) =>
                          setValues((previous) => ({
                            ...previous,
                            portfolio: previous.portfolio.map((portfolioPhoto, photoIndex) =>
                              index === photoIndex
                                ? { ...portfolioPhoto, [field]: event.target.value }
                                : portfolioPhoto,
                            ),
                          }))
                        }
                      />
                    </label>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={index === 0}
                      className="rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-40"
                      onClick={() => movePhoto(index, -1)}
                    >
                      ↑ Move up
                    </button>
                    <button
                      type="button"
                      disabled={index === values.portfolio.length - 1}
                      className="rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-40"
                      onClick={() => movePhoto(index, 1)}
                    >
                      ↓ Move down
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-700"
                      onClick={() =>
                        setValues((previous) => ({
                          ...previous,
                          portfolio: previous.portfolio.filter((_, photoIndex) => photoIndex !== index),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {values.portfolio.length === 0 ? (
              <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                No photos yet. Upload some of your favorite wedding or event work.
              </p>
            ) : null}
          </section>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              className="rounded-full border px-7 py-3 font-semibold"
              href="/dashboard/websites/weddings/inquiries"
            >
              View event inquiries →
            </Link>
            <button
              type="button"
              disabled={busy || uploading}
              onClick={save}
              className="rounded-full bg-slate-900 px-7 py-3 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save Weddings & Events"}
            </button>
            <Link
              className="rounded-full border px-7 py-3 font-semibold"
              href={`/websites/preview/${previewSlug}/weddings`}
              target="_blank"
            >
              Preview page
            </Link>
          </div>

          {message ? <p role="status" className="text-sm">{message}</p> : null}

          <p className="text-sm text-amber-800">
            Live websites now accept consultation requests through a secure inquiry form. Preview mode never submits real inquiries.
          </p>
        </div>

        <PageEditorLivePreview
          enabled={values.enabled}
          shopName={shopName}
          title="Weddings & Events"
          themeName={storefront?.website.theme}
        >
          {storefront ? (
            <BloomWebsiteWeddingsStorefront
              editorPreview
              storefront={{
                ...storefront,
                website: {
                  ...storefront.website,
                  weddingsPage: { ...values, enabled: true },
                  status: "preview",
                },
              }}
            />
          ) : (
            <p className="p-8 text-sm">
              A storefront preview is unavailable until the website is configured.
            </p>
          )}
        </PageEditorLivePreview>
      </div>
    </main>
  );
}
