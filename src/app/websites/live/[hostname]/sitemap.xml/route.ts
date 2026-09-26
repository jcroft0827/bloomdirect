import { getBloomWebsiteLiveTenant } from "@/lib/bloom-websites/getBloomWebsiteLiveTenant";
import { buildBloomWebsiteSitemapEntries } from "@/lib/bloom-websites/storefront-indexing";
import {
  isBloomWebsiteRequestHostMatch,
  normalizeBloomWebsiteHostname,
} from "@/lib/bloom-websites/storefront-hostname";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";

type RouteProps = {
  params: Promise<{
    hostname: string;
  }>;
};

type WebsiteLean = {
  updatedAt?: Date | null;
};

type ProductLean = {
  slug: string;
  isActive?: boolean;
  updatedAt?: Date | null;
  seo?: {
    allowIndexing?: boolean;
  };
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function serializeSitemap(
  entries: ReturnType<typeof buildBloomWebsiteSitemapEntries>,
) {
  const urls = entries
    .map((entry) => {
      const lastModified = entry.lastModified
        ? new Date(entry.lastModified).toISOString()
        : "";

      return [
        "  <url>",
        `    <loc>${escapeXml(entry.url)}</loc>`,
        lastModified
          ? `    <lastmod>${escapeXml(lastModified)}</lastmod>`
          : "",
        entry.changeFrequency
          ? `    <changefreq>${entry.changeFrequency}</changefreq>`
          : "",
        typeof entry.priority === "number"
          ? `    <priority>${entry.priority}</priority>`
          : "",
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

export async function GET(
  request: Request,
  { params }: RouteProps,
) {
  const { hostname: rawHostname } = await params;
  const hostname = normalizeBloomWebsiteHostname(
    decodeURIComponent(rawHostname),
  );

  if (
    !hostname ||
    !isBloomWebsiteRequestHostMatch(request.headers, hostname)
  ) {
    return new Response("Not Found", { status: 404 });
  }

  const tenant = await getBloomWebsiteLiveTenant(hostname);

  if (!tenant) {
    return new Response("Not Found", { status: 404 });
  }

  const [website, products] = await Promise.all([
    BloomWebsite.findById(tenant.websiteId)
      .select("updatedAt")
      .lean<WebsiteLean | null>(),

    BloomWebsiteProduct.find({
      website: tenant.websiteId,
      shop: tenant.shopId,
      isActive: true,
    })
      .select("slug isActive updatedAt seo.allowIndexing")
      .lean<ProductLean[]>(),
  ]);

  if (!website) {
    return new Response("Not Found", { status: 404 });
  }

  const origin = `https://${tenant.customDomain}`;

  const entries = buildBloomWebsiteSitemapEntries({
    origin,
    products,
    websiteLastModified: website.updatedAt,
  });

  return new Response(serializeSitemap(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
