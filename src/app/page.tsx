// src/app/page.tsx
import HomeCTA from "@/components/HomeCTA";
import HomeFAQ from "@/components/HomeFAQ";
import HomeFeatures from "@/components/HomeFeatures";
import HomeFooter from "@/components/HomeFooter";
import HomeHeader from "@/components/HomeHeader";
import HomeHero from "@/components/HomeHero";
import HomeNetworkGrowth from "@/components/HomeNetworkGrowth";
import HomeNetworkStats from "@/components/HomeNetworkStats";
import HomePricing from "@/components/HomePricing";
import HomeWhySwitch from "@/components/HomeWhySwitch";
import HowItWorks from "@/components/HowItWorks";
import { homeFaqs } from "@/lib/homeFaqs";
import type { Metadata } from "next";

const siteUrl = "https://www.getbloomdirect.com";

export const metadata: Metadata = {
  title: {
    absolute:
      "BloomWebsites by GetBloomDirect | Florist Websites & Ecommerce",
  },
  description:
    "Build a florist ecommerce website with online ordering, delivery and pickup, Stripe payments, tax tools, order workflows, refunds, recipes, and no Bloom order fees. Build free and pay when you launch.",
  keywords: [
    "florist website builder",
    "florist ecommerce website",
    "flower shop website",
    "florist online ordering",
    "florist delivery website",
    "florist software",
    "BloomWebsites",
    "GetBloomDirect",
    "florist-to-florist order network",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "GetBloomDirect",
    title:
      "BloomWebsites by GetBloomDirect | Florist Websites & Ecommerce",
    description:
      "Build your florist website free. Launch for $129/month with $0 Bloom order fees.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GetBloomDirect and BloomWebsites for independent florists",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "BloomWebsites by GetBloomDirect | Florist Websites & Ecommerce",
    description:
      "Florist ecommerce built around products, delivery, payments, tax, refunds, recipes, and order operations.",
    images: ["/og-image.png"],
  },
};

export const revalidate = 3600;

export default function Home() {
  const organizationId = `${siteUrl}/#organization`;
  const bloomWebsitesId = `${siteUrl}/#bloomwebsites`;
  const networkId = `${siteUrl}/#getbloomdirect-network`;

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId,
    name: "GetBloomDirect",
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/logo.png`,
      width: 512,
      height: 512,
    },
    description:
      "Florist-first software for ecommerce websites and direct florist-to-florist fulfillment.",
    founder: {
      "@type": "Person",
      name: "Joe Croft",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "getbloomdirect@gmail.com",
      availableLanguage: "English",
    },
    areaServed: {
      "@type": "Country",
      name: "United States",
    },
  };

  const bloomWebsitesJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": bloomWebsitesId,
    name: "BloomWebsites",
    alternateName: "BloomWebsites by GetBloomDirect",
    url: siteUrl,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Florist ecommerce website platform",
    operatingSystem: "Web",
    description:
      "A florist ecommerce website platform with online ordering, delivery and pickup, payments, tax tools, order workflows, recipes, notifications, and component-aware refunds.",
    publisher: {
      "@id": organizationId,
    },
    featureList: [
      "Florist ecommerce storefront",
      "Delivery and pickup settings",
      "Standard, Deluxe, and Premium product pricing tiers",
      "Stripe customer payments",
      "Product, delivery, tip, and exemption tax controls",
      "Private design recipes",
      "Order fulfillment workflows",
      "Customer and florist notifications",
      "Component-aware refunds",
      "Custom domains",
    ],
    offers: [
      {
        "@type": "Offer",
        name: "BloomWebsites Standard Monthly",
        price: "129",
        priceCurrency: "USD",
        url: `${siteUrl}/#pricing`,
      },
      {
        "@type": "Offer",
        name: "BloomWebsites Standard Annual",
        price: "1349",
        priceCurrency: "USD",
        url: `${siteUrl}/#pricing`,
      },
    ],
  };

  const networkJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": networkId,
    name: "GetBloomDirect",
    url: siteUrl,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Florist-to-florist order network",
    operatingSystem: "Web",
    description:
      "A florist-to-florist fulfillment network that lets independent florists send and receive orders directly without a Bloom per-order commission.",
    publisher: {
      "@id": organizationId,
    },
    featureList: [
      "Direct florist-to-florist ordering",
      "Unlimited received orders",
      "Public florist profiles",
      "Fulfillment offerings",
      "Order messaging",
      "Verified florist reviews",
      "Florist reporting",
      "POS API access with Bloom Pro",
    ],
    offers: [
      {
        "@type": "Offer",
        name: "Bloom Free",
        price: "0",
        priceCurrency: "USD",
        url: `${siteUrl}/#pricing`,
      },
      {
        "@type": "Offer",
        name: "Bloom Pro Monthly",
        price: "49",
        priceCurrency: "USD",
        url: `${siteUrl}/#pricing`,
      },
      {
        "@type": "Offer",
        name: "Bloom Pro Annual",
        price: "450",
        priceCurrency: "USD",
        url: `${siteUrl}/#pricing`,
      },
    ],
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: "GetBloomDirect",
    description:
      "Florist-first ecommerce websites and a direct florist-to-florist fulfillment network.",
    publisher: {
      "@id": organizationId,
    },
    inLanguage: "en-US",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${siteUrl}/#faq`,
    mainEntity: homeFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const jsonLd = [
    organizationJsonLd,
    bloomWebsitesJsonLd,
    networkJsonLd,
    websiteJsonLd,
    faqJsonLd,
  ];

  return (
    <>
      {jsonLd.map((entry) => (
        <script
          key={String(entry["@id"] || entry["@type"])}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(entry).replace(/</g, "\\u003c"),
          }}
        />
      ))}

      <div className="min-h-screen bg-white">
        <HomeHeader />
        <HomeHero />

        <HomeFeatures />
        <HowItWorks />
        <HomeWhySwitch />

        <HomePricing />

        <HomeNetworkGrowth />
        <HomeNetworkStats />

        <HomeFAQ />
        <HomeCTA />
        <HomeFooter />
      </div>
    </>
  );
}
