"use client";

import { ArrowLeft, Check, Gift, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { uploadWebsiteImage } from "@/lib/bloom-websites/uploadWebsiteImage";

const ADDON_CATEGORIES = [
  "Balloons",
  "Plush",
  "Chocolates",
  "Vases",
  "Gifts",
  "Funeral",
  "Extras",
  "Other",
] as const;

const PRODUCT_CATEGORIES = [
  "Flowers",
  "Plants",
  "Gift Baskets",
  "Sympathy",
  "Funeral",
  "Gifts",
  "Seasonal",
  "Other",
] as const;

export type AddonFormInitialData = {
  id: string;

  sku: string;
  name: string;
  description: string;
  category: string;

  imageUrl: string;
  galleryImages: string[];
  imageAltText: string;

  price: number;
  taxable: boolean;
  taxRatePercent?: number | null;

  isUniversal: boolean;
  eligibleProductCategories: string[];
  maxQuantity: number;

  inventory: {
    trackInventory: boolean;
    quantity: number;
  };

  availability: {
    type: "always" | "date_range";
    startDate: string;
    endDate: string;
  };

  isActive: boolean;
  soldOut: boolean;
};

type AddonFormProps = {
  initialData?: AddonFormInitialData;
};

export default function AddonForm({ initialData }: AddonFormProps) {
  const router = useRouter();

  const isEditing = Boolean(initialData);

  // ===============================
  // DETAILS
  // ===============================

  const [sku, setSku] = useState(initialData?.sku ?? "");

  const [name, setName] = useState(initialData?.name ?? "");

  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );

  const [category, setCategory] = useState(initialData?.category ?? "Extras");

  // ===============================
  // MEDIA
  // ===============================

  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? "");

  const [galleryImages, setGalleryImages] = useState<string[]>(
    initialData?.galleryImages ?? [],
  );

  const [imageAltText, setImageAltText] = useState(
    initialData?.imageAltText ?? "",
  );

  const productImages = [...(imageUrl ? [imageUrl] : []), ...galleryImages];

  // ===============================
  // PRICING
  // ===============================

  const [price, setPrice] = useState(
    initialData ? initialData.price.toString() : "",
  );

  const [taxable, setTaxable] = useState(initialData?.taxable ?? true);

  const [taxRatePercent, setTaxRatePercent] = useState(
    initialData?.taxRatePercent == null
      ? ""
      : String(initialData.taxRatePercent),
  );

  // ===============================
  // ELIGIBILITY
  // ===============================

  const [isUniversal, setIsUniversal] = useState(
    initialData?.isUniversal ?? true,
  );

  const [eligibleProductCategories, setEligibleProductCategories] = useState<
    string[]
  >(initialData?.eligibleProductCategories ?? []);

  const [maxQuantity, setMaxQuantity] = useState(
    initialData ? initialData.maxQuantity.toString() : "1",
  );

  // ===============================
  // INVENTORY
  // ===============================

  const [trackInventory, setTrackInventory] = useState(
    initialData?.inventory?.trackInventory ?? false,
  );

  const [inventoryQuantity, setInventoryQuantity] = useState(
    initialData?.inventory?.quantity?.toString() ?? "0",
  );

  // ===============================
  // AVAILABILITY
  // ===============================

  const [availabilityType, setAvailabilityType] = useState<
    "always" | "date_range"
  >(initialData?.availability?.type ?? "always");

  const [availabilityStartDate, setAvailabilityStartDate] = useState(
    initialData?.availability?.startDate ?? "",
  );

  const [availabilityEndDate, setAvailabilityEndDate] = useState(
    initialData?.availability?.endDate ?? "",
  );

  // ===============================
  // STATUS
  // ===============================

  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const [soldOut, setSoldOut] = useState(initialData?.soldOut ?? false);

  // ===============================
  // FORM STATE
  // ===============================

  const [uploadingImage, setUploadingImage] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");

  // ===============================
  // IMAGE UPLOAD
  // ===============================

  async function handleImagesUpload(files: FileList) {
    if (uploadingImage) {
      return;
    }

    const remainingSlots = 8 - productImages.length;

    if (remainingSlots <= 0) {
      setError("You can add up to 8 add-on photos.");

      return;
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots);

    try {
      setUploadingImage(true);
      setError("");

      const uploadedImages: string[] = [];

      for (const file of selectedFiles) {
        try {
          const uploadedUrl = await uploadWebsiteImage({
            file,
            assetType: "addon",
          });

          uploadedImages.push(uploadedUrl);
        } catch (error) {
          console.error("Add-on photo upload failed:", error);

          setError(
            error instanceof Error
              ? error.message
              : "Unable to upload add-on photo.",
          );

          break;
        }
      }

      if (!uploadedImages.length) {
        return;
      }

      /*
       * If there is no primary image yet,
       * automatically make the first uploaded
       * image the primary image.
       */
      if (!imageUrl) {
        const [firstImage, ...remainingImages] = uploadedImages;

        setImageUrl(firstImage);

        setGalleryImages((current) => [...current, ...remainingImages]);

        return;
      }

      setGalleryImages((current) => [...current, ...uploadedImages]);
    } finally {
      setUploadingImage(false);
    }
  }

  function setPrimaryImage(selectedImage: string) {
    if (selectedImage === imageUrl) {
      return;
    }

    const previousPrimary = imageUrl;

    setImageUrl(selectedImage);

    setGalleryImages((current) => [
      ...(previousPrimary ? [previousPrimary] : []),

      ...current.filter((image) => image !== selectedImage),
    ]);
  }

  function removeImage(selectedImage: string) {
    /*
     * If the primary image is removed,
     * automatically promote the first
     * gallery image.
     */
    if (selectedImage === imageUrl) {
      const [nextPrimary, ...remainingGallery] = galleryImages;

      setImageUrl(nextPrimary || "");

      setGalleryImages(remainingGallery);

      return;
    }

    setGalleryImages((current) =>
      current.filter((image) => image !== selectedImage),
    );
  }

  // ===============================
  // SUBMIT
  // ===============================

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const endpoint =
        isEditing && initialData
          ? `/api/websites/addons/${initialData.id}`
          : "/api/websites/addons";

      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          sku,
          name,
          description,
          category,

          imageUrl,
          galleryImages,
          imageAltText,

          price,
          taxable,
          taxRatePercent: taxable ? taxRatePercent : "",

          isUniversal,

          eligibleProductCategories: isUniversal
            ? eligibleProductCategories
            : [],

          maxQuantity,

          trackInventory,
          inventoryQuantity,

          availabilityType,
          availabilityStartDate,
          availabilityEndDate,

          isActive,
          soldOut,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (isEditing
              ? "Unable to update add-on."
              : "Unable to create add-on."),
        );
      }

      router.push("/dashboard/websites/products");

      router.refresh();
    } catch (error) {
      console.error(
        isEditing ? "Failed to update add-on:" : "Failed to create add-on:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : isEditing
            ? "Unable to update add-on."
            : "Unable to create add-on.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/websites/products"
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-gray-900"
      >
        <ArrowLeft size={17} />
        Back to Products & Add-ons
      </Link>

      <div className="mt-6">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700">
          BloomWebsites
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
          {isEditing ? "Edit Add-on" : "Add Add-on"}
        </h1>

        <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
          {isEditing
            ? "Update this add-on's details, pricing, availability, photos, and selling rules."
            : "Create optional extras customers can add to eligible flower orders."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* DETAILS */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <Gift size={22} />
            </div>

            <div>
              <h2 className="text-lg font-black text-gray-950">
                Add-on Details
              </h2>

              <p className="text-sm text-gray-500">
                Describe the extra item a customer can add to an order.
              </p>
            </div>
          </div>

          <div className="mt-7 space-y-6">
            {/* PHOTOS */}
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    Add-on Photos
                  </p>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Photos are recommended for physical items such as balloons,
                    plush, chocolates, or vases, but are not required.
                  </p>
                </div>

                <span className="text-xs font-bold text-gray-400">
                  {productImages.length}/8
                </span>
              </div>

              {productImages.length > 0 && (
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {productImages.map((productImage, index) => {
                    const isPrimary = productImage === imageUrl;

                    return (
                      <div
                        key={productImage}
                        className={`overflow-hidden rounded-2xl border bg-white ${
                          isPrimary
                            ? "border-green-400 ring-2 ring-green-100"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="relative aspect-square bg-white p-2">
                          <img
                            src={productImage}
                            alt={`Add-on photo ${index + 1}`}
                            className="h-full w-full object-contain"
                          />

                          {isPrimary && (
                            <span className="absolute left-2 top-2 rounded-full bg-green-700 px-3 py-1 text-xs font-black text-white">
                              Primary
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 border-t border-gray-100 p-3">
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() => setPrimaryImage(productImage)}
                              className="rounded-lg bg-green-50 px-3 py-2 text-xs font-black text-green-700 hover:bg-green-100"
                            >
                              Set as Primary
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => removeImage(productImage)}
                            className="rounded-lg px-3 py-2 text-xs font-bold text-gray-500 hover:bg-red-50 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {productImages.length < 8 && (
                <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center transition hover:border-green-300 hover:bg-green-50">
                  {uploadingImage ? (
                    <Loader2
                      size={30}
                      className="animate-spin text-green-700"
                    />
                  ) : (
                    <Upload size={30} className="text-green-700" />
                  )}

                  <p className="mt-3 font-black text-gray-950">
                    {uploadingImage
                      ? "Uploading photos..."
                      : productImages.length
                        ? "Add More Photos"
                        : "Add Photos"}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    JPG, PNG, or WebP · Maximum 8 MB each
                  </p>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={uploadingImage}
                    className="hidden"
                    onChange={(event) => {
                      const files = event.target.files;

                      if (files?.length) {
                        void handleImagesUpload(files);
                      }

                      event.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            {/* NAME / SKU */}
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="addonName"
                  className="text-sm font-bold text-gray-800"
                >
                  Add-on Name
                </label>

                <input
                  id="addonName"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={160}
                  required
                  placeholder="Happy Birthday Balloon"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
                />

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  This is the name customers see while customizing their order.
                </p>
              </div>

              <div>
                <label
                  htmlFor="addonSku"
                  className="text-sm font-bold text-gray-800"
                >
                  SKU
                </label>

                <input
                  id="addonSku"
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  maxLength={100}
                  placeholder="BAL-HBD-01"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
                />

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Optional internal item code for POS or inventory matching.
                </p>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label
                htmlFor="addonDescription"
                className="text-sm font-bold text-gray-800"
              >
                Description
              </label>

              <textarea
                id="addonDescription"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="A festive Happy Birthday mylar balloon that can be added to any eligible floral order."
                className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3"
              />

              <div className="mt-2 flex justify-between gap-4 text-xs leading-5 text-gray-500">
                <span>
                  Explain what the customer receives and any important details
                  about the item.
                </span>

                <span className="shrink-0 text-gray-400">
                  {description.length}
                  /1000
                </span>
              </div>
            </div>

            {/* CATEGORY */}
            <div>
              <label
                htmlFor="addonCategory"
                className="text-sm font-bold text-gray-800"
              >
                Add-on Category
              </label>

              <select
                id="addonCategory"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
              >
                {ADDON_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Categories help organize extras in your dashboard and can later
                help group options on the storefront.
              </p>
            </div>

            {/* ALT TEXT */}
            <div>
              <label
                htmlFor="addonAltText"
                className="text-sm font-bold text-gray-800"
              >
                Image Description
              </label>

              <input
                id="addonAltText"
                value={imageAltText}
                onChange={(event) => setImageAltText(event.target.value)}
                maxLength={250}
                placeholder="Happy Birthday mylar balloon"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
              />

              <p className="mt-2 text-xs leading-5 text-gray-500">
                If you add a photo, briefly describe what is visible for
                accessibility and image search.
              </p>
            </div>
          </div>
        </section>

        {/* PRICE */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-black text-gray-950">Pricing</h2>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            Set the amount added to the customer&apos;s order when this extra is
            selected.
          </p>

          <div className="mt-6 max-w-sm">
            <label
              htmlFor="addonPrice"
              className="text-sm font-bold text-gray-800"
            >
              Price
            </label>

            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                $
              </span>

              <input
                id="addonPrice"
                type="number"
                min="0"
                step="0.01"
                required
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="6.99"
                className="w-full rounded-xl border border-gray-300 py-3 pl-8 pr-4"
              />
            </div>
          </div>

          <div className="mt-5">
            <ToggleRow
              checked={taxable}
              onChange={setTaxable}
              title="Taxable"
              description="Include this add-on when calculating applicable sales tax."
            />

            {taxable && (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <label className="text-sm font-black text-gray-900">
                  Add-on tax-rate override
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.001"
                  value={taxRatePercent}
                  onChange={(event) => setTaxRatePercent(event.target.value)}
                  placeholder="Use website default"
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
                />
              </div>
            )}
          </div>
        </section>

        {/* WHERE AVAILABLE */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-black text-gray-950">
            Where It&apos;s Available
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            Decide whether Bloom should offer this extra broadly or only with
            products you choose later.
          </p>

          <div className="mt-6">
            <ToggleRow
              checked={isUniversal}
              onChange={setIsUniversal}
              title="Universal add-on"
              description="Automatically make this add-on available across eligible product categories. Turn this off if you want to attach it only to specific products."
            />
          </div>

          {isUniversal && (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <p className="font-black text-gray-900">
                Eligible Product Categories
              </p>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Optional. Leave every category unchecked to allow this add-on
                with all product categories.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {PRODUCT_CATEGORIES.map((productCategory) => {
                  const checked =
                    eligibleProductCategories.includes(productCategory);

                  return (
                    <label
                      key={productCategory}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-3 text-sm font-bold ${
                        checked
                          ? "border-green-300 text-green-800"
                          : "border-gray-200 text-gray-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setEligibleProductCategories(
                            event.target.checked
                              ? [...eligibleProductCategories, productCategory]
                              : eligibleProductCategories.filter(
                                  (value) => value !== productCategory,
                                ),
                          )
                        }
                      />

                      {productCategory}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 max-w-sm">
            <label
              htmlFor="maxQuantity"
              className="text-sm font-bold text-gray-800"
            >
              Maximum Quantity Per Order
            </label>

            <input
              id="maxQuantity"
              type="number"
              min="1"
              step="1"
              required
              value={maxQuantity}
              onChange={(event) => setMaxQuantity(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
            />

            <p className="mt-2 text-xs leading-5 text-gray-500">
              Example: use 1 for a teddy bear or vase upgrade, or allow several
              balloons when appropriate.
            </p>
          </div>
        </section>

        {/* INVENTORY / AVAILABILITY */}
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-black text-gray-950">
            Inventory & Availability
          </h2>

          <div className="mt-6 space-y-4">
            <ToggleRow
              checked={trackInventory}
              onChange={setTrackInventory}
              title="Track inventory"
              description="Track a specific quantity for physical extras such as balloons, plush, chocolates, or vases."
            />

            <ToggleRow
              checked={soldOut}
              onChange={setSoldOut}
              title="Sold out"
              description="Temporarily prevent customers from selecting this add-on."
            />

            <ToggleRow
              checked={isActive}
              onChange={setIsActive}
              title="Active"
              description="Active add-ons can be offered to customers. Turn this off to keep the item in Bloom without selling it."
            />
          </div>

          {trackInventory && (
            <div className="mt-5 max-w-sm rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <label
                htmlFor="addonInventory"
                className="text-sm font-bold text-gray-800"
              >
                Quantity Available
              </label>

              <input
                id="addonInventory"
                type="number"
                min="0"
                step="1"
                required
                value={inventoryQuantity}
                onChange={(event) => setInventoryQuantity(event.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
              />
            </div>
          )}

          <div className="mt-7 border-t border-gray-100 pt-7">
            <p className="text-sm font-bold text-gray-800">Availability</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-2xl border p-4 ${
                  availabilityType === "always"
                    ? "border-green-300 bg-green-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="addonAvailability"
                  checked={availabilityType === "always"}
                  onChange={() => setAvailabilityType("always")}
                  className="mr-3"
                />

                <span className="font-bold">Always Available</span>
              </label>

              <label
                className={`cursor-pointer rounded-2xl border p-4 ${
                  availabilityType === "date_range"
                    ? "border-green-300 bg-green-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="addonAvailability"
                  checked={availabilityType === "date_range"}
                  onChange={() => setAvailabilityType("date_range")}
                  className="mr-3"
                />

                <span className="font-bold">Seasonal / Date Range</span>
              </label>
            </div>

            {availabilityType === "date_range" && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="addonStartDate"
                    className="text-sm font-bold text-gray-800"
                  >
                    Available From
                  </label>

                  <input
                    id="addonStartDate"
                    type="date"
                    required
                    value={availabilityStartDate}
                    onChange={(event) =>
                      setAvailabilityStartDate(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="addonEndDate"
                    className="text-sm font-bold text-gray-800"
                  >
                    Available Through
                  </label>

                  <input
                    id="addonEndDate"
                    type="date"
                    required
                    value={availabilityEndDate}
                    onChange={(event) =>
                      setAvailabilityEndDate(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 pb-10 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard/websites/products"
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-sm font-bold text-gray-700"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSaving || uploadingImage}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-6 py-3.5 text-sm font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />

                {isEditing ? "Saving Add-on..." : "Creating Add-on..."}
              </>
            ) : (
              <>
                <Check size={18} />

                {isEditing ? "Save Changes" : "Create Add-on"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

type ToggleRowProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description: string;
};

function ToggleRow({ checked, onChange, title, description }: ToggleRowProps) {
  return (
    <label className="flex cursor-pointer gap-4 rounded-2xl border border-gray-200 p-4 transition hover:bg-gray-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300"
      />

      <span>
        <span className="block font-bold text-gray-900">{title}</span>

        <span className="mt-1 block text-sm leading-6 text-gray-500">
          {description}
        </span>
      </span>
    </label>
  );
}
