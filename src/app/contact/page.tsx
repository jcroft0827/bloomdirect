// src/app/contact/page.tsx

import HomeFooter from "@/components/HomeFooter";
import HomeHeader from "@/components/HomeHeader";
import ContactHero from "@/components/contact/ContactHero";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact GetBloomDirect",

  description:
    "Contact GetBloomDirect with questions, feedback, support requests, partnership ideas, or suggestions for improving the florist-to-florist network.",

  alternates: {
    canonical: "/contact",
  },

  openGraph: {
    type: "website",
    url: "https://www.getbloomdirect.com/contact",
    siteName: "GetBloomDirect",
    title: "Contact GetBloomDirect",
    description:
      "Have a question, idea, or suggestion? Start a conversation with GetBloomDirect.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Contact GetBloomDirect",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Contact GetBloomDirect",
    description:
      "Questions, feedback, support, or florist ideas? Start a conversation with GetBloomDirect.",
    images: ["/og-image.png"],
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomeHeader />

      <main>
        <ContactHero />
      </main>

      <HomeFooter />
    </div>
  );
}