// src/app/admin/catalogue/page.tsx

import BloomCatalogueAdminClient, {
  type AdminBloomCatalogueItem,
} from "@/components/admin/BloomCatalogueAdminClient";
import { connectToDB } from "@/lib/mongoose";
import BloomCatalogueItem from "@/models/BloomCatalogueItem";

export default async function AdminBloomCataloguePage() {
  await connectToDB();

  const rawItems = await BloomCatalogueItem.find({})
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();

  const initialItems: AdminBloomCatalogueItem[] = rawItems.map((item) => {
    const legacySuggested = item.suggestedProduct || {};
    const categories = Array.isArray(item.categories) ? item.categories : [];
    const occasions = Array.isArray(item.occasions) && item.occasions.length
      ? item.occasions
      : legacySuggested.occasions || [];
    const tags = Array.isArray(item.tags) && item.tags.length
      ? item.tags
      : legacySuggested.tags || [];

    return {
      id: String(item._id),
      title: legacySuggested.name || item.title || "",
      shortDescription:
        item.shortDescription || legacySuggested.shortDescription || "",
      description: legacySuggested.description || item.description || "",
      flowers: item.flowers || [],
      colors: item.colors || [],
      occasions,
      category: legacySuggested.category || categories[0] || "",
      tags,
      suggestedSeo: {
        title: item.suggestedSeo?.title || "",
        description: item.suggestedSeo?.description || "",
        imageAltText: item.suggestedSeo?.imageAltText || "",
        socialTitle: item.suggestedSeo?.socialTitle || "",
        socialDescription: item.suggestedSeo?.socialDescription || "",
      },
      image: {
        originalKey: item.image?.originalKey || "",
        originalUrl: item.image?.originalUrl || "",
        originalMimeType: item.image?.originalMimeType || "",
        originalFileSize: item.image?.originalFileSize || 0,
        optimizedKey: item.image?.optimizedKey || "",
        optimizedUrl: item.image?.optimizedUrl || "",
        optimizedFileSize: item.image?.optimizedFileSize || 0,
        width: item.image?.width || 1,
        height: item.image?.height || 1,
      },
      isDesignerChoice: item.isDesignerChoice === true,
      isActive: item.isActive !== false,
      sortOrder: item.sortOrder || 0,
    };
  });

  return <BloomCatalogueAdminClient initialItems={initialItems} />;
}
