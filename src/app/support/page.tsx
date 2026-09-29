import HomeFooter from "@/components/HomeFooter";
import HomeHeader from "@/components/HomeHeader";
import {
  ArrowRight,
  BookOpen,
  CircleDollarSign,
  Globe2,
  Import,
  LifeBuoy,
  Mail,
  Network,
  PlugZap,
  ShoppingBag,
} from "lucide-react";
import authOptions from "@/lib/auth";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support | GetBloomDirect",
  description:
    "Get help with GetBloomDirect and BloomWebsites setup, catalog import, payments, custom domains, florist orders, reports, and integrations.",
  alternates: {
    canonical: "/support",
  },
  openGraph: {
    type: "website",
    url: "https://www.getbloomdirect.com/support",
    siteName: "GetBloomDirect",
    title: "Support | GetBloomDirect",
    description:
      "Setup guidance, workflow help, and direct support for GetBloomDirect and BloomWebsites.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GetBloomDirect Support",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Support | GetBloomDirect",
    description:
      "Setup guidance, workflow help, and direct support for GetBloomDirect and BloomWebsites.",
    images: ["/og-image.png"],
  },
};

const bloomWebsiteTopics = [
  {
    icon: BookOpen,
    title: "Start your BloomWebsite",
    description:
      "Open the BloomWebsites workspace, review your storefront, and work through the setup needed before launch.",
    href: "/dashboard/websites",
    action: "Open BloomWebsites",
  },
  {
    icon: Import,
    title: "Products & catalog import",
    description:
      "Add products manually or use the CSV import/export tools to bring an existing catalog into Bloom.",
    href: "/dashboard/websites/products",
    action: "Open Catalog",
  },
  {
    icon: CircleDollarSign,
    title: "Payments, launch & billing",
    description:
      "Connect the supported payment setup, review launch readiness, and manage the BloomWebsites subscription used to publish.",
    href: "/dashboard/websites/launch",
    action: "Open Launch & Billing",
  },
  {
    icon: Globe2,
    title: "Custom domain",
    description:
      "Verify domain ownership, add the required DNS records, and confirm routing before sending customers to your live site.",
    href: "/dashboard/websites/domain",
    action: "Open Domain Setup",
  },
  {
    icon: PlugZap,
    title: "The Floral POS integration",
    description:
      "Configure and test the BloomWebsite order export used by supported The Floral POS workflows.",
    href: "/dashboard/websites/integrations/tfpos",
    action: "Open TFPOS Integration",
  },
];

const networkTopics = [
  {
    icon: ShoppingBag,
    title: "Send & receive florist orders",
    description:
      "Create a florist-to-florist order, review incoming orders, and manage the fulfillment workflow from your dashboard.",
    href: "/dashboard/getting-started",
    action: "View Getting Started",
  },
  {
    icon: Network,
    title: "Network, profile & settings",
    description:
      "Review your public shop information, delivery settings, payment methods, network visibility, and other shared shop settings.",
    href: "/dashboard/settings",
    action: "Open Shop Settings",
  },
];

function TopicCard({
  icon: Icon,
  title,
  description,
  href,
  action,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
        <Icon size={21} />
      </div>
      <h3 className="mt-5 text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
        {description}
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-2 text-sm font-black text-purple-700 transition hover:text-purple-900"
      >
        {action}
        <ArrowRight size={15} />
      </Link>
    </article>
  );
}

export default async function SupportPage() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="min-h-screen bg-slate-50">
      <HomeHeader isAuthenticated={isAuthenticated} />

      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-6 sm:py-24 lg:px-8">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-black text-purple-700">
              <LifeBuoy size={16} />
              GetBloomDirect Support
            </div>
            <h1 className="mt-7 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Find the right place to start.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Use the shortcuts below for common setup and workflow areas. If
              something is unclear, broken, or doesn&apos;t match what you expect,
              contact GetBloomDirect directly.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard/getting-started"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-purple-700 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-800"
              >
                <BookOpen size={17} />
                Getting Started
              </Link>
              <a
                href="mailto:getbloomdirect@gmail.com"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
              >
                <Mail size={17} />
                Email Support
              </a>
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-purple-700">
                BloomWebsites
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Website setup & operations
              </h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                {isAuthenticated
                  ? "Use these shortcuts to jump directly to the BloomWebsites area where the work is performed."
                  : "Use these shortcuts to find the right BloomWebsites area. Account tools will ask you to sign in when needed."}
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {bloomWebsiteTopics.map((topic) => (
                <TopicCard key={topic.title} {...topic} />
              ))}
            </div>

            <div className="mt-14 border-t border-slate-200 pt-14">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                GetBloomDirect Network
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                Florist network help
              </h2>
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {networkTopics.map((topic) => (
                  <TopicCard key={topic.title} {...topic} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-5 text-center sm:px-6 lg:px-8">
            <Mail className="mx-auto h-10 w-10 text-purple-700" />
            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950">
              Still need help?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Send the shop name, the page or workflow you&apos;re working in, and
              a short description of what happened. Screenshots are helpful
              when the issue is visual.
            </p>
            <a
              href="mailto:getbloomdirect@gmail.com"
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-purple-700 px-7 py-3 text-sm font-black text-white transition hover:bg-purple-800"
            >
              getbloomdirect@gmail.com
              <ArrowRight size={16} />
            </a>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
