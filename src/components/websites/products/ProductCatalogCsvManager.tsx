"use client";

import {
  AlertTriangle,
  Check,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  CATALOG_IMPORT_FIELDS,
  type CatalogCsvMapping,
  type CatalogCsvRow,
  autoMapCatalogHeaders,
  normalizeCatalogImportRow,
  parseCsvText,
} from "@/lib/bloom-websites/catalogCsv";

type ProductCatalogCsvManagerProps = {
  siteName: string;
};

type ImportResult = {
  importedCount: number;
  skippedDuplicateCount: number;
  skippedInvalidCount: number;
  totalRows: number;
  pendingImageCount: number;
};

type ImageMigrationStatus = {
  pendingImageCount: number;
  failedImageCount: number;
  pendingProductCount: number;
  failedProductCount: number;
  failedExamples: Array<{
    productName: string;
    error: string;
  }>;
};

function parseImageMigrationStatus(data: any): ImageMigrationStatus {
  return {
    pendingImageCount: Number(data?.pendingImageCount || 0),
    failedImageCount: Number(data?.failedImageCount || 0),
    pendingProductCount: Number(data?.pendingProductCount || 0),
    failedProductCount: Number(data?.failedProductCount || 0),
    failedExamples: Array.isArray(data?.failedExamples)
      ? data.failedExamples
          .filter(
            (entry: unknown): entry is { productName?: unknown; error?: unknown } =>
              Boolean(entry && typeof entry === "object"),
          )
          .slice(0, 5)
          .map((entry: { productName?: unknown; error?: unknown }) => ({
            productName:
              typeof entry.productName === "string" && entry.productName.trim()
                ? entry.productName.trim()
                : "Product",
            error:
              typeof entry.error === "string" && entry.error.trim()
                ? entry.error.trim()
                : "Image could not be copied.",
          }))
      : [],
  };
}

