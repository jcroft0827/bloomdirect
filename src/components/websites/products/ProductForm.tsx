"use client";

import {
  ArrowLeft,
  Check,
  CircleHelp,
  Loader2,
  Package2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import BloomCataloguePicker, {
  type BloomCatalogueSuggestedField,
  type BloomCatalogueSuggestedProduct,
} from "@/components/websites/products/BloomCataloguePicker";
import ProductRecipeEditor from "@/components/websites/products/ProductRecipeEditor";
import ProductFormQuickNavigation from "@/components/websites/products/ProductFormQuickNavigation";
import {
  cloneBloomWebsiteProductRecipe,
  type BloomWebsiteProductRecipe,
} from "@/lib/bloom-websites/productRecipes";
import { uploadWebsiteImage } from "@/lib/bloom-websites/uploadWebsiteImage";

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

const PRODUCT_OCCASIONS = [
  "Birthday",
  "Anniversary",
  "Love & Romance",
  "Get Well",
  "New Baby",
  "Congratulations",
  "Thank You",
  "Thinking of You",
  "Sympathy",
  "Funeral",
  "Just Because",
] as const;

export type ProductFormInitialData = {
  id: string;

  sku: string;
  name: string;
  shortDescription: string;
  description: string;

  category: string;
  occasions: string[];
  tags: string[];

  imageUrl: string;
  galleryImages: string[];

  pricingTiers: Array<{
    label:
      | "standard"
      | "deluxe"
      | "premium";
    price: number;
    enabled: boolean;
    imageUrl: string;
    recipe: BloomWebsiteProductRecipe;
  }>;

  allowsSubstitutions: boolean;
  arrangementContainerNote: {
    mode: "default" | "custom" | "none";
    text: string;
  };
  localOnly: boolean;
  taxable: boolean;
  taxRatePercent?: number | null;

  inventory: {
    trackInventory: boolean;
    quantity: number;
  };

  availability: {
    type: "always" | "date_range";
    startDate: string;
    endDate: string;
  };

  availableAddons: string[];

  isFeatured: boolean;
  isActive: boolean;
  soldOut: boolean;

  seo: {
    title: string;
    description: string;
    imageAltText: string;
    allowIndexing: boolean;
    canonicalUrl: string;
    socialTitle: string;
    socialDescription: string;
    socialImageUrl: string;
  };
};

type ProductAddonOption = {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl: string;
  isUniversal: boolean;
  eligibleProductCategories: string[];
};

type ProductFormProps = {
  initialData?: ProductFormInitialData;
  addonOptions?: ProductAddonOption[];
  defaultArrangementContainerNote?: string;
};

export default function ProductForm({
  initialData,
  addonOptions = [],
  defaultArrangementContainerNote = "",
}: ProductFormProps) {
  const router = useRouter();

  const isEditing =
    Boolean(initialData);

  // ===============================
  // PRICING TIERS
  // ===============================

  const standardTier =
    initialData?.pricingTiers.find(
      (tier) =>
        tier.label === "standard",
    );

  const deluxeTier =
    initialData?.pricingTiers.find(
      (tier) =>
        tier.label === "deluxe",
    );

  const premiumTier =
    initialData?.pricingTiers.find(
      (tier) =>
        tier.label === "premium",
    );

  // ===============================
  // PRODUCT IDENTITY
  // ===============================

  const [name, setName] = useState(
    initialData?.name ?? "",
  );

  const [sku, setSku] = useState(
    initialData?.sku ?? "",
  );

  const [
    shortDescription,
    setShortDescription,
  ] = useState(
    initialData?.shortDescription ??
      "",
  );

  const [
    description,
    setDescription,
  ] = useState(
    initialData?.description ?? "",
  );

  const [category, setCategory] =
    useState(
      initialData?.category ??
        "Flowers",
    );

  const [occasions, setOccasions] =
    useState<string[]>(
      initialData?.occasions ?? [],
    );

  const [tagsInput, setTagsInput] =
    useState(
      initialData?.tags?.join(", ") ??
        "",
    );

  // ===============================
  // PRODUCT MEDIA
  // ===============================

  const [imageUrl, setImageUrl] =
    useState(
      initialData?.imageUrl ?? "",
    );

  const [
    galleryImages,
    setGalleryImages,
  ] = useState<string[]>(
    initialData?.galleryImages ?? [],
  );

  const productImages = [
    ...(imageUrl
      ? [imageUrl]
      : []),
    ...galleryImages,
  ];

  const [
    uploadingImage,
    setUploadingImage,
  ] = useState(false);

  // ===============================
  // PRICING
  // ===============================

  const [
    standardPrice,
    setStandardPrice,
  ] = useState(
    standardTier
      ? standardTier.price.toString()
      : "",
  );

  const [
    deluxeEnabled,
    setDeluxeEnabled,
  ] = useState(
    Boolean(deluxeTier?.enabled),
  );

  const [
    deluxePrice,
    setDeluxePrice,
  ] = useState(
    deluxeTier
      ? deluxeTier.price.toString()
      : "",
  );

  const [
    premiumEnabled,
    setPremiumEnabled,
  ] = useState(
    Boolean(premiumTier?.enabled),
  );

  const [
    premiumPrice,
    setPremiumPrice,
  ] = useState(
    premiumTier
      ? premiumTier.price.toString()
      : "",
  );

  /*
   * Tier-specific images can be populated by CSV imports and are
   * already used by the storefront configurator. Keep them in form
   * state so editing unrelated product fields never erases them.
   */
  const [standardTierImageUrl] = useState(standardTier?.imageUrl ?? "");
  const [deluxeTierImageUrl] = useState(deluxeTier?.imageUrl ?? "");
  const [premiumTierImageUrl] = useState(premiumTier?.imageUrl ?? "");

  const [standardRecipe, setStandardRecipe] =
    useState<BloomWebsiteProductRecipe>(
      cloneBloomWebsiteProductRecipe(standardTier?.recipe),
    );

  const [deluxeRecipe, setDeluxeRecipe] =
    useState<BloomWebsiteProductRecipe>(
      cloneBloomWebsiteProductRecipe(deluxeTier?.recipe),
    );

  const [premiumRecipe, setPremiumRecipe] =
    useState<BloomWebsiteProductRecipe>(
      cloneBloomWebsiteProductRecipe(premiumTier?.recipe),
    );

  // ===============================
  // ORDERING
  // ===============================

  const [
    allowsSubstitutions,
    setAllowsSubstitutions,
  ] = useState(
    initialData
      ?.allowsSubstitutions ?? true,
  );

  const [
    arrangementNoteMode,
    setArrangementNoteMode,
  ] = useState<"default" | "custom" | "none">(
    initialData?.arrangementContainerNote?.mode ?? "default",
  );

  const [
    arrangementNoteText,
    setArrangementNoteText,
  ] = useState(
    initialData?.arrangementContainerNote?.text ?? "",
  );

  const [
    localOnly,
    setLocalOnly,
  ] = useState(
    initialData?.localOnly ?? true,
  );

  const [taxable, setTaxable] =
    useState(
      initialData?.taxable ?? true,
    );

  const [taxRatePercent, setTaxRatePercent] = useState(
    initialData?.taxRatePercent == null
      ? ""
      : String(initialData.taxRatePercent),
  );

  const [
    isFeatured,
    setIsFeatured,
  ] = useState(
    initialData?.isFeatured ?? false,
  );

  const [isActive, setIsActive] =
    useState(
      initialData?.isActive ?? true,
    );

  const [soldOut, setSoldOut] =
    useState(
      initialData?.soldOut ?? false,
    );

  // ===============================
  // INVENTORY
  // ===============================

  const [
    trackInventory,
    setTrackInventory,
  ] = useState(
    initialData?.inventory
      ?.trackInventory ?? false,
  );

  const [
    inventoryQuantity,
    setInventoryQuantity,
  ] = useState(
    initialData?.inventory?.quantity
      ?.toString() ?? "0",
  );

  // ===============================
  // AVAILABILITY
  // ===============================

  const [
    availabilityType,
    setAvailabilityType,
  ] = useState<
    "always" | "date_range"
  >(
    initialData?.availability?.type ??
      "always",
  );

  const [
    availabilityStartDate,
    setAvailabilityStartDate,
  ] = useState(
    initialData?.availability
      ?.startDate ?? "",
  );

  const [
    availabilityEndDate,
    setAvailabilityEndDate,
  ] = useState(
    initialData?.availability
      ?.endDate ?? "",
  );

  // ===============================
  // ADD-ONS
  // ===============================

  const [
    availableAddons,
    setAvailableAddons,
  ] = useState<string[]>(
    initialData?.availableAddons ?? [],
  );

  // ===============================
  // SEO
  // ===============================

  const [
    seoTitle,
    setSeoTitle,
  ] = useState(
    initialData?.seo?.title ?? "",
  );

  const [
    seoDescription,
    setSeoDescription,
  ] = useState(
    initialData?.seo?.description ??
      "",
  );

  const [
    imageAltText,
    setImageAltText,
  ] = useState(
    initialData?.seo?.imageAltText ??
      "",
  );

  const [
    allowIndexing,
    setAllowIndexing,
  ] = useState(
    initialData?.seo?.allowIndexing ??
      true,
  );

  const [
    canonicalUrl,
    setCanonicalUrl,
  ] = useState(
    initialData?.seo?.canonicalUrl ??
      "",
  );

  const [
    socialTitle,
    setSocialTitle,
  ] = useState(
    initialData?.seo?.socialTitle ??
      "",
  );

  const [
    socialDescription,
    setSocialDescription,
  ] = useState(
    initialData?.seo
      ?.socialDescription ?? "",
  );

  const [
    socialImageUrl,
    setSocialImageUrl,
  ] = useState(
    initialData?.seo
      ?.socialImageUrl ?? "",
  );

  const [
    showAdvancedSeo,
    setShowAdvancedSeo,
  ] = useState(false);

  const [
    showSeoHelp,
    setShowSeoHelp,
  ] = useState(false);

  // ===============================
  // FORM STATE
  // ===============================

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  // ===============================
  // IMAGE UPLOADS
  // ===============================

  async function handleProductImagesUpload(
    files: FileList,
  ) {
    if (uploadingImage) {
      return;
    }

    const remainingSlots =
      8 - productImages.length;

    if (remainingSlots <= 0) {
      setError(
        "You can add up to 8 product photos.",
      );

      return;
    }

    const selectedFiles =
      Array.from(files).slice(
        0,
        remainingSlots,
      );

    try {
      setUploadingImage(true);
      setError("");

      const uploadedImages: string[] =
        [];

      for (const file of selectedFiles) {
        try {
          const uploadedUrl =
            await uploadWebsiteImage({
              file,
              assetType: "product",
            });

          uploadedImages.push(
            uploadedUrl,
          );
        } catch (error) {
          console.error(
            "Product photo upload failed:",
            error,
          );

          setError(
            error instanceof Error
              ? error.message
              : "Unable to upload product photo.",
          );

          break;
        }
      }

      if (
        uploadedImages.length === 0
      ) {
        return;
      }

      if (!imageUrl) {
        const [
          firstImage,
          ...remainingImages
        ] = uploadedImages;

        setImageUrl(firstImage);

        setGalleryImages(
          (current) => [
            ...current,
            ...remainingImages,
          ],
        );

        return;
      }

      setGalleryImages(
        (current) => [
          ...current,
          ...uploadedImages,
        ],
      );
    } finally {
      setUploadingImage(false);
    }
  }

  function setPrimaryImage(
    selectedImage: string,
  ) {
    if (
      selectedImage === imageUrl
    ) {
      return;
    }

    const previousPrimary =
      imageUrl;

    setImageUrl(selectedImage);

    setGalleryImages(
      (current) => [
        ...(previousPrimary
          ? [previousPrimary]
          : []),

        ...current.filter(
          (image) =>
            image !== selectedImage,
        ),
      ],
    );
  }

  function removeProductImage(
    selectedImage: string,
  ) {
    if (
      selectedImage === imageUrl
    ) {
      const [
        nextPrimary,
        ...remainingGallery
      ] = galleryImages;

      setImageUrl(
        nextPrimary || "",
      );

      setGalleryImages(
        remainingGallery,
      );

      return;
    }

    setGalleryImages(
      (current) =>
        current.filter(
          (image) =>
            image !== selectedImage,
        ),
    );
  }

  function useCatalogueAsPrimary(catalogueImageUrl: string) {
    if (!catalogueImageUrl || catalogueImageUrl === imageUrl) {
      return;
    }

    if (galleryImages.includes(catalogueImageUrl)) {
      setPrimaryImage(catalogueImageUrl);
      return;
    }

    const previousPrimary = imageUrl;
    setImageUrl(catalogueImageUrl);

    setGalleryImages((current) => {
      const withoutSelected = current.filter((image) => image !== catalogueImageUrl);

      /*
       * A product can contain at most eight images. If all eight slots
       * are already occupied, choosing a new shared image replaces the
       * old primary instead of silently creating a ninth image.
       */
      if (previousPrimary && 1 + current.length < 8) {
        return [previousPrimary, ...withoutSelected].slice(0, 7);
      }

      return withoutSelected.slice(0, 7);
    });
  }

  function addCatalogueToGallery(catalogueImageUrl: string) {
    if (!catalogueImageUrl || productImages.includes(catalogueImageUrl)) {
      return;
    }

    if (productImages.length >= 8) {
      setError("You can add up to 8 product photos.");
      return;
    }

    if (!imageUrl) {
      setImageUrl(catalogueImageUrl);
      return;
    }

    setGalleryImages((current) => [...current, catalogueImageUrl]);
  }

  // ===============================
  // SEO AUTO FILL
  // ===============================

  function handleAutoFillSeo() {
    const cleanName =
      name.trim() ||
      "Flower Arrangement";

    const cleanShortDescription =
      shortDescription.trim();

    const generatedTitle =
      cleanName.length <= 52
        ? `${cleanName} | Local Florist`
        : cleanName.slice(0, 70);

    const generatedDescription =
      cleanShortDescription ||
      `Order ${cleanName} for local flower delivery. Fresh flowers designed by your local florist for life's meaningful moments.`;

    setSeoTitle(
      generatedTitle.slice(0, 70),
    );

    setSeoDescription(
      generatedDescription.slice(
        0,
        170,
      ),
    );

    setImageAltText(
      `${cleanName} flower arrangement`,
    );

    if (!socialTitle) {
      setSocialTitle(cleanName);
    }

    if (!socialDescription) {
      setSocialDescription(
        generatedDescription.slice(
          0,
          250,
        ),
      );
    }

    if (
      !socialImageUrl &&
      imageUrl
    ) {
      setSocialImageUrl(imageUrl);
    }
  }

  function applyCatalogueSuggestedDetails(
    suggestedProduct: BloomCatalogueSuggestedProduct,
    fields: BloomCatalogueSuggestedField[],
  ) {
    const selected = new Set(fields);

    if (selected.has("name") && suggestedProduct.name.trim()) {
      setName(suggestedProduct.name.trim());
    }

    if (
      selected.has("shortDescription") &&
      suggestedProduct.shortDescription.trim()
    ) {
      setShortDescription(suggestedProduct.shortDescription.trim());
    }

    if (selected.has("description") && suggestedProduct.description.trim()) {
      setDescription(suggestedProduct.description.trim());
    }

    if (selected.has("category") && suggestedProduct.category.trim()) {
      const suggestedCategory = suggestedProduct.category.trim();

      if (
        PRODUCT_CATEGORIES.includes(
          suggestedCategory as (typeof PRODUCT_CATEGORIES)[number],
        )
      ) {
        setCategory(suggestedCategory);
      }
    }

    if (selected.has("occasions") && suggestedProduct.occasions.length > 0) {
      const supportedOccasions = suggestedProduct.occasions.filter((occasion) =>
        PRODUCT_OCCASIONS.includes(occasion as (typeof PRODUCT_OCCASIONS)[number]),
      );

      setOccasions([...new Set(supportedOccasions)]);
    }

    if (selected.has("tags") && suggestedProduct.tags.length > 0) {
      setTagsInput([...new Set(suggestedProduct.tags)].join(", "));
    }

    if (selected.has("seoTitle") && suggestedProduct.seoTitle.trim()) {
      setSeoTitle(suggestedProduct.seoTitle.trim().slice(0, 70));
    }

    if (
      selected.has("seoDescription") &&
      suggestedProduct.seoDescription.trim()
    ) {
      setSeoDescription(suggestedProduct.seoDescription.trim().slice(0, 170));
    }

    if (selected.has("imageAltText") && suggestedProduct.imageAltText.trim()) {
      setImageAltText(suggestedProduct.imageAltText.trim().slice(0, 250));
    }

    if (selected.has("socialTitle") && suggestedProduct.socialTitle.trim()) {
      setSocialTitle(suggestedProduct.socialTitle.trim().slice(0, 100));
    }

    if (
      selected.has("socialDescription") &&
      suggestedProduct.socialDescription.trim()
    ) {
      setSocialDescription(
        suggestedProduct.socialDescription.trim().slice(0, 250),
      );
    }
  }

  // ===============================
  // SUBMIT
  // ===============================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!imageUrl) {
      setError(
        "Please add a primary product image before saving this product.",
      );

      return;
    }

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const endpoint =
        isEditing && initialData
          ? `/api/websites/products/${initialData.id}`
          : "/api/websites/products";

      const method =
        isEditing
          ? "PATCH"
          : "POST";

      const response = await fetch(
        endpoint,
        {
          method,

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            sku,

            name,
            shortDescription,
            description,

            category,
            occasions,

            tags: tagsInput
              .split(",")
              .map((tag) =>
                tag.trim(),
              )
              .filter(Boolean),

            imageUrl,
            galleryImages,

            standardPrice,

            deluxeEnabled,
            deluxePrice,

            premiumEnabled,
            premiumPrice,

            standardTierImageUrl,
            deluxeTierImageUrl,
            premiumTierImageUrl,

            standardRecipe,
            deluxeRecipe,
            premiumRecipe,

            allowsSubstitutions,
            arrangementNoteMode,
            arrangementNoteText,
            localOnly,
            taxable,
            taxRatePercent: taxable ? taxRatePercent : "",

            trackInventory,
            inventoryQuantity,

            availabilityType,
            availabilityStartDate,
            availabilityEndDate,

            availableAddons,

            isFeatured,
            isActive,
            soldOut,

            seoTitle,
            seoDescription,
            imageAltText,
            allowIndexing,
            canonicalUrl,
            socialTitle,
            socialDescription,
            socialImageUrl,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (isEditing
              ? "Unable to update product."
              : "Unable to create product."),
        );
      }

      router.push(
        "/dashboard/websites/products",
      );

      router.refresh();
    } catch (error) {
      console.error(
        isEditing
          ? "Failed to update product:"
          : "Failed to create product:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : isEditing
            ? "Unable to update product."
            : "Unable to create product.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const universalAddons =
    addonOptions.filter(
      (addon) =>
        addon.isUniversal,
    );

  const specificAddons =
    addonOptions.filter(
      (addon) =>
        !addon.isUniversal,
    );

  const quickNavItems = [
    { id: "product-details", label: "Details" },
    { id: "product-pricing", label: "Pricing" },
    { id: "product-recipes", label: "Recipes" },
    { id: "product-ordering", label: "Ordering" },
    { id: "product-placement", label: "Placement" },
    ...(isEditing
      ? [{ id: "product-addons", label: "Add-ons" }]
      : []),
    { id: "product-seo", label: "SEO" },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/dashboard/websites/products"
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-gray-900"
      >
        <ArrowLeft size={17} />
        Back to Products & Add-ons
      </Link>

      <div className="mt-5">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-purple-600">
          BloomWebsites
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
          {isEditing
            ? "Edit Product"
            : "Add Product"}
        </h1>

        <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
          {isEditing
            ? "Update this product's details, pricing, availability, photos, add-ons, and search settings."
            : "Create a product customers will be able to purchase from your flower shop's website."}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-7"
      >
        <div className="xl:grid xl:grid-cols-[220px_minmax(0,1fr)] xl:items-start xl:gap-6 2xl:grid-cols-[240px_minmax(0,1fr)]">
          <ProductFormQuickNavigation
            items={quickNavItems}
            isSaving={isSaving}
            disabled={uploadingImage}
            saveLabel={isEditing ? "Save Changes" : "Create Product"}
          />

          <div className="min-w-0 space-y-5">
        {/* PRODUCT DETAILS */}
        <section
          id="product-details"
          className="scroll-mt-28 xl:scroll-mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Package2 size={22} />
            </div>

            <div>
              <h2 className="text-lg font-black text-gray-950">
                Product Details
              </h2>

              <p className="text-sm text-gray-500">
                Tell customers what
                you&apos;re offering.
              </p>
            </div>
          </div>

          {/* PRODUCT PHOTOS */}
          <div className="mt-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <label className="text-sm font-bold text-gray-800">
                  Product Photos
                </label>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                  Add up to 8 photos of this
                  product. Your primary photo
                  appears on collection pages,
                  search results, and first on
                  the product page.
                </p>
              </div>

              <span className="text-xs font-bold text-gray-400">
                {productImages.length}/8
              </span>
            </div>

            {productImages.length >
              0 && (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {productImages.map(
                  (
                    productImage,
                    index,
                  ) => {
                    const isPrimary =
                      productImage ===
                      imageUrl;

                    return (
                      <div
                        key={
                          productImage
                        }
                        className={`overflow-hidden rounded-2xl border bg-white ${
                          isPrimary
                            ? "border-purple-400 ring-2 ring-purple-100"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="relative aspect-square bg-white p-2">
                          <img
                            src={
                              productImage
                            }
                            alt={`Product photo ${
                              index + 1
                            }`}
                            className="h-full w-full object-contain"
                          />

                          {isPrimary && (
                            <span className="absolute left-2 top-2 rounded-full bg-purple-700 px-3 py-1 text-xs font-black text-white shadow-sm">
                              Primary
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 border-t border-gray-100 p-3">
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={() =>
                                setPrimaryImage(
                                  productImage,
                                )
                              }
                              className="rounded-lg bg-purple-50 px-3 py-2 text-xs font-black text-purple-700 transition hover:bg-purple-100"
                            >
                              Set as Primary
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              removeProductImage(
                                productImage,
                              )
                            }
                            className="rounded-lg px-3 py-2 text-xs font-bold text-gray-500 transition hover:bg-red-50 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <BloomCataloguePicker
                currentImages={productImages}
                canAddGalleryImage={productImages.length < 8}
                isEditing={isEditing}
                currentProductDetails={{
                  name,
                  shortDescription,
                  description,
                  category,
                  occasions,
                  tags: tagsInput
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                  seoTitle,
                  seoDescription,
                  imageAltText,
                  socialTitle,
                  socialDescription,
                }}
                onUsePrimary={useCatalogueAsPrimary}
                onAddGallery={addCatalogueToGallery}
                onApplySuggestedDetails={applyCatalogueSuggestedDetails}
              />

              <p className="max-w-xl text-xs leading-5 text-gray-500 sm:text-right">
                Bloom catalogue images are shared illustrative examples. Choosing one never changes product details automatically; when starter copy and SEO recommendations are available, you can review exactly which fields to use.
              </p>
            </div>

            {productImages.length <
              8 && (
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center transition hover:border-purple-300 hover:bg-purple-50">
                {uploadingImage ? (
                  <Loader2
                    size={30}
                    className="animate-spin text-purple-600"
                  />
                ) : (
                  <Upload
                    size={30}
                    className="text-purple-600"
                  />
                )}

                <p className="mt-3 font-black text-gray-950">
                  {uploadingImage
                    ? "Uploading photos..."
                    : productImages.length
                      ? "Add More Photos"
                      : "Add Product Photos"}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  JPG, PNG, or WebP · Maximum
                  8 MB each
                </p>

                {!uploadingImage && (
                  <p className="mt-3 text-xs font-semibold text-purple-700">
                    You can select multiple
                    photos at once.
                  </p>
                )}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={
                    uploadingImage
                  }
                  className="hidden"
                  onChange={(
                    event,
                  ) => {
                    const files =
                      event.target
                        .files;

                    if (
                      files?.length
                    ) {
                      void handleProductImagesUpload(
                        files,
                      );
                    }

                    event.target.value =
                      "";
                  }}
                />
              </label>
            )}
          </div>

          {/* PRODUCT NAME + SKU */}
          <div className="mt-7 grid gap-6 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="name"
                className="text-sm font-bold text-gray-800"
              >
                Product Name
              </label>

              <input
                id="name"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
                maxLength={160}
                required
                placeholder="Designer's Choice"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <p className="mt-2 text-xs leading-5 text-gray-500">
                The customer-facing name of
                this item. Use a clear,
                memorable name.
              </p>
            </div>

            <div>
              <label
                htmlFor="sku"
                className="text-sm font-bold text-gray-800"
              >
                SKU
              </label>

              <input
                id="sku"
                value={sku}
                onChange={(event) =>
                  setSku(
                    event.target.value,
                  )
                }
                maxLength={100}
                placeholder="DC-001"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Optional internal product
                code for POS, inventory, or
                accounting matching.
              </p>
            </div>
          </div>

          {/* SHORT DESCRIPTION */}
          <div className="mt-6">
            <label
              htmlFor="shortDescription"
              className="text-sm font-bold text-gray-800"
            >
              Short Description
            </label>

            <textarea
              id="shortDescription"
              value={
                shortDescription
              }
              onChange={(event) =>
                setShortDescription(
                  event.target.value,
                )
              }
              maxLength={500}
              rows={3}
              placeholder="A bright seasonal arrangement designed with the freshest flowers available."
              className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-gray-950 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />

            <div className="mt-2 flex justify-between gap-4 text-xs leading-5 text-gray-500">
              <span>
                A quick one or two sentence
                summary used on product cards
                and search results.
              </span>

              <span className="shrink-0 text-gray-400">
                {
                  shortDescription.length
                }
                /500
              </span>
            </div>
          </div>

          {/* FULL DESCRIPTION */}
          <div className="mt-6">
            <label
              htmlFor="description"
              className="text-sm font-bold text-gray-800"
            >
              Full Description
            </label>

            <textarea
              id="description"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              maxLength={3000}
              rows={7}
              placeholder="Describe the arrangement, flowers, container, style, and anything else the customer should know..."
              className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3 text-gray-950 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />

            <div className="mt-2 flex justify-between gap-4 text-xs leading-5 text-gray-500">
              <span>
                Give customers the full story
                about the flowers, style,
                container, size expectations,
                and substitutions.
              </span>

              <span className="shrink-0 text-gray-400">
                {description.length}/3000
              </span>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section
          id="product-pricing"
          className="scroll-mt-28 xl:scroll-mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-black text-gray-950">
            Pricing
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Standard is required. Offer Deluxe
            and Premium when customers can
            upgrade to a fuller arrangement.
          </p>

          <div className="mt-7 space-y-4">
            <PriceRow
              label="Standard"
              value={standardPrice}
              onChange={
                setStandardPrice
              }
              required
            />

            <PriceRow
              label="Deluxe"
              value={deluxePrice}
              onChange={setDeluxePrice}
              enabled={deluxeEnabled}
              onEnabledChange={
                setDeluxeEnabled
              }
            />

            <PriceRow
              label="Premium"
              value={premiumPrice}
              onChange={
                setPremiumPrice
              }
              enabled={premiumEnabled}
              onEnabledChange={
                setPremiumEnabled
              }
            />
          </div>
        </section>

        {/* DESIGN RECIPES */}
        <section
          id="product-recipes"
          className="scroll-mt-28 xl:scroll-mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-black text-gray-950">
            Design Recipes
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            Recipes are private production instructions. Each enabled price tier
            can have its own stem counts, hardgoods, supplies, and designer notes.
          </p>

          <div className="mt-7 space-y-5">
            <ProductRecipeEditor
              title="Standard recipe"
              recipe={standardRecipe}
              onChange={setStandardRecipe}
            />

            {deluxeEnabled && (
              <ProductRecipeEditor
                title="Deluxe recipe"
                recipe={deluxeRecipe}
                onChange={setDeluxeRecipe}
              />
            )}

            {premiumEnabled && (
              <ProductRecipeEditor
                title="Premium recipe"
                recipe={premiumRecipe}
                onChange={setPremiumRecipe}
              />
            )}
          </div>
        </section>

        {/* ORDERING & AVAILABILITY */}
        <section
          id="product-ordering"
          className="scroll-mt-28 xl:scroll-mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-black text-gray-950">
            Ordering & Availability
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Control how this product can be
            sold.
          </p>

          <div className="mt-6 space-y-4">
            <ToggleRow
              checked={
                allowsSubstitutions
              }
              onChange={
                setAllowsSubstitutions
              }
              title="Allow substitutions"
              description="Allow appropriate flower or container substitutions when necessary."
            />

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-black text-gray-900">
                Arrangement &amp; container note
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Explain reasonable differences between the product image and what customers may receive.
              </p>

              <div className="mt-4 space-y-3">
                <label className="flex cursor-pointer gap-3 rounded-xl border border-gray-200 bg-white p-3">
                  <input
                    type="radio"
                    name="arrangementNoteMode"
                    value="default"
                    checked={arrangementNoteMode === "default"}
                    onChange={() => setArrangementNoteMode("default")}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-bold text-gray-900">Use shop default</span>
                    <span className="mt-1 block text-sm text-gray-500">
                      {defaultArrangementContainerNote
                        ? defaultArrangementContainerNote
                        : "No shop-wide default is currently set."}
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer gap-3 rounded-xl border border-gray-200 bg-white p-3">
                  <input
                    type="radio"
                    name="arrangementNoteMode"
                    value="custom"
                    checked={arrangementNoteMode === "custom"}
                    onChange={() => setArrangementNoteMode("custom")}
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-gray-900">Use a custom note for this product</span>
                    {arrangementNoteMode === "custom" && (
                      <>
                        <textarea
                          value={arrangementNoteText}
                          onChange={(event) => setArrangementNoteText(event.target.value)}
                          maxLength={1000}
                          rows={3}
                          placeholder="Example: Arrangement may come in a pink vase."
                          className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
                        />
                        <span className="mt-1 block text-right text-xs text-gray-400">
                          {arrangementNoteText.length}/1000
                        </span>
                      </>
                    )}
                  </span>
                </label>

                <label className="flex cursor-pointer gap-3 rounded-xl border border-gray-200 bg-white p-3">
                  <input
                    type="radio"
                    name="arrangementNoteMode"
                    value="none"
                    checked={arrangementNoteMode === "none"}
                    onChange={() => setArrangementNoteMode("none")}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-bold text-gray-900">Do not show a note for this product</span>
                    <span className="mt-1 block text-sm text-gray-500">Suppresses the shop-wide default on this product.</span>
                  </span>
                </label>
              </div>
            </div>

            <ToggleRow
              checked={localOnly}
              onChange={setLocalOnly}
              title="Local delivery only"
              description="This product is fulfilled directly within your shop's delivery area."
            />

            <ToggleRow
              checked={taxable}
              onChange={setTaxable}
              title="Taxable"
              description="Include this product when calculating applicable sales tax."
            />

            {taxable && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <label className="text-sm font-black text-gray-900">
                  Product tax-rate override
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.001"
                  value={taxRatePercent}
                  onChange={(event) => setTaxRatePercent(event.target.value)}
                  placeholder="Use website default"
                  className="mt-2 w-full max-w-xs rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Leave blank to use the website default. Use this when a specific product requires a different rate.
                </p>
              </div>
            )}

            <ToggleRow
              checked={isFeatured}
              onChange={setIsFeatured}
              title="Featured product"
              description="Highlight this product more prominently on your storefront."
            />

            <ToggleRow
              checked={isActive}
              onChange={setIsActive}
              title="Active"
              description="Active products can appear on your storefront."
            />

            <ToggleRow
              checked={soldOut}
              onChange={setSoldOut}
              title="Sold out"
              description="Temporarily prevent customers from purchasing this product while keeping it in your catalog."
            />

            <ToggleRow
              checked={trackInventory}
              onChange={
                setTrackInventory
              }
              title="Track inventory"
              description="Track a specific quantity for this product instead of using only the sold-out switch."
            />
          </div>

          {trackInventory && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <label
                htmlFor="inventoryQuantity"
                className="text-sm font-bold text-gray-800"
              >
                Quantity Available
              </label>

              <input
                id="inventoryQuantity"
                type="number"
                min="0"
                step="1"
                required
                value={
                  inventoryQuantity
                }
                onChange={(event) =>
                  setInventoryQuantity(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-950 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 sm:max-w-xs"
              />
            </div>
          )}

          <div className="mt-7 border-t border-gray-100 pt-7">
            <p className="text-sm font-bold text-gray-800">
              Availability
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-2xl border p-4 ${
                  availabilityType ===
                  "always"
                    ? "border-purple-300 bg-purple-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="availability"
                  checked={
                    availabilityType ===
                    "always"
                  }
                  onChange={() =>
                    setAvailabilityType(
                      "always",
                    )
                  }
                  className="mr-3"
                />

                <span className="font-bold text-gray-900">
                  Always Available
                </span>
              </label>

              <label
                className={`cursor-pointer rounded-2xl border p-4 ${
                  availabilityType ===
                  "date_range"
                    ? "border-purple-300 bg-purple-50"
                    : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="availability"
                  checked={
                    availabilityType ===
                    "date_range"
                  }
                  onChange={() =>
                    setAvailabilityType(
                      "date_range",
                    )
                  }
                  className="mr-3"
                />

                <span className="font-bold text-gray-900">
                  Seasonal / Date Range
                </span>
              </label>
            </div>

            {availabilityType ===
              "date_range" && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="availabilityStartDate"
                    className="text-sm font-bold text-gray-800"
                  >
                    Available From
                  </label>

                  <input
                    id="availabilityStartDate"
                    type="date"
                    required
                    value={
                      availabilityStartDate
                    }
                    onChange={(event) =>
                      setAvailabilityStartDate(
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="availabilityEndDate"
                    className="text-sm font-bold text-gray-800"
                  >
                    Available Through
                  </label>

                  <input
                    id="availabilityEndDate"
                    type="date"
                    required
                    value={
                      availabilityEndDate
                    }
                    onChange={(event) =>
                      setAvailabilityEndDate(
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* WHERE IT APPEARS */}
        <section
          id="product-placement"
          className="scroll-mt-28 xl:scroll-mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="text-lg font-black text-gray-950">
            Where It Appears
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Help customers find this product
            throughout your website.
          </p>

          <div className="mt-7 space-y-7">
            <div>
              <label
                htmlFor="category"
                className="text-sm font-bold text-gray-800"
              >
                Primary Category
              </label>

              <select
                id="category"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-950 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              >
                {PRODUCT_CATEGORIES.map(
                  (
                    productCategory,
                  ) => (
                    <option
                      key={
                        productCategory
                      }
                      value={
                        productCategory
                      }
                    >
                      {
                        productCategory
                      }
                    </option>
                  ),
                )}
              </select>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Choose the main section where
                this product belongs. Occasions
                below can place the same item in
                additional collections.
              </p>
            </div>

            <div>
              <p className="text-sm font-bold text-gray-800">
                Occasions
              </p>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Select every occasion this
                product is appropriate for.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PRODUCT_OCCASIONS.map(
                  (occasion) => {
                    const checked =
                      occasions.includes(
                        occasion,
                      );

                    return (
                      <label
                        key={occasion}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-bold transition ${
                          checked
                            ? "border-purple-300 bg-purple-50 text-purple-800"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={
                            checked
                          }
                          onChange={(
                            event,
                          ) => {
                            setOccasions(
                              event.target
                                .checked
                                ? [
                                    ...occasions,
                                    occasion,
                                  ]
                                : occasions.filter(
                                    (
                                      value,
                                    ) =>
                                      value !==
                                      occasion,
                                  ),
                            );
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />

                        {occasion}
                      </label>
                    );
                  },
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="tags"
                className="text-sm font-bold text-gray-800"
              >
                Tags
              </label>

              <input
                id="tags"
                value={tagsInput}
                onChange={(event) =>
                  setTagsInput(
                    event.target.value,
                  )
                }
                placeholder="roses, bright, modern, sunflower"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-950 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Optional descriptive keywords
                that help Bloom organize and
                search your catalog. Separate
                them with commas.
              </p>
            </div>
          </div>
        </section>

        {/* AVAILABLE ADD-ONS */}
        {isEditing && (
          <section
            id="product-addons"
            className="scroll-mt-28 xl:scroll-mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <h2 className="text-lg font-black text-gray-950">
              Available Add-ons
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Control which optional extras
              customers can add when purchasing
              this product. Universal add-ons
              are handled automatically, while
              specific add-ons can be attached
              manually below.
            </p>

            {addonOptions.length ===
            0 ? (
              <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-7 text-center">
                <p className="font-black text-gray-900">
                  No add-ons available yet
                </p>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
                  Create balloons,
                  chocolates, plush, vases,
                  ribbons, or other extras from
                  Products & Add-ons. Then
                  return here to control which
                  products they can be offered
                  with.
                </p>

                <Link
                  href="/dashboard/websites/addons/new"
                  className="mt-4 inline-flex rounded-xl bg-green-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-green-800"
                >
                  Add an Add-on
                </Link>
              </div>
            ) : (
              <div className="mt-7 space-y-8">
                {/* UNIVERSAL */}
                {universalAddons.length >
                  0 && (
                  <div>
                    <div>
                      <p className="text-sm font-black text-gray-950">
                        Automatically Available
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        These add-ons are
                        controlled by their
                        universal category
                        rules. You do not need
                        to attach them manually.
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {universalAddons.map(
                        (addon) => {
                          const categoryMatches =
                            addon
                              .eligibleProductCategories
                              .length ===
                              0 ||
                            addon
                              .eligibleProductCategories
                              .includes(
                                category,
                              );

                          return (
                            <div
                              key={
                                addon.id
                              }
                              className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center ${
                                categoryMatches
                                  ? "border-green-200 bg-green-50"
                                  : "border-gray-200 bg-gray-50 opacity-60"
                              }`}
                            >
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white bg-white">
                                {addon.imageUrl ? (
                                  <img
                                    src={
                                      addon.imageUrl
                                    }
                                    alt=""
                                    className="h-full w-full object-contain p-1"
                                  />
                                ) : (
                                  <span className="px-2 text-center text-[10px] font-bold text-gray-400">
                                    No photo
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="font-black text-gray-950">
                                  {
                                    addon.name
                                  }
                                </p>

                                <p className="mt-1 text-sm text-gray-500">
                                  $
                                  {addon.price.toFixed(
                                    2,
                                  )}
                                  {" · "}
                                  {
                                    addon.category
                                  }
                                </p>

                                {addon
                                  .eligibleProductCategories
                                  .length >
                                  0 && (
                                  <p className="mt-1 text-xs text-gray-500">
                                    Allowed
                                    categories:{" "}
                                    {addon.eligibleProductCategories.join(
                                      ", ",
                                    )}
                                  </p>
                                )}
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${
                                  categoryMatches
                                    ? "bg-white text-green-700"
                                    : "bg-white text-gray-500"
                                }`}
                              >
                                {categoryMatches
                                  ? "Automatic"
                                  : "Not available for this category"}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

                {/* SPECIFIC */}
                {specificAddons.length >
                  0 && (
                  <div>
                    <div>
                      <p className="text-sm font-black text-gray-950">
                        Add-ons for This
                        Product
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        Select any
                        non-universal extras
                        that should be offered
                        specifically with this
                        product.
                      </p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {specificAddons.map(
                        (addon) => {
                          const checked =
                            availableAddons.includes(
                              addon.id,
                            );

                          return (
                            <label
                              key={
                                addon.id
                              }
                              className={`flex cursor-pointer flex-col gap-4 rounded-2xl border p-4 transition sm:flex-row sm:items-center ${
                                checked
                                  ? "border-purple-300 bg-purple-50 ring-1 ring-purple-100"
                                  : "border-gray-200 bg-white hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  checked
                                }
                                onChange={(
                                  event,
                                ) => {
                                  setAvailableAddons(
                                    event
                                      .target
                                      .checked
                                      ? [
                                          ...availableAddons,
                                          addon.id,
                                        ]
                                      : availableAddons.filter(
                                          (
                                            id,
                                          ) =>
                                            id !==
                                            addon.id,
                                        ),
                                  );
                                }}
                                className="h-5 w-5 shrink-0 rounded border-gray-300"
                              />

                              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                                {addon.imageUrl ? (
                                  <img
                                    src={
                                      addon.imageUrl
                                    }
                                    alt=""
                                    className="h-full w-full object-contain p-1"
                                  />
                                ) : (
                                  <span className="px-2 text-center text-[10px] font-bold text-gray-400">
                                    No photo
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="font-black text-gray-950">
                                  {
                                    addon.name
                                  }
                                </p>

                                <p className="mt-1 text-sm text-gray-500">
                                  $
                                  {addon.price.toFixed(
                                    2,
                                  )}
                                  {" · "}
                                  {
                                    addon.category
                                  }
                                </p>
                              </div>

                              {checked && (
                                <span className="shrink-0 rounded-full bg-purple-700 px-3 py-1.5 text-xs font-black text-white">
                                  Included
                                </span>
                              )}
                            </label>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}

                {universalAddons.length >
                  0 &&
                  specificAddons.length ===
                    0 && (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                      <p className="text-sm font-bold text-gray-700">
                        All of your active
                        add-ons are currently
                        universal.
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        Edit an add-on and turn
                        off Universal Add-on if
                        you want to attach it
                        only to selected
                        products.
                      </p>
                    </div>
                  )}
              </div>
            )}
          </section>
        )}

        {/* SEARCH & SEO */}
        <section
          id="product-seo"
          className="scroll-mt-28 xl:scroll-mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-gray-950">
                  Search & SEO
                </h2>

                <button
                  type="button"
                  onClick={() => setShowSeoHelp((current) => !current)}
                  aria-expanded={showSeoHelp}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-purple-200 bg-purple-50 text-purple-700 transition hover:bg-purple-100"
                  title="What is product SEO?"
                >
                  <CircleHelp size={17} />
                  <span className="sr-only">What is product SEO?</span>
                </button>
              </div>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                Bloom automatically uses your
                product information to help
                search engines understand what
                you sell.
              </p>
            </div>

            <button
              type="button"
              onClick={
                handleAutoFillSeo
              }
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-purple-50 px-4 py-2.5 text-sm font-black text-purple-700 transition hover:bg-purple-100"
            >
              Auto Fill SEO
            </button>
          </div>

          {showSeoHelp && (
            <div className="mt-5 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-sm leading-6 text-purple-950">
              <p className="font-black">Why product SEO matters</p>
              <p className="mt-1 text-purple-900/80">
                Product SEO helps Google understand what this item is and when it should appear in search results. Bloom can generate strong defaults from your product name, description, and photo, so you only need to customize these fields when you want more control.
              </p>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
              Search Preview
            </p>

            <div className="mt-4">
              <p className="text-sm text-gray-700">
                yourflowershop.com ›
                products ›{" "}
                {name
                  ? name
                      .toLowerCase()
                      .trim()
                      .replace(
                        /['’]/g,
                        "",
                      )
                      .replace(
                        /[^a-z0-9]+/g,
                        "-",
                      )
                      .replace(
                        /^-+|-+$/g,
                        "",
                      )
                  : "product-name"}
              </p>

              <p className="mt-1 text-xl font-medium text-blue-700">
                {seoTitle ||
                  name ||
                  "Your Product Title"}
              </p>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                {seoDescription ||
                  shortDescription ||
                  "Add a short product description to preview how this item may appear in search results."}
              </p>
            </div>
          </div>

          <div className="mt-7 space-y-6">
            <div>
              <label
                htmlFor="seoTitle"
                className="text-sm font-bold text-gray-800"
              >
                SEO Title
              </label>

              <input
                id="seoTitle"
                value={seoTitle}
                onChange={(event) =>
                  setSeoTitle(
                    event.target.value,
                  )
                }
                maxLength={70}
                placeholder={
                  name ||
                  "Summer Garden | Local Florist"
                }
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
              />

              <p className="mt-2 text-right text-xs text-gray-400">
                {seoTitle.length}/70
              </p>
            </div>

            <div>
              <label
                htmlFor="seoDescription"
                className="text-sm font-bold text-gray-800"
              >
                Meta Description
              </label>

              <textarea
                id="seoDescription"
                value={seoDescription}
                onChange={(event) =>
                  setSeoDescription(
                    event.target.value,
                  )
                }
                maxLength={170}
                rows={3}
                placeholder={
                  shortDescription ||
                  "Briefly describe this product and why a customer should order it."
                }
                className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3"
              />

              <p className="mt-2 text-right text-xs text-gray-400">
                {
                  seoDescription.length
                }
                /170
              </p>
            </div>

            <div>
              <label
                htmlFor="imageAltText"
                className="text-sm font-bold text-gray-800"
              >
                Product Image Description
              </label>

              <input
                id="imageAltText"
                value={imageAltText}
                onChange={(event) =>
                  setImageAltText(
                    event.target.value,
                  )
                }
                maxLength={250}
                placeholder="Bright summer flower arrangement with roses and seasonal blooms"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
              />

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Describe what is actually
                visible in the primary photo.
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={() =>
                setShowAdvancedSeo(
                  (current) =>
                    !current,
                )
              }
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <p className="font-black text-gray-900">
                  Advanced SEO
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Optional controls for
                  indexing, canonical URLs,
                  and social sharing.
                </p>
              </div>

              <span className="text-sm font-black text-purple-700">
                {showAdvancedSeo
                  ? "Hide"
                  : "Show"}
              </span>
            </button>

            {showAdvancedSeo && (
              <div className="mt-6 space-y-6">
                <ToggleRow
                  checked={
                    allowIndexing
                  }
                  onChange={
                    setAllowIndexing
                  }
                  title="Allow search engine indexing"
                  description="Keep this enabled for products you want search engines to discover."
                />

                <div>
                  <label
                    htmlFor="canonicalUrl"
                    className="text-sm font-bold text-gray-800"
                  >
                    Canonical URL
                  </label>

                  <input
                    id="canonicalUrl"
                    value={
                      canonicalUrl
                    }
                    onChange={(event) =>
                      setCanonicalUrl(
                        event.target
                          .value,
                      )
                    }
                    maxLength={500}
                    placeholder="Leave blank to let Bloom manage this automatically"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="socialTitle"
                    className="text-sm font-bold text-gray-800"
                  >
                    Social Sharing Title
                  </label>

                  <input
                    id="socialTitle"
                    value={
                      socialTitle
                    }
                    onChange={(event) =>
                      setSocialTitle(
                        event.target
                          .value,
                      )
                    }
                    maxLength={100}
                    placeholder={
                      name ||
                      "Product title"
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label
                    htmlFor="socialDescription"
                    className="text-sm font-bold text-gray-800"
                  >
                    Social Sharing
                    Description
                  </label>

                  <textarea
                    id="socialDescription"
                    value={
                      socialDescription
                    }
                    onChange={(event) =>
                      setSocialDescription(
                        event.target
                          .value,
                      )
                    }
                    maxLength={250}
                    rows={3}
                    placeholder={
                      shortDescription ||
                      "Description shown when this product is shared."
                    }
                    className="mt-2 w-full resize-y rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                {imageUrl && (
                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      Social Sharing Image
                    </p>

                    <div className="mt-4 flex items-center gap-4 rounded-2xl border border-gray-200 p-4">
                      <img
                        src={
                          socialImageUrl ||
                          imageUrl
                        }
                        alt=""
                        className="h-20 w-20 rounded-xl object-contain"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setSocialImageUrl(
                            imageUrl,
                          )
                        }
                        className="text-sm font-black text-purple-700"
                      >
                        Use Primary Photo
                      </button>
                    </div>
                  </div>
                )}
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
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={
              isSaving ||
              uploadingImage
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-6 py-3.5 text-sm font-black text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2
                  size={18}
                  className="animate-spin"
                />

                {isEditing
                  ? "Saving Product..."
                  : "Creating Product..."}
              </>
            ) : (
              <>
                <Check size={18} />

                {isEditing
                  ? "Save Changes"
                  : "Create Product"}
              </>
            )}
          </button>
        </div>
          </div>
        </div>
      </form>
    </div>
  );
}

type PriceRowProps = {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  required?: boolean;
  enabled?: boolean;
  onEnabledChange?: (
    value: boolean,
  ) => void;
};

function PriceRow({
  label,
  value,
  onChange,
  required = false,
  enabled = true,
  onEnabledChange,
}: PriceRowProps) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {!required && (
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 sm:w-24">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) =>
                onEnabledChange?.(
                  event.target
                    .checked,
                )
              }
              className="h-4 w-4 rounded border-gray-300"
            />

            {label}
          </label>
        )}

        {required && (
          <div className="text-sm font-bold text-gray-700 sm:w-24">
            {label}
          </div>
        )}

        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">
            $
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            required={
              required || enabled
            }
            disabled={!enabled}
            value={value}
            onChange={(event) =>
              onChange(
                event.target.value,
              )
            }
            placeholder="0.00"
            className="w-full rounded-xl border border-gray-300 py-3 pl-8 pr-4 text-gray-950 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-100 disabled:text-gray-400"
          />
        </div>
      </div>
    </div>
  );
}

type ToggleRowProps = {
  checked: boolean;
  onChange: (
    value: boolean,
  ) => void;
  title: string;
  description: string;
};

function ToggleRow({
  checked,
  onChange,
  title,
  description,
}: ToggleRowProps) {
  return (
    <label className="flex cursor-pointer gap-4 rounded-2xl border border-gray-200 p-4 transition hover:bg-gray-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
        className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300"
      />

      <span>
        <span className="block font-bold text-gray-900">
          {title}
        </span>

        <span className="mt-1 block text-sm leading-6 text-gray-500">
          {description}
        </span>
      </span>
    </label>
  );
}