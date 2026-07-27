// /app/layout.tsx

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7c3aed",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.getbloomdirect.com"),

  title: {
    default: "GetBloomDirect | The Fee-Free Florist-to-Florist Order Network",
    template: "%s | GetBloomDirect",
  },

  description:
    "The fee-free florist-to-florist order network built for independent florists to send orders directly, build trusted relationships, and keep more of every order.",

  alternates: {
    canonical: "/",
  },

  applicationName: "GetBloomDirect",

  authors: [
    {
      name: "GetBloomDirect",
      url: "https://www.getbloomdirect.com",
    },
  ],

  creator: "GetBloomDirect",
  publisher: "GetBloomDirect",

  category: "business",

  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "GetBloomDirect",
    title: "GetBloomDirect | The Fee-Free Florist-to-Florist Order Network",
    description:
      "Helping independent florists send orders directly, build trusted relationships, and keep more of every order.",
    url: "https://www.getbloomdirect.com",
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
      "Helping independent florists send orders directly, build trusted relationships, and keep more of every order.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}

        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#d8b4fe",
              color: "#0f172a",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "12px 16px",
              fontWeight: "600",
              textAlign: "center",
            },
            success: {
              duration: 3000,
              style: {
                background: "#059669",
                color: "#ffffff",
              },
            },
            error: {
              duration: 5000,
              style: {
                background: "#dc2626",
                color: "#ffffff",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