export default function ProductCatalogCsvManager({
  siteName,
}: ProductCatalogCsvManagerProps) {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CatalogCsvRow[]>([]);
  const [mapping, setMapping] = useState<CatalogCsvMapping>({});
  const [parseError, setParseError] = useState("");
  const [skipInvalidRows, setSkipInvalidRows] = useState(false);
  const [skipExistingSkus, setSkipExistingSkus] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [migratingImages, setMigratingImages] = useState(false);
  const [imageMigrationError, setImageMigrationError] = useState("");
  const [imageMigrationStatus, setImageMigrationStatus] =
    useState<ImageMigrationStatus | null>(null);

  const loadImageMigrationStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/websites/products/import-images", {
        cache: "no-store",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) return null;

      const status = parseImageMigrationStatus(data);
      setImageMigrationStatus(status);
      return status;
    } catch {
      return null;
    }
  }, []);

  async function runImageMigration(retryFailed = false) {
    try {
      setMigratingImages(true);
      setImageMigrationError("");

      if (retryFailed) {
        const retryResponse = await fetch("/api/websites/products/import-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "retryFailed" }),
        });
        const retryData = await retryResponse.json().catch(() => null);

        if (!retryResponse.ok) {
          throw new Error(retryData?.error || "Unable to retry catalog images.");
        }

        setImageMigrationStatus(parseImageMigrationStatus(retryData));
      }

      let safetyCounter = 0;

      while (safetyCounter < 10000) {
        safetyCounter += 1;

        const response = await fetch("/api/websites/products/import-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "process" }),
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || "Unable to copy catalog images into Bloom.");
        }

        const status = parseImageMigrationStatus(data);
        setImageMigrationStatus(status);

        if (status.pendingImageCount <= 0) break;

        if (Number(data?.processedImageCount || 0) <= 0) {
          throw new Error("Image migration paused before all pending images were processed.");
        }
      }

      const finalStatus = await loadImageMigrationStatus();
      if (finalStatus?.failedImageCount) {
        setImageMigrationError(
          `${finalStatus.failedImageCount} image${finalStatus.failedImageCount === 1 ? "" : "s"} could not be copied. You can retry the failed images without re-importing the catalog.`,
        );
      }
    } catch (error) {
      setImageMigrationError(
        error instanceof Error
          ? error.message
          : "Image migration paused. Your products were imported and the image copy can be resumed.",
      );
      await loadImageMigrationStatus();
    } finally {
      setMigratingImages(false);
    }
  }

  useEffect(() => {
    void loadImageMigrationStatus();
  }, [loadImageMigrationStatus]);

  const validations = useMemo(
    () =>
      rows.map((row, index) =>
        normalizeCatalogImportRow(row, mapping, index + 2),
      ),
    [rows, mapping],
  );

  const validCount = validations.filter((validation) => validation.valid).length;
  const invalidCount = validations.length - validCount;
  const requiredMapped = Boolean(mapping.name && mapping.standardPrice);

  const previewRows = useMemo(
    () =>
      rows.slice(0, 8).map((row, index) => ({
        rowNumber: index + 2,
        validation: normalizeCatalogImportRow(row, mapping, index + 2),
        raw: row,
      })),
    [rows, mapping],
  );

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setResult(null);
    setImportError("");
    setParseError("");

    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setParseError("Choose a CSV smaller than 8 MB.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsvText(text);

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        throw new Error("The CSV must contain a header row and at least one product row.");
      }

      if (parsed.rows.length > 2500) {
        throw new Error("Import up to 2,500 products at a time.");
      }

      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(autoMapCatalogHeaders(parsed.headers));
    } catch (error) {
      setFileName("");
      setHeaders([]);
      setRows([]);
      setMapping({});
      setParseError(
        error instanceof Error ? error.message : "Unable to read this CSV.",
      );
    }
  }

  function resetImport() {
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setParseError("");
    setImportError("");
    setImageMigrationError("");
    setResult(null);
    setSkipInvalidRows(false);
  }

  async function importProducts() {
    try {
      setImporting(true);
      setImportError("");
      setResult(null);

      const response = await fetch("/api/websites/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows,
          mapping,
          skipInvalidRows,
          skipExistingSkus,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Unable to import the catalog.");
      }

      const nextResult: ImportResult = {
        importedCount: Number(data.importedCount || 0),
        skippedDuplicateCount: Number(data.skippedDuplicateCount || 0),
        skippedInvalidCount: Number(data.skippedInvalidCount || 0),
        totalRows: Number(data.totalRows || rows.length),
        pendingImageCount: Number(data.pendingImageCount || 0),
      };
      setResult(nextResult);
      setImporting(false);

      if (nextResult.pendingImageCount > 0) {
        await runImageMigration();
      } else {
        await loadImageMigrationStatus();
      }
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Unable to import the catalog.",
      );
    } finally {
      setImporting(false);
    }
  }

  const coreFields = CATALOG_IMPORT_FIELDS.filter((field) => field.group === "core");
  const advancedFields = CATALOG_IMPORT_FIELDS.filter(
    (field) => field.group === "advanced",
  );

  function renderMappingFields(fields: typeof CATALOG_IMPORT_FIELDS) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const mappedHeader = mapping[field.key] || "";
          const usedByAnotherField = new Set(
            Object.entries(mapping)
              .filter(([key]) => key !== field.key)
              .map(([, header]) => header)
              .filter(Boolean),
          );

          return (
            <label
              key={field.key}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <span className="flex items-center gap-2 text-sm font-black text-gray-950">
                {field.label}
                {field.required && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-purple-700">
                    Required
                  </span>
                )}
              </span>
              <span className="mt-1 block text-xs leading-5 text-gray-500">
                {field.description}
              </span>

              <select
                value={mappedHeader}
                onChange={(event) =>
                  setMapping((current) => ({
                    ...current,
                    [field.key]: event.target.value || undefined,
                  }))
                }
                className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold text-gray-800 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              >
                <option value="">Do not import</option>
                {headers.map((header) => (
                  <option
                    key={header}
                    value={header}
                    disabled={usedByAnotherField.has(header) && mappedHeader !== header}
                  >
                    {header}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-purple-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
              <Upload size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-950">Import products</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Upload a CSV from another website provider. Bloom will detect common
                columns, then let you confirm the mapping before anything is created.
              </p>
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50 px-5 py-8 text-center transition hover:border-purple-400 hover:bg-purple-100/60">
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleFile}
            />
            <span>
              <FileSpreadsheet className="mx-auto text-purple-700" size={28} />
              <span className="mt-3 block text-sm font-black text-gray-950">
                Choose a CSV file
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                Up to 2,500 products or 8 MB per import
              </span>
            </span>
          </label>

          {fileName && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span className="min-w-0 truncate font-bold">{fileName}</span>
              <button
                type="button"
                onClick={resetImport}
                className="inline-flex shrink-0 items-center gap-1 font-black"
              >
                <RefreshCcw size={14} /> Reset
              </button>
            </div>
          )}

          {parseError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {parseError}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Download size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-950">Take your data with you</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Export your full Bloom product catalog at any time. There is no support
                ticket, lock-in request, or manual data-release process.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              href="/api/websites/products/export"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-3 text-sm font-black text-white transition hover:bg-gray-800"
            >
              <Download size={17} />
              Export {siteName} CSV
            </a>
            <a
              href="/api/websites/products/export?template=1"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50"
            >
              <FileSpreadsheet size={17} />
              Download Template
            </a>
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            Bloom exports standard product data plus Bloom-specific tiers, recipes,
            inventory, SEO, and availability fields so your catalog remains portable.
          </p>
        </div>
      </section>

      {(migratingImages ||
        (imageMigrationStatus &&
          (imageMigrationStatus.pendingImageCount > 0 ||
            imageMigrationStatus.failedImageCount > 0))) && (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                {migratingImages ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : imageMigrationStatus?.failedImageCount ? (
                  <AlertTriangle size={18} />
                ) : (
                  <Upload size={18} />
                )}
              </div>
              <div>
                <h2 className="font-black text-blue-950">Catalog image migration</h2>
                <p className="mt-1 text-sm leading-6 text-blue-900">
                  {migratingImages
                    ? `Copying images into Bloom storage${imageMigrationStatus?.pendingImageCount ? ` · ${imageMigrationStatus.pendingImageCount} remaining` : ""}. You can leave this page if needed and resume later.`
                    : imageMigrationStatus?.pendingImageCount
                      ? `${imageMigrationStatus.pendingImageCount} image${imageMigrationStatus.pendingImageCount === 1 ? " is" : "s are"} waiting to be copied into Bloom storage.`
                      : `${imageMigrationStatus?.failedImageCount || 0} image${imageMigrationStatus?.failedImageCount === 1 ? " could" : "s could"} not be copied from the old provider.`}
                </p>
                {imageMigrationError && (
                  <p className="mt-1 text-xs font-bold leading-5 text-amber-800">
                    {imageMigrationError}
                  </p>
                )}
                {(imageMigrationStatus?.failedExamples.length || 0) > 0 &&
                  !migratingImages && (
                    <div className="mt-2 space-y-1 text-xs leading-5 text-amber-900">
                      {imageMigrationStatus!.failedExamples.slice(0, 3).map((failure, index) => (
                        <p key={`${failure.productName}-${index}`}>
                          <strong>{failure.productName}:</strong> {failure.error}
                        </p>
                      ))}
                      {(imageMigrationStatus?.failedImageCount || 0) > 3 && (
                        <p className="font-bold">
                          Additional failed images are not shown here.
                        </p>
                      )}
                    </div>
                  )}
              </div>
            </div>

            {!migratingImages && (
              <div className="flex shrink-0 flex-wrap gap-2">
                {(imageMigrationStatus?.pendingImageCount || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => void runImageMigration(false)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-800"
                  >
                    <RefreshCcw size={15} /> Resume copy
                  </button>
                )}
                {(imageMigrationStatus?.failedImageCount || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => void runImageMigration(true)}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-black text-amber-800 transition hover:bg-amber-50"
                  >
                    <RefreshCcw size={15} /> Retry failed
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <>
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">
                  Step 2
                </p>
                <h2 className="mt-1 text-xl font-black text-gray-950">
                  Match your CSV columns
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  We auto-mapped what we recognized. Change anything that does not look right.
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-600">
                {rows.length.toLocaleString()} rows
              </span>
            </div>

            <div className="mt-6">{renderMappingFields(coreFields)}</div>

            <button
              type="button"
              onClick={() => setAdvancedOpen((current) => !current)}
              className="mt-5 text-sm font-black text-purple-700 hover:text-purple-900"
            >
              {advancedOpen ? "Hide advanced Bloom fields" : "Show advanced Bloom fields"}
            </button>

            {advancedOpen && <div className="mt-4">{renderMappingFields(advancedFields)}</div>}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">
              Step 3
            </p>
            <h2 className="mt-1 text-xl font-black text-gray-950">Review before import</h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-2xl font-black text-gray-950">{rows.length}</p>
                <p className="text-xs font-bold text-gray-500">CSV rows</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-2xl font-black text-emerald-800">{validCount}</p>
                <p className="text-xs font-bold text-emerald-700">Ready to import</p>
              </div>
              <div className={`rounded-2xl p-4 ${invalidCount ? "bg-amber-50" : "bg-gray-50"}`}>
                <p className={`text-2xl font-black ${invalidCount ? "text-amber-800" : "text-gray-950"}`}>
                  {invalidCount}
                </p>
                <p className={`text-xs font-bold ${invalidCount ? "text-amber-700" : "text-gray-500"}`}>
                  Need attention
                </p>
              </div>
            </div>

            {!requiredMapped && (
              <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                <p className="font-bold">
                  Map both Product Name and Standard Price before importing.
                </p>
              </div>
            )}

            <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-black uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Row</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewRows.map(({ rowNumber, validation, raw }) => {
                    const normalized = validation.normalized;
                    return (
                      <tr key={rowNumber} className="align-top">
                        <td className="px-4 py-3 font-bold text-gray-500">{rowNumber}</td>
                        <td className="px-4 py-3 font-bold text-gray-950">
                          {normalized?.name || (mapping.name ? raw[mapping.name] : "") || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {normalized?.sku || (mapping.sku ? raw[mapping.sku] : "") || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {normalized ? `$${normalized.standardPrice.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {validation.valid ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">
                              <Check size={13} /> Ready
                            </span>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                                <AlertTriangle size={13} /> Fix row
                              </span>
                              <p className="mt-1 max-w-sm text-xs leading-5 text-amber-800">
                                {validation.errors.join(" ")}
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rows.length > previewRows.length && (
              <p className="mt-2 text-xs text-gray-500">
                Previewing the first {previewRows.length} rows. All {rows.length} rows are validated before import.
              </p>
            )}

            <div className="mt-5 space-y-3 rounded-2xl bg-gray-50 p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={skipExistingSkus}
                  onChange={(event) => setSkipExistingSkus(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-700"
                />
                <span>
                  <span className="block text-sm font-black text-gray-900">
                    Skip products whose SKU already exists in Bloom
                  </span>
                  <span className="block text-xs leading-5 text-gray-500">
                    Recommended. This prevents an accidental duplicate when a migration CSV is uploaded twice.
                  </span>
                </span>
              </label>

              {invalidCount > 0 && (
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={skipInvalidRows}
                    onChange={(event) => setSkipInvalidRows(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-700"
                  />
                  <span>
                    <span className="block text-sm font-black text-gray-900">
                      Import the valid rows and skip the {invalidCount} invalid {invalidCount === 1 ? "row" : "rows"}
                    </span>
                    <span className="block text-xs leading-5 text-gray-500">
                      Leave this off if you want to correct the source CSV and import everything together.
                    </span>
                  </span>
                </label>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              <strong>Images:</strong> public JPG, PNG, and WebP URLs are copied into your Bloom storage after the products are created. Bloom validates the source, file type, size, redirects, and destination before saving it, so your catalog does not depend on the old website provider continuing to host the image.
            </div>

            {importError && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                {importError}
              </div>
            )}

            {result && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-emerald-800">
                    <Check size={18} />
                  </div>
                  <div>
                    <p className="font-black">Catalog import complete.</p>
                    <p className="mt-1 text-sm leading-6">
                      Imported {result.importedCount} {result.importedCount === 1 ? "product" : "products"}.
                      {result.skippedDuplicateCount > 0 && ` Skipped ${result.skippedDuplicateCount} duplicate SKU ${result.skippedDuplicateCount === 1 ? "row" : "rows"}.`}
                      {result.skippedInvalidCount > 0 && ` Skipped ${result.skippedInvalidCount} invalid ${result.skippedInvalidCount === 1 ? "row" : "rows"}.`}
                      {result.pendingImageCount > 0 &&
                        !migratingImages &&
                        (imageMigrationStatus?.pendingImageCount || 0) === 0 &&
                        (imageMigrationStatus?.failedImageCount || 0) === 0 &&
                        " Product images were copied into Bloom storage."}
                    </p>
                    <Link
                      href="/dashboard/websites/products"
                      className="mt-3 inline-flex font-black text-emerald-800 underline underline-offset-4"
                    >
                      View imported products
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard/websites/products"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={importProducts}
                disabled={
                  importing ||
                  migratingImages ||
                  !requiredMapped ||
                  validCount === 0 ||
                  (invalidCount > 0 && !skipInvalidRows)
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-purple-700 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 size={17} className="animate-spin" /> Importing…
                  </>
                ) : migratingImages ? (
                  <>
                    <Loader2 size={17} className="animate-spin" /> Copying Images…
                  </>
                ) : (
                  <>
                    <Upload size={17} /> Import {skipInvalidRows ? validCount : rows.length} Products
                  </>
                )}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
