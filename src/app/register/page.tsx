import Link from "next/link";
import { areNewBloomWebsiteActivationsPaused, isPrelaunchHoldEnabled } from "@/lib/prelaunchHold";
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

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ earlyAccess?: string }> }) {
  const { earlyAccess } = await searchParams;
  const hasInvitation = typeof earlyAccess === "string" && /^[0-9a-f]{64}$/.test(earlyAccess);
  if (isPrelaunchHoldEnabled() && !hasInvitation) {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">BloomWebsites & GetBloomDirect</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">New registrations are temporarily paused</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">We're preparing the next release and aren't accepting new accounts right now. Existing florist accounts and active websites remain available.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="rounded-xl bg-emerald-700 px-6 py-3 font-semibold text-white hover:bg-emerald-800">Existing florist? Sign in</Link>
          <Link href="/contact" className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-800 hover:bg-slate-50">Contact us</Link>
        </div>
      </main>
    );
  }
  return (
    <>
      {areNewBloomWebsiteActivationsPaused() && (
        <div role="status" className="mx-auto mt-6 max-w-3xl rounded-xl border border-purple-200 bg-purple-50 px-5 py-4 text-sm text-purple-950">
          <strong>BloomWebsites early access:</strong> Register free, build and preview your website now. New website publishing and paid website activations are coming soon.
        </div>
      )}
      <RegisterClient earlyAccessToken={hasInvitation ? earlyAccess : ""} />
    </>
  );
}