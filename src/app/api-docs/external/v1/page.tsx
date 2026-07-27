// src/app/api-docs/external/v1/page.tsx

import type { Metadata } from "next";
import APIDocsV1Client from "./APIDocsV1Client";

export const metadata: Metadata = {
  title: "POS API Documentation",

  description:
    "Integrate florist point-of-sale software with GetBloomDirect using the Bloom Pro POS API for retrieving, accepting, declining, and completing florist orders.",

  alternates: {
    canonical: "/api-docs/external/v1",
  },

  openGraph: {
    type: "website",
    url: "https://www.getbloomdirect.com/api-docs/external/v1",
    siteName: "GetBloomDirect",
    title: "GetBloomDirect POS API Documentation",
    description:
      "Technical documentation for integrating florist point-of-sale software with the GetBloomDirect order network.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GetBloomDirect POS API documentation",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "GetBloomDirect POS API Documentation",
    description:
      "Technical documentation for integrating florist POS systems with GetBloomDirect.",
    images: ["/og-image.png"],
  },
};

export default function Page() {
  return <APIDocsV1Client />;
}