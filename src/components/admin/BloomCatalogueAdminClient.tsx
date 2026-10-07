"use client";

import {
  Check,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import {
  uploadBloomCatalogueImage,
  type BloomCatalogueImageUpload,
} from "@/lib/bloom-websites/uploadBloomCatalogueImage";

export type AdminBloomCatalogueItem = {
  id: string;
  title: string;
  description: string;
  flowers: string[];
  colors: string[];
  occasions: string[];
  categories: string[];
  tags: string[];
  image: BloomCatalogueImageUpload;
  isDesignerChoice: boolean;
  isActive: boolean;
  sortOrder: number;
};

type Props = {
  initialItems: AdminBloomCatalogueItem[];
};

type FormState = {
  title: string;
  description: string;
  flowers: string;
  colors: string;
  occasions: string;
  categories: string;
  tags: string;
  isDesignerChoice: boolean;
  isActive: boolean;
  sortOrder: string;
};

type BulkImportStatus = "ready" | "uploading" | "saved" | "error";

type BulkImportRow = {
  id: string;
  file: File;
  title: string;
  isDesignerChoice: boolean;
  status: BulkImportStatus;
  error: string;
  image?: BloomCatalogueImageUpload;
};

const MAX_BULK_IMPORT_FILES = 50;

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  flowers: "",
  colors: "",
  occasions: "",
  categories: "",
  tags: "",
  isDesignerChoice: false,
  isActive: true,
  sortOrder: "0",
};

