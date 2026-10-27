import type { Metadata } from "next";
import Link from "next/link";
import HomeHeader from "@/components/HomeHeader";
import HomeFooter from "@/components/HomeFooter";

export const metadata: Metadata = {
  title: "Florist Ecommerce Websites & Online Ordering | BloomWebsites",
  description: "Explore ecommerce websites for flower shops with floral product tiers, delivery and pickup, tipping, tax tools, and order management. Build your preview free.",
  keywords: ['florist ecommerce', 'flower shop online ordering', 'flower shop website'],
  alternates: { canonical: "/florist-ecommerce" },
  openGraph: {
    title: "Florist Ecommerce Websites & Online Ordering | BloomWebsites",
    description: "Explore ecommerce websites for flower shops with floral product tiers, delivery and pickup, tipping, tax tools, and order management. Build your preview free.",
    url: "https://www.getbloomdirect.com/florist-ecommerce",
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
            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Florist ecommerce built for selling flowers online</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">An online flower shop has different needs from a typical retail store. BloomWebsites is designed to bring the storefront and the day-to-day florist order workflow together.</p>
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
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Products that match how florists sell</h2>
        <p className="mt-4 leading-7 text-slate-700">Offer arrangements with size and price tiers, optional add-ons, occasion categories, and product photography. Help customers choose the right flowers without needing to call the shop.</p>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Delivery and pickup checkout</h2>
        <p className="mt-4 leading-7 text-slate-700">Set delivery options, receive card messages, handle pickup details and requested time windows, and keep recipient and purchaser information organized for fulfillment.</p>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Payments, tips, and promotions</h2>
        <p className="mt-4 leading-7 text-slate-700">BloomWebsites supports merchant-controlled payment settings, optional gratuities and coupon workflows. Taxability and applicable charges depend on shop configuration and local requirements. Test the complete flow before launching.</p>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Orders and notifications</h2>
        <p className="mt-4 leading-7 text-slate-700">Florists can review paid orders and communicate status updates. Available integration workflows include tested order export to The Floral POS; compatibility and financial mapping should be validated for each participating shop.</p>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Plan for an orderly launch</h2>
        <p className="mt-4 leading-7 text-slate-700">Build and preview your store before switching from your current provider. New BloomWebsites publication and subscriptions are temporarily paused while we complete release preparation.</p>
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
