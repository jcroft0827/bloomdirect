// src/app/dashboard/websites/page.tsx

import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Globe2,
  Palette,
  PlugZap,
  Search,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";
import CreateWebsiteButton from "@/components/websites/CreateWebsiteButton";

type ShopLean = {
  businessName: string;
  isSuspended?: boolean;
};

type BloomWebsiteLean = {
  _id: {
    toString(): string;
  };
  previewSlug: string;
  siteName: string;
  status: "preview" | "live" | "paused";
  customDomain?: string;
};

export default async function WebsitesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDB();

  const shop = (await Shop.findById(session.user.id)
    .select("businessName isSuspended")
    .lean()) as ShopLean | null;

  if (!shop) {
    redirect("/login");
  }

  const website = (await BloomWebsite.findOne({
    shop: session.user.id,
  })
    .select("_id previewSlug siteName status customDomain")
    .lean()) as BloomWebsiteLean | null;

  /*
   * Existing website:
   *
   * This is intentionally a lightweight management
   * screen for milestone one. Website editing, products,
   * domains and launch setup come next.
   */
  if (website) {
    return (
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-purple-600">
            BloomWebsites
          </p>

          <div className="mt-2 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                {website.status === "live"
                  ? "Your website is live."
                  : website.status === "paused"
                    ? "Your website is paused."
                    : "Your website is ready to grow."}
              </h1>

              <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
                {website.status === "live"
                  ? "Your BloomWebsite is public. Keep managing products, branding, and launch settings from here."
                  : website.status === "paused"
                    ? "Your public storefront is temporarily unavailable. Review launch readiness before resuming it."
                    : "Your BloomWebsite has been created. Preview your storefront, then continue building it until you&apos;re ready to go live."}
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-bold text-purple-800">
              <CheckCircle2 size={17} />
              {website.status === "live"
                ? "Live"
                : website.status === "paused"
                  ? "Paused"
                  : "Preview"}
            </span>
          </div>
        </div>

        <section className="overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-purple-950 via-purple-800 to-purple-700 p-7 text-white sm:p-9">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <Globe2 size={28} />
            </div>

            <h2 className="mt-6 text-2xl font-black sm:text-3xl">
              {website.siteName}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-purple-100 sm:text-base">
              Your personalized storefront is waiting. This preview is private
              to your BloomWebsite workflow until you complete setup and launch.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {website.status === "live" && website.customDomain ? (
                <a
                  href={`https://${website.customDomain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-purple-800 transition hover:bg-purple-50"
                >
                  View Live Website
                  <ExternalLink size={17} />
                </a>
              ) : (
                <Link
                  href={`/websites/preview/${website.previewSlug}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-purple-800 transition hover:bg-purple-50"
                >
                  Preview Website
                  <ExternalLink size={17} />
                </Link>
              )}

              <Link
                href={`/dashboard/websites/launch?website=${website._id.toString()}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
              >
                {website.status === "live"
                  ? "Manage Launch"
                  : website.status === "paused"
                    ? "Review & Resume"
                    : "Go Live"}
                <ArrowRight size={17} />
              </Link>

              <Link
                href="/dashboard/websites/branding"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
              >
                Edit Branding
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>

          <div className="grid gap-px bg-gray-200 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/dashboard/websites/branding"
              className="group bg-white p-6 transition hover:bg-purple-50/50"
            >
              <Palette className="text-purple-700" size={23} />

              <div className="mt-3 flex items-center gap-2">
                <p className="font-bold text-gray-950">Branding</p>

                <ArrowRight
                  size={15}
                  className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-purple-700"
                />
              </div>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Customize your logo, colors, tagline and hero image.
              </p>
            </Link>

            <Link
              href="/dashboard/websites/about"
              className="group bg-white p-6 transition hover:bg-purple-50/50"
            >
              <BookOpenText className="text-purple-700" size={23} />

              <div className="mt-3 flex items-center gap-2">
                <p className="font-bold text-gray-950">About Page</p>
                <ArrowRight
                  size={15}
                  className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-purple-700"
                />
              </div>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Tell your story yourself or let Bloom draft polished copy from your shop details.
              </p>
            </Link>

            <Link
              href="/dashboard/websites/seo"
              className="group bg-white p-6 transition hover:bg-purple-50/50"
            >
              <Search className="text-purple-700" size={23} />

              <div className="mt-3 flex items-center gap-2">
                <p className="font-bold text-gray-950">SEO</p>
                <ArrowRight
                  size={15}
                  className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-purple-700"
                />
              </div>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Manage homepage search previews, local business details, hours, and search-engine verification.
              </p>
            </Link>

            <Link
              href="/dashboard/websites/products"
              className="group bg-white p-6 transition hover:bg-purple-50/50"
            >
              <ShoppingBag className="text-purple-700" size={23} />

              <div className="mt-3 flex items-center gap-2">
                <p className="font-bold text-gray-950">Products</p>
                <ArrowRight
                  size={15}
                  className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-purple-700"
                />
              </div>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Manage products, pricing tiers, images, categories, and availability.
              </p>
            </Link>

            <Link
              href="/dashboard/websites/orders"
              className="group bg-white p-6 transition hover:bg-purple-50/50"
            >
              <ClipboardList className="text-purple-700" size={23} />

              <div className="mt-3 flex items-center gap-2">
                <p className="font-bold text-gray-950">Website Orders</p>
                <ArrowRight
                  size={15}
                  className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-purple-700"
                />
              </div>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Review paid customer orders, fulfillment, refunds, and status updates.
              </p>
            </Link>

            <Link
              href="/dashboard/websites/reports"
              className="group bg-white p-6 transition hover:bg-purple-50/50"
            >
              <BarChart3 className="text-purple-700" size={23} />

              <div className="mt-3 flex items-center gap-2">
                <p className="font-bold text-gray-950">Reports</p>
                <ArrowRight
                  size={15}
                  className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-purple-700"
                />
              </div>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Review sales, refunds, tax, tips, fulfillment, and product performance.
              </p>
            </Link>

            <Link
              href={`/dashboard/websites/launch?website=${website._id.toString()}`}
              className="group bg-white p-6 transition hover:bg-purple-50/50"
            >
              <Sparkles className="text-purple-700" size={23} />

              <div className="mt-3 flex items-center gap-2">
                <p className="font-bold text-gray-950">
                  {website.status === "live"
                    ? "Manage Launch"
                    : website.status === "paused"
                      ? "Resume Website"
                      : "Go Live"}
                </p>
                <ArrowRight
                  size={15}
                  className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-purple-700"
                />
              </div>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Review authoritative launch readiness and manage public website status.
              </p>
            </Link>

            <Link
              href="/dashboard/websites/integrations/tfpos"
              className="group bg-white p-6 transition hover:bg-purple-50/50"
            >
              <PlugZap className="text-purple-700" size={23} />

              <div className="mt-3 flex items-center gap-2">
                <p className="font-bold text-gray-950">The Floral POS</p>
                <ArrowRight
                  size={15}
                  className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-purple-700"
                />
              </div>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Configure FTP, FTPS, or SFTP order delivery into TFPOS.
              </p>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  /*
   * No website yet:
   *
   * This is the BloomWebsites discovery experience.
   * The actual Create button will be wired in through
   * a small client component in the next step.
   */
  return (
    <div className="mx-auto max-w-6xl">
      <section className="relative overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-purple-100 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-green-100 blur-3xl" />

        <div className="relative grid gap-10 p-7 sm:p-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:p-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1.5 text-sm font-bold text-purple-800">
              <Sparkles size={16} />
              Introducing BloomWebsites
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
              Your flower shop deserves a website built like a flower shop.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 sm:text-lg">
              We already know your business. BloomWebsites can use your
              GetBloomDirect shop profile to create a personalized storefront
              you can preview for free.
            </p>

            <div className="mt-8">
              <CreateWebsiteButton />
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-gray-50 p-6 shadow-inner sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <Globe2 size={23} />
              </div>

              <div>
                <p className="font-black text-gray-950">{shop.businessName}</p>
                <p className="text-sm text-gray-500">
                  Your website starts here
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {[
                "Your existing shop identity",
                "Your logo and brand colors",
                "A florist-specific storefront",
                "Free personalized preview",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm"
                >
                  <CheckCircle2 size={19} className="shrink-0 text-green-600" />
                  <span className="text-sm font-semibold text-gray-700">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