function csv(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function join(values: string[]) {
  return values.join(", ");
}

function titleFromFilename(filename: string) {
  const withoutExtension = filename.replace(/\.[^.]+$/, "");
  const cleaned = withoutExtension
    .replace(/^[\s_-]*\d+[\s._-]*/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "Untitled arrangement";

  return cleaned
    .split(" ")
    .map((word) =>
      word.length > 0
        ? `${word.charAt(0).toUpperCase()}${word.slice(1)}`
        : word,
    )
    .join(" ")
    .slice(0, 160);
}

function bulkRowId(file: File, index: number) {
  return `${file.name}-${file.size}-${file.lastModified}-${index}`;
}

function normalizeItem(item: Record<string, unknown>): AdminBloomCatalogueItem {
  return {
    id: String(item._id || item.id || ""),
    title: String(item.title || ""),
    description: String(item.description || ""),
    flowers: Array.isArray(item.flowers) ? item.flowers.map(String) : [],
    colors: Array.isArray(item.colors) ? item.colors.map(String) : [],
    occasions: Array.isArray(item.occasions) ? item.occasions.map(String) : [],
    categories: Array.isArray(item.categories) ? item.categories.map(String) : [],
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    image: (item.image || {}) as BloomCatalogueImageUpload,
    isDesignerChoice: item.isDesignerChoice === true,
    isActive: item.isActive !== false,
    sortOrder: Number(item.sortOrder) || 0,
  };
}

export default function BloomCatalogueAdminClient({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [image, setImage] = useState<BloomCatalogueImageUpload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bulkRows, setBulkRows] = useState<BulkImportRow[]>([]);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;

    return items.filter((item) =>
      [
        item.title,
        item.description,
        ...item.flowers,
        ...item.colors,
        ...item.occasions,
        ...item.categories,
        ...item.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [items, query]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImage(null);
    setError("");
    setSuccess("");
  }

  function editItem(item: AdminBloomCatalogueItem) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      flowers: join(item.flowers),
      colors: join(item.colors),
      occasions: join(item.occasions),
      categories: join(item.categories),
      tags: join(item.tags),
      isDesignerChoice: item.isDesignerChoice,
      isActive: item.isActive,
      sortOrder: String(item.sortOrder),
    });
    setImage(item.image);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBulkFiles(fileList: FileList | null) {
    if (!fileList) return;

    const selected = Array.from(fileList).slice(0, MAX_BULK_IMPORT_FILES);
    const rows = selected.map((file, index) => ({
      id: bulkRowId(file, index),
      file,
      title: titleFromFilename(file.name),
      isDesignerChoice: false,
      status: "ready" as const,
      error: "",
    }));

    setBulkRows(rows);
    setBulkMessage(
      fileList.length > MAX_BULK_IMPORT_FILES
        ? `Only the first ${MAX_BULK_IMPORT_FILES} images were added. Import the remainder in a second batch.`
        : "",
    );
  }

  function updateBulkRow(
    id: string,
    changes: Partial<Pick<BulkImportRow, "title" | "isDesignerChoice">>,
  ) {
    setBulkRows((current) =>
      current.map((row) =>
        row.id === id && (row.status === "ready" || row.status === "error")
          ? { ...row, ...changes }
          : row,
      ),
    );
  }

  function removeBulkRow(id: string) {
    setBulkRows((current) => current.filter((row) => row.id !== id));
  }

  async function handleBulkImport() {
    const pendingRows = bulkRows.filter(
      (row) => row.status === "ready" || row.status === "error",
    );

    if (pendingRows.length === 0) return;

    if (pendingRows.some((row) => !row.title.trim())) {
      setBulkMessage("Every selected image needs a title before import.");
      return;
    }

    setBulkImporting(true);
    setBulkMessage("");

    let nextSortOrder =
      items.reduce((highest, item) => Math.max(highest, item.sortOrder), 0) + 1;
    let savedCount = 0;
    let failedCount = 0;

    for (const pendingRow of pendingRows) {
      setBulkRows((current) =>
        current.map((row) =>
          row.id === pendingRow.id
            ? { ...row, status: "uploading", error: "" }
            : row,
        ),
      );

      try {
        const uploaded =
          pendingRow.image ??
          (await uploadBloomCatalogueImage(pendingRow.file));

        if (!pendingRow.image) {
          setBulkRows((current) =>
            current.map((row) =>
              row.id === pendingRow.id ? { ...row, image: uploaded } : row,
            ),
          );
        }

        const response = await fetch("/api/admin/bloom-catalogue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: pendingRow.title.trim(),
            description: "",
            flowers: [],
            colors: [],
            occasions: [],
            categories: [],
            tags: [],
            image: uploaded,
            isDesignerChoice: pendingRow.isDesignerChoice,
            isActive: false,
            sortOrder: nextSortOrder,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Unable to save catalogue item.");
        }

        const saved = normalizeItem(data.item as Record<string, unknown>);
        setItems((current) =>
          [...current, saved].sort(
            (a, b) =>
              a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
          ),
        );
        setBulkRows((current) =>
          current.map((row) =>
            row.id === pendingRow.id
              ? { ...row, status: "saved", error: "" }
              : row,
          ),
        );

        nextSortOrder += 1;
        savedCount += 1;
      } catch (bulkError) {
        const message =
          bulkError instanceof Error
            ? bulkError.message
            : "Unable to import this catalogue image.";

        setBulkRows((current) =>
          current.map((row) =>
            row.id === pendingRow.id
              ? { ...row, status: "error", error: message }
              : row,
          ),
        );
        failedCount += 1;
      }
    }

    setBulkImporting(false);
    setBulkMessage(
      failedCount > 0
        ? `${savedCount} image${savedCount === 1 ? "" : "s"} imported. ${failedCount} failed and can be retried.`
        : `${savedCount} image${savedCount === 1 ? "" : "s"} imported as inactive catalogue entries. Add metadata, review each entry, then activate when ready.`,
    );
  }

  async function handleImage(file: File) {
    try {
      setUploading(true);
      setError("");
      setSuccess("");
      const uploaded = await uploadBloomCatalogueImage(file);
      setImage(uploaded);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload catalogue image.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!image) {
      setError("Choose a catalogue image before saving.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        editingId
          ? `/api/admin/bloom-catalogue/${editingId}`
          : "/api/admin/bloom-catalogue",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            flowers: csv(form.flowers),
            colors: csv(form.colors),
            occasions: csv(form.occasions),
            categories: csv(form.categories),
            tags: csv(form.tags),
            image,
            isDesignerChoice: form.isDesignerChoice,
            isActive: form.isActive,
            sortOrder: Number(form.sortOrder) || 0,
          }),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to save catalogue item.");
      }

      const saved = normalizeItem(data.item as Record<string, unknown>);
      setItems((current) => {
        const next = editingId
          ? current.map((item) => (item.id === editingId ? saved : item))
          : [...current, saved];
        return next.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
      });

      setSuccess(editingId ? "Catalogue item updated." : "Catalogue item added.");
      if (!editingId) {
        setForm(EMPTY_FORM);
        setImage(null);
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save catalogue item.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
          BloomWebsites
        </p>
        <h1 className="mt-2 text-3xl font-black text-white">Shared Image Catalogue</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Manage Bloom-owned arrangement examples florists can reuse in product listings. Originals are preserved while storefronts use optimized shared assets.
        </p>
      </div>

      <section className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
              Starter catalogue import
            </p>
            <h2 className="mt-2 text-xl font-black text-white">Upload a batch of arrangement images</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Select up to {MAX_BULK_IMPORT_FILES} JPG, PNG, or WebP files. Bloom preserves each original, creates the optimized storefront asset, and creates the catalogue entries as inactive so you can review metadata before florists see them.
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Titles are derived only from filenames. Flowers, colors, occasions, recipes, prices, stem counts, and sizes are never guessed during bulk import. Uploads use the S3/CloudFront environment currently configured for this running app.
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white hover:bg-violet-500">
            <Upload size={17} />
            Select images
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              disabled={bulkImporting}
              className="hidden"
              onChange={(event) => {
                handleBulkFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>

        {bulkRows.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
            <div className="border-b border-white/10 px-4 py-3 text-sm font-bold text-slate-300">
              {bulkRows.length} selected image{bulkRows.length === 1 ? "" : "s"}
            </div>
            <div className="max-h-[520px] divide-y divide-white/10 overflow-y-auto">
              {bulkRows.map((row, index) => (
                <div key={row.id} className="grid gap-3 px-4 py-4 md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white text-slate-400">
                    <ImageIcon size={24} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs text-slate-500">
                      {index + 1}. {row.file.name}
                    </p>
                    <input
                      value={row.title}
                      disabled={
                        row.status !== "ready" && row.status !== "error"
                      }
                      maxLength={160}
                      onChange={(event) =>
                        updateBulkRow(row.id, { title: event.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none focus:border-violet-400 disabled:opacity-60"
                      aria-label={`Catalogue title for ${row.file.name}`}
                    />
                    <label className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-slate-400">
                      <input
                        type="checkbox"
                        checked={row.isDesignerChoice}
                        disabled={
                          row.status !== "ready" && row.status !== "error"
                        }
                        onChange={(event) =>
                          updateBulkRow(row.id, {
                            isDesignerChoice: event.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                      />
                      Designer’s Choice example
                    </label>
                    {row.error && (
                      <p className="mt-2 text-xs font-semibold text-red-300">
                        {row.error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 md:justify-end">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        row.status === "saved"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : row.status === "error"
                            ? "bg-red-500/15 text-red-300"
                            : row.status === "uploading"
                              ? "bg-violet-500/15 text-violet-300"
                              : "bg-white/5 text-slate-400"
                      }`}
                    >
                      {row.status === "saved"
                        ? "Imported"
                        : row.status === "error"
                          ? "Failed"
                          : row.status === "uploading"
                            ? "Uploading"
                            : "Ready"}
                    </span>
                    {row.status === "uploading" ? (
                      <Loader2 size={18} className="animate-spin text-violet-300" />
                    ) : row.status === "ready" || row.status === "error" ? (
                      <button
                        type="button"
                        onClick={() => removeBulkRow(row.id)}
                        disabled={bulkImporting}
                        className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white disabled:opacity-50"
                        aria-label={`Remove ${row.file.name}`}
                      >
                        <X size={17} />
                      </button>
                    ) : (
                      <Check size={18} className="text-emerald-300" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">
                Import runs sequentially to avoid flooding the browser or storage service. Failed entries stay available for retry.
              </p>
              <button
                type="button"
                onClick={() => void handleBulkImport()}
                disabled={
                  bulkImporting ||
                  !bulkRows.some(
                    (row) => row.status === "ready" || row.status === "error",
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bulkImporting ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Upload size={17} />
                )}
                {bulkImporting ? "Importing..." : "Import selected as inactive"}
              </button>
            </div>
          </div>
        )}

        {bulkMessage && (
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-300">
            {bulkMessage}
          </div>
        )}
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">
              {editingId ? "Edit catalogue item" : "Add catalogue item"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Metadata helps florists search without changing their product copy or pricing.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/5"
            >
              <X size={16} /> New item
            </button>
          )}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[280px_1fr]">
          <div>
            <label className="block overflow-hidden rounded-2xl border-2 border-dashed border-white/15 bg-slate-900/60 p-3 text-center hover:border-violet-400/50">
              {image?.optimizedUrl ? (
                <img
                  src={image.optimizedUrl}
                  alt="Catalogue preview"
                  className="aspect-square w-full rounded-xl bg-white object-contain"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-xl bg-slate-900 text-slate-500">
                  {uploading ? <Loader2 className="animate-spin" size={34} /> : <ImageIcon size={40} />}
                </div>
              )}
              <div className="mt-3 inline-flex items-center gap-2 text-sm font-black text-violet-300">
                <Upload size={16} />
                {uploading ? "Preparing images..." : image ? "Replace image" : "Choose image"}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading || saving}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleImage(file);
                  event.target.value = "";
                }}
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              JPG, PNG, or WebP up to 8 MB. Bloom keeps the original and creates a max-1600px WebP for storefront use.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Title"
              value={form.title}
              onChange={(value) => setForm((current) => ({ ...current, title: value }))}
              placeholder="Soft Pink Garden"
              required
            />
            <Field
              label="Sort order"
              value={form.sortOrder}
              onChange={(value) => setForm((current) => ({ ...current, sortOrder: value }))}
              type="number"
              placeholder="0"
            />

            <div className="sm:col-span-2">
              <label className="text-sm font-bold text-slate-200">Description</label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                maxLength={1200}
                rows={3}
                placeholder="Short visual description for catalogue search and administration."
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400"
              />
            </div>

            {([
              ["flowers", "Flowers", "roses, lilies, hydrangea"],
              ["colors", "Colors", "pink, white, green"],
              ["occasions", "Occasions", "birthday, anniversary"],
              ["categories", "Categories", "everyday, romance"],
              ["tags", "Tags", "garden style, clear vase, soft"],
            ] as const).map(([key, label, placeholder]) => (
              <div key={key}>
                <Field
                  label={`${label} (comma separated)`}
                  value={form[key]}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, [key]: value }))
                  }
                  placeholder={placeholder}
                />
              </div>
            ))}

            <div className="flex flex-wrap gap-5 sm:col-span-2">
              <Checkbox
                label="Designer’s Choice example"
                checked={form.isDesignerChoice}
                onChange={(checked) =>
                  setForm((current) => ({ ...current, isDesignerChoice: checked }))
                }
              />
              <Checkbox
                label="Active for florist selection"
                checked={form.isActive}
                onChange={(checked) =>
                  setForm((current) => ({ ...current, isActive: checked }))
                }
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200">
            {success}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={17} className="animate-spin" /> : editingId ? <Check size={17} /> : <Plus size={17} />}
            {saving ? "Saving..." : editingId ? "Save changes" : "Add to catalogue"}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Catalogue entries</h2>
            <p className="mt-1 text-sm text-slate-400">
              Inactive entries remain valid for products already using their shared image URL.
            </p>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, flower, color, occasion..."
              className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-violet-400"
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
            No catalogue entries match this search.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
                <div className="aspect-square bg-white p-2">
                  <img src={item.image.optimizedUrl} alt={item.title} className="h-full w-full object-contain" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-black text-white">{item.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">Sort {item.sortOrder}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        item.isActive
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-400">
                    {item.description || "No description added."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {[...item.colors, ...item.flowers, ...item.occasions].slice(0, 5).map((tag) => (
                      <span key={tag} className="rounded-full bg-white/5 px-2 py-1 text-xs text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => editItem(item)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-slate-200 hover:bg-white/5"
                  >
                    <Pencil size={15} /> Edit entry
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "number";
}) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-200">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400"
      />
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-3 text-sm font-bold text-slate-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-600 bg-slate-950"
      />
      {label}
    </label>
  );
}
