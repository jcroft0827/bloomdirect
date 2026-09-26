import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import AddonForm, {
  type AddonFormInitialData,
} from "@/components/websites/addons/AddonForm";
import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteAddon from "@/models/BloomWebsiteAddon";

type PageProps = {
  params: Promise<{
    addonId: string;
  }>;
};

type AddonLean = {
  _id: {
    toString(): string;
  };

  sku?: string;
  name?: string;
  description?: string;
  category?: string;

  imageUrl?: string;
  galleryImages?: string[];
  imageAltText?: string;

  price?: number;
  taxable?: boolean;
  taxRatePercent?: number | null;

  isUniversal?: boolean;
  eligibleProductCategories?: string[];
  maxQuantity?: number;

  inventory?: {
    trackInventory?: boolean;
    quantity?: number;
  };

  availability?: {
    type?: string;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
  };

  isActive?: boolean;
  soldOut?: boolean;
};

function formatDateForInput(
  value: Date | string | null | undefined,
) {
  if (!value) {
    return "";
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export default async function EditAddonPage({
  params,
}: PageProps) {
  const session =
    await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { addonId } = await params;

  await connectToDB();

  const website = await BloomWebsite.findOne({
    shop: session.user.id,
  })
    .select("_id")
    .lean();

  if (!website) {
    notFound();
  }

  const websiteId = String(
    (website as { _id: unknown })._id,
  );

  const addon = (await BloomWebsiteAddon.findOne({
    _id: addonId,
    shop: session.user.id,
    website: websiteId,
  })
    .select(
      [
        "_id",
        "sku",
        "name",
        "description",
        "category",
        "imageUrl",
        "galleryImages",
        "imageAltText",
        "price",
        "taxable",
          "taxRatePercent",
        "isUniversal",
        "eligibleProductCategories",
        "maxQuantity",
        "inventory",
        "availability",
        "isActive",
        "soldOut",
      ].join(" "),
    )
    .lean()) as AddonLean | null;

  if (!addon) {
    notFound();
  }

  const initialData: AddonFormInitialData = {
    id: addon._id.toString(),

    sku: addon.sku ?? "",
    name: addon.name ?? "",
    description: addon.description ?? "",
    category: addon.category ?? "Extras",

    imageUrl: addon.imageUrl ?? "",
    galleryImages:
      addon.galleryImages ?? [],
    imageAltText:
      addon.imageAltText ?? "",

    price: addon.price ?? 0,
    taxable: addon.taxable ?? true,
      taxRatePercent:
        typeof addon.taxRatePercent === "number"
          ? addon.taxRatePercent
          : null,

    isUniversal:
      addon.isUniversal ?? true,

    eligibleProductCategories:
      addon.eligibleProductCategories ??
      [],

    maxQuantity:
      addon.maxQuantity ?? 1,

    inventory: {
      trackInventory:
        addon.inventory
          ?.trackInventory ?? false,

      quantity:
        addon.inventory?.quantity ?? 0,
    },

    availability: {
      type:
        addon.availability?.type ===
        "date_range"
          ? "date_range"
          : "always",

      startDate: formatDateForInput(
        addon.availability?.startDate,
      ),

      endDate: formatDateForInput(
        addon.availability?.endDate,
      ),
    },

    isActive:
      addon.isActive ?? true,

    soldOut:
      addon.soldOut ?? false,
  };

  return (
    <AddonForm
      initialData={initialData}
    />
  );
}