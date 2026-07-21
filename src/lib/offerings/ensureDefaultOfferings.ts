// lib/offerings/ensureDefaultOfferings.ts

import Shop from "@/models/Shop";
import FulfillmentOffering from "@/models/FulfillmentOffering";

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function ensureDefaultDesignerChoice(shopId: string) {
  return FulfillmentOffering.findOneAndUpdate(
    {
      shop: shopId,
      type: "designers_choice",
      isActive: true,
    },
    {
      $setOnInsert: {
        shop: shopId,
        type: "designers_choice",
        name: "Designer's Choice",
        slug: "designers-choice",
        description:
          "Let the florist create something beautiful using the freshest flowers available.",
        occasions: ["everyday"],
        pricingTiers: [
          { label: "Standard", price: 75, description: "" },
          { label: "Premium", price: 100, description: "" },
          { label: "Luxury", price: 150, description: "" },
        ],
        taxable: true,
        allowsSubstitutions: true,
        isActive: true,
        isDefault: true,
        isFeatured: false,
        isDesignerChoice: true,
        sortOrder: 0,
        proOnly: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function ensureShopOfferingsInitialized(shopId: string) {
  const shop = await Shop.findById(shopId);

  if (!shop) return;

  if (shop.offeringsInitialized) {
    return;
  }

  await ensureDefaultDesignerChoice(shopId);

  const nonDesignerOffering = await FulfillmentOffering.findOne({
    shop: shopId,
    type: { $ne: "designers_choice" },
    isActive: true,
  });

  if (!nonDesignerOffering) {
    const legacyFeatured = shop.featuredBouquet;

    const hasLegacyFeatured =
      Boolean(legacyFeatured?.name?.trim()) ||
      Boolean(legacyFeatured?.description?.trim()) ||
      Boolean(legacyFeatured?.image?.trim()) ||
      Number(legacyFeatured?.price || 0) > 0;

    if (hasLegacyFeatured) {
      const offeringName =
        legacyFeatured?.name?.trim() || "Featured Arrangement";

      const price = Number(legacyFeatured?.price || 75);

      await FulfillmentOffering.findOneAndUpdate(
        {
          shop: shopId,
          type: "featured",
          isFeatured: true,
        },
        {
          $setOnInsert: {
            shop: shopId,
            type: "featured",
            name: offeringName,
            slug: slugify(offeringName),
            description: legacyFeatured?.description || "",
            image: legacyFeatured?.image || "",
            occasions: ["everyday"],
            pricingTiers: [
              {
                label: "Standard",
                price,
                description: "",
              },
            ],
            taxable: true,
            allowsSubstitutions: true,
            isActive: true,
            isDefault: false,
            isFeatured: true,
            isDesignerChoice: false,
            sortOrder: 10,
            proOnly: false,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );
    }
  }

  shop.offeringsInitialized = true;
  await shop.save();
}
