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
import HomeVision from "@/components/HomeVision";
import HomeWhySwitch from "@/components/HomeWhySwitch";
import HowItWorks from "@/components/HowItWorks";
import { homeFaqs } from "@/lib/homeFaqs";
import type { Metadata } from "next";

const siteUrl = "https://www.getbloomdirect.com";

export const metadata: Metadata = {
  title: {
    absolute: "GetBloomDirect | The Fee-Free Florist-to-Florist Order Network",
  },

  description:
    "Send and receive florist-to-florist orders directly without traditional wire-service commissions. Join GetBloomDirect, the network built for independent florists.",

  keywords: [
    "florist-to-florist order network",
    "florist wire service alternative",
    "independent florist network",
    "florist order fulfillment",
    "florist software",
    "GetBloomDirect",
  ],

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "GetBloomDirect",
    title: "GetBloomDirect | The Fee-Free Florist-to-Florist Order Network",
    description:
      "A fee-free network that helps independent florists send and receive orders directly while keeping more of every order.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GetBloomDirect — The Fee-Free Florist-to-Florist Order Network",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "GetBloomDirect | The Fee-Free Florist-to-Florist Order Network",
    description:
      "Send and receive orders directly with independent florists—without traditional wire-service commissions.",
    images: ["/og-image.png"],
  },
};

export const revalidate = 3600;

export default function Home() {
  const organizationId = `${siteUrl}/#organization`;
  const applicationId = `${siteUrl}/#software`;

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
      "The fee-free florist-to-florist order network built for independent florists.",
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

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": applicationId,
    name: "GetBloomDirect",
    url: siteUrl,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Florist order management and networking",
    operatingSystem: "Web",
    description:
      "A florist-to-florist order network that allows independent florists to send and receive orders directly without traditional wire-service commissions.",
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
      "The fee-free florist-to-florist order network built for independent florists.",
    publisher: {
      "@id": organizationId,
    },
    inLanguage: "en-US",
  };

  const faqJsonLd = {
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="min-h-screen bg-gray-50">
        <section className="relative overflow-hidden bg-white">
          <HomeHeader />
          <HomeHero />
        </section>

        <HowItWorks />
        <HomeWhySwitch />
        <HomeNetworkGrowth />
        <HomeVision />
        <HomeFeatures />
        <HomePricing />
        <HomeNetworkStats />
        <HomeFAQ />
        <HomeCTA />
        <HomeFooter />
      </div>
    </>
  );
}
