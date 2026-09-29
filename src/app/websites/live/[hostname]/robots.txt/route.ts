import { getBloomWebsiteLiveTenant } from "@/lib/bloom-websites/getBloomWebsiteLiveTenant";
import {
  isBloomWebsiteRequestHostMatch,
  normalizeBloomWebsiteHostname,
} from "@/lib/bloom-websites/storefront-hostname";

type RouteProps = {
  params: Promise<{
    hostname: string;
  }>;
};

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

  const origin = `https://${tenant.customDomain}`;

  const body = [
    "User-agent: *",
    "Allow: /",
    "Allow: /shop",
    "Allow: /about",
    "Allow: /products/",
    "Disallow: /checkout/",
    "Disallow: /cart",
    "Disallow: /theme-preview",
    `Sitemap: ${origin}/sitemap.xml`,
    `Host: ${origin}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
