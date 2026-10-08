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

  const initialItems: AdminBloomCatalogueItem[] = rawItems.map((item) => ({
    id: String(item._id),
    title: item.title || "",
    description: item.description || "",
    flowers: item.flowers || [],
    colors: item.colors || [],
    occasions: item.occasions || [],
    categories: item.categories || [],
    tags: item.tags || [],
    suggestedProduct: {
      name: item.suggestedProduct?.name || "",
      shortDescription: item.suggestedProduct?.shortDescription || "",
      description: item.suggestedProduct?.description || "",
      category: item.suggestedProduct?.category || "",
      occasions: item.suggestedProduct?.occasions || [],
      tags: item.suggestedProduct?.tags || [],
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
  }));

  return <BloomCatalogueAdminClient initialItems={initialItems} />;
}
