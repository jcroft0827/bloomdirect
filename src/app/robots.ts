// src/app/robots.ts

import type { MetadataRoute } from "next";

const BASE_URL = "https://www.getbloomdirect.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/api/",
        "/setup/",
        "/orders/",
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}