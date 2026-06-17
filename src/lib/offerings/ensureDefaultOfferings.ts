import FulfillmentOffering from "@/models/FulfillmentOffering";

export async function ensureDefaultDesignerChoice(shopId: string) {
    const existing = await FulfillmentOffering.findOne({
        shop: shopId,
        type: "designers_choice",
        isActive: true,
    });

    if (existing) return existing;

    return FulfillmentOffering.create({
        shop: shopId,
        type: "designers_choice",
        name: "Designer's Choice",
        slug: "designers-choice",
        description:
            "Let the florist create something beautiful using the freshest flowers available.",
        pricingTiers: [
            { label: "Standard", price: 75 },
            { label: "Premium", price: 100 },
            { label: "Luxury", price: 150 },
        ],
        isActive: true,
        isDefault: true,
        isDesignerChoice: true,
        sortOrder: 0,
    });
}