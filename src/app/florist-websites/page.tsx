import type { Metadata } from "next";
import Link from "next/link";
import HomeHeader from "@/components/HomeHeader";
import HomeFooter from "@/components/HomeFooter";

export const metadata: Metadata = {
  title: "Florist Website Builder | BloomWebsites",
  description: "Create and preview a florist website with product galleries, delivery and pickup, branding, and online ordering tools. Free to build; publishing coming soon.",
  keywords: ['florist website builder', 'websites for florists', 'florist website design'],
  alternates: { canonical: "/florist-websites" },
  openGraph: {
    title: "Florist Website Builder | BloomWebsites",
    description: "Create and preview a florist website with product galleries, delivery and pickup, branding, and online ordering tools. Free to build; publishing coming soon.",
    url: "https://www.getbloomdirect.com/florist-websites",
    type: "website",
  },
};

export default function Page() {
  return (
    <>
      <HomeHeader />
      <main className="bg-slate-50">
        <section className="bg-gradient-to-b from-purple-50 to-white px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="font-black uppercase tracking-[0.2em] text-purple-700">BloomWebsites by GetBloomDirect</p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">A florist website builder made for independent flower shops</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">Create a floral storefront that reflects your shop and supports how florists actually work—from products and price tiers to delivery, pickup, and order management. Build and preview for free while new publishing is paused.</p>
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
              Early access: Build and preview your florist website free today. New publishing and paid activations are temporarily paused.
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="rounded-2xl bg-purple-700 px-6 py-3 font-bold text-white hover:bg-purple-800">Start building free</Link>
              <Link href="/contact" className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-900 hover:bg-slate-100">Ask a question</Link>
            </div>
          </div>
        </section>
        <div className="mx-auto grid max-w-5xl gap-5 px-5 py-12">
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <h2 className="text-2xl font-black tracking-tight text-slate-950">A website built around your flower shop</h2>
        <p className="mt-4 leading-7 text-slate-700">Display arrangements with photos, clear descriptions, and Standard, Deluxe, and Premium choices. Organize products for occasions and make it easier for shoppers to find flowers for important moments.</p>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Make your storefront feel like your brand</h2>
        <p className="mt-4 leading-7 text-slate-700">Customize your logo, colors, homepage banners and content. Choose from Bloom Classic or Bloom Atelier and preview your design on desktop and mobile before publishing.</p>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Built for florist operations, not generic online stores</h2>
        <p className="mt-4 leading-7 text-slate-700">BloomWebsites includes delivery and pickup checkout workflows, card messages, optional tipping, promotional codes, tax settings and florist order management. Features are subject to merchant configuration and launch readiness.</p>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Build now, switch when you're ready</h2>
        <p className="mt-4 leading-7 text-slate-700">You can prepare your catalogue and storefront without cancelling your current website. We recommend testing your payment, domain, and order workflows before any future cutover.</p>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Transparent pricing</h2>
        <p className="mt-4 leading-7 text-slate-700">BloomWebsites Standard is planned at $129 per month or $1,349 annually, with no Bloom per-order fee. Payment processor charges still apply when a store goes live. New subscriptions and publishing are currently paused.</p>
      </section>
          <section className="rounded-3xl bg-purple-950 p-7 text-white sm:p-10">
            <h2 className="text-2xl font-black">Explore the BloomWebsites builder</h2>
            <p className="mt-3 leading-7 text-purple-100">Create your products, personalize your storefront, and preview your design. Keep your current website running while you prepare.</p>
            <div className="mt-6 flex flex-wrap gap-5">
              <Link href="/register" className="font-bold text-white underline underline-offset-4">Build your site</Link>
              <Link href="/switch-florist-website" className="font-bold text-white underline underline-offset-4">Switching providers?</Link>
              <Link href="/blog" className="font-bold text-white underline underline-offset-4">Florist guides</Link>
              <Link href="/florist-websites" className="font-bold text-white underline underline-offset-4">Website builder features</Link>
              <Link href="/florist-ecommerce" className="font-bold text-white underline underline-offset-4">Ecommerce features</Link>
            </div>
          </section>
        </div>
      </main>
      <HomeFooter />
    </>
  );
}
