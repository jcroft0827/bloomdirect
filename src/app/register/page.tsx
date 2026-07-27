import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Join the Florist Network",

  description:
    "Create a free GetBloomDirect account and join the fee-free florist-to-florist order network built for independent flower shops.",

  alternates: {
    canonical: "/register",
  },

  robots: {
    index: false,
    follow: true,
  },

  openGraph: {
    type: "website",
    url: "https://www.getbloomdirect.com/register",
    siteName: "GetBloomDirect",
    title: "Join the GetBloomDirect Florist Network",
    description:
      "Create a free account, connect with independent florists, and send florist-to-florist orders without traditional wire-service commissions.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Join the GetBloomDirect florist network",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Join the GetBloomDirect Florist Network",
    description:
      "Create a free florist account and start building direct relationships with independent flower shops.",
    images: ["/og-image.png"],
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}