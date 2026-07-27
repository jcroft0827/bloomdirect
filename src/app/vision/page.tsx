// /app/vision/page.tsx

import HomeFooter from "@/components/HomeFooter";
import HomeHeader from "@/components/HomeHeader";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Globe2,
  HeartHandshake,
  Lightbulb,
  Map,
  MessageSquareText,
  Network,
  Rocket,
  Sparkles,
  Store,
} from "lucide-react";
import type { Metadata } from "next";

const siteUrl = "https://www.getbloomdirect.com";
const pageUrl = `${siteUrl}/vision`;

export const metadata: Metadata = {
  title: "Our Vision: The Future of Independent Florist Technology | GetBloomDirect",

  description:
    "Explore the GetBloomDirect vision for a florist-first technology platform, including direct ordering, regional network growth, Bloom Websites, mobile tools, delivery solutions, and business insights.",

  keywords: [
    "future of florist technology",
    "florist software platform",
    "independent florist technology",
    "florist order network",
    "florist website platform",
    "Bloom Websites",
    "florist business software",
    "GetBloomDirect roadmap",
  ],

  alternates: {
    canonical: "/vision",
  },

  openGraph: {
    type: "website",
    url: pageUrl,
    siteName: "GetBloomDirect",
    title: "The GetBloomDirect Vision",
    description:
      "See how GetBloomDirect is building a florist-first technology platform shaped by independent flower shops.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "The GetBloomDirect vision for independent florist technology",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "The GetBloomDirect Vision",
    description:
      "A florist-first technology platform being built with independent flower shops.",
    images: ["/og-image.png"],
  },
};

const liveFeatures = [
  "Fee-free florist-to-florist ordering",
  "Free public florist profiles",
  "Unlimited receiving for all shops",
  "Verified florist profiles and reviews",
  "Order messaging and status updates",
  "Flexible fulfillment offerings",
  "Bloom Pro subscriptions",
  "Reporting, Favorite Florists, and POS API access",
];

const phases = [
  {
    label: "Now",
    title: "Strengthen the Foundation",
    description:
      "Refine the platform already serving florists and make every part of the experience more dependable, intuitive, and useful.",
    icon: Sparkles,
    items: [
      "Simpler onboarding and shop readiness",
      "Improved notifications and support workflows",
      "Expanded reporting and account visibility",
      "Continued reliability, security, and performance improvements",
    ],
  },
  {
    label: "Next",
    title: "Grow the Florist Network",
    description:
      "Build strong regional florist communities where shops can confidently send and fulfill orders through trusted direct relationships.",
    icon: Network,
    items: [
      "Founder-led florist onboarding",
      "Regional network growth beginning in Western New York",
      "Referral and testimonial programs",
      "Better shop discovery and regional network insights",
    ],
  },
  {
    label: "Expanding",
    title: "Improve Daily Florist Operations",
    description:
      "Develop practical tools that help florists save time, communicate clearly, and operate more efficiently.",
    icon: BarChart3,
    items: [
      "Advanced florist reporting and business insights",
      "Expanded integrations and POS connectivity",
      "Improved order workflows and order types",
      "Additional delivery and fulfillment tools",
    ],
  },
  {
    label: "Future",
    title: "Introduce Bloom Websites",
    description:
      "Create modern florist websites that connect naturally with the broader GetBloomDirect network and platform.",
    icon: Globe2,
    items: [
      "Beautiful florist-focused websites",
      "Online product and order management",
      "Delivery zone and fulfillment integration",
      "Hosting, search visibility, and business growth tools",
    ],
  },
  {
    label: "Long-Term",
    title: "Build the Florist Technology Platform",
    description:
      "Continue expanding into a connected suite of tools designed around the real needs of independent florists.",
    icon: Rocket,
    items: [
      "Florist mobile applications",
      "Driver and delivery tools",
      "Advanced analytics and business intelligence",
      "New services shaped by florist feedback",
    ],
  },
];

const principles = [
  {
    title: "Florist First",
    description:
      "Every important decision should help independent florists protect their relationships, improve their business, or save valuable time.",
    icon: Store,
  },
  {
    title: "Built Through Conversation",
    description:
      "The strongest product ideas come from listening to shop owners and understanding how their businesses work every day.",
    icon: MessageSquareText,
  },
  {
    title: "Direct Relationships",
    description:
      "Technology should strengthen relationships between florists instead of standing between them.",
    icon: HeartHandshake,
  },
  {
    title: "Practical Innovation",
    description:
      "We will prioritize useful solutions to real florist problems rather than adding technology simply because we can.",
    icon: Lightbulb,
  },
];

export default function VisionPage() {
  const organizationId = `${siteUrl}/#organization`;

  const visionJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${pageUrl}/#webpage`,
    url: pageUrl,
    name: "The GetBloomDirect Vision",
    headline: "Building the future of independent florist technology.",
    description:
      "The long-term GetBloomDirect vision for a florist-first technology platform built around direct relationships, practical tools, and independent flower shops.",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "GetBloomDirect",
      url: siteUrl,
    },
    about: {
      "@id": organizationId,
    },
    publisher: {
      "@id": organizationId,
    },
    inLanguage: "en-US",
  };

  return (
    <>
      <script 
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(visionJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="min-h-screen bg-gray-50">
        <HomeHeader />

        <main>
          <section className="relative overflow-hidden border-b border-gray-200 bg-white">
            <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-purple-50 to-transparent" />

            <div className="relative mx-auto max-w-7xl px-6 py-24 text-center sm:py-32 lg:px-10">
              <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-bold text-purple-700">
                <Map className="h-4 w-4" />
                The GetBloomDirect Vision
              </div>

              <h1 className="mx-auto mt-8 max-w-5xl text-5xl font-black tracking-tight text-gray-950 sm:text-6xl lg:text-7xl">
                Building the future of independent florist technology.
              </h1>

              <p className="mx-auto mt-8 max-w-3xl text-xl leading-9 text-gray-600">
                GetBloomDirect began with a simple idea: independent florists
                should be able to work directly with one another without losing
                order value or control of their relationships.
              </p>

              <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-gray-600">
                Today, we are building much more than an order network. We are
                building a florist-first technology platform shaped by real
                conversations, practical needs, and a shared belief that
                independent flower shops deserve better tools.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-purple-700"
                >
                  Join the Network
                  <ArrowRight className="h-5 w-5" />
                </Link>

                <Link
                  href="/#features"
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-8 py-4 text-lg font-bold text-gray-800 transition hover:border-purple-300 hover:text-purple-700"
                >
                  Explore Current Features
                </Link>
              </div>
            </div>
          </section>

          <section className="bg-gray-950 py-24 text-white">
            <div className="mx-auto max-w-7xl px-6 lg:px-10">
              <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-green-400">
                    Available Today
                  </p>

                  <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                    The foundation is already live.
                  </h2>

                  <p className="mt-6 max-w-xl text-lg leading-8 text-gray-300">
                    GetBloomDirect is not a future concept. Florists can already
                    create accounts, build profiles, connect with other shops, and
                    send and receive orders directly.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {liveFeatures.map((feature) => (
                    <div
                      key={feature}
                      className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-5"
                    >
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-400/15">
                        <Check className="h-4 w-4 text-green-400" />
                      </div>
                      <p className="font-semibold leading-7 text-gray-100">
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-gray-50 py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-10">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-purple-600">
                  Where We Are Heading
                </p>

                <h2 className="mt-5 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
                  A platform that grows alongside florists.
                </h2>

                <p className="mt-6 text-lg leading-8 text-gray-600">
                  This vision represents our direction, not a collection of rigid
                  deadlines. Priorities will continue evolving as we listen to
                  florists and learn what creates the greatest value.
                </p>
              </div>

              <div className="mt-16 space-y-8">
                {phases.map((phase, index) => {
                  const Icon = phase.icon;

                  return (
                    <article
                      key={phase.title}
                      className="grid overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm lg:grid-cols-[280px_1fr]"
                    >
                      <div className="flex flex-col justify-between bg-gray-950 p-8 text-white">
                        <div>
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600">
                            <Icon className="h-7 w-7" />
                          </div>

                          <p className="mt-8 text-sm font-black uppercase tracking-[0.2em] text-green-400">
                            Phase {index + 1}
                          </p>

                          <p className="mt-2 text-2xl font-black">
                            {phase.label}
                          </p>
                        </div>
                      </div>

                      <div className="p-8 sm:p-10">
                        <h3 className="text-3xl font-black tracking-tight text-gray-950">
                          {phase.title}
                        </h3>

                        <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-600">
                          {phase.description}
                        </p>

                        <div className="mt-8 grid gap-4 md:grid-cols-2">
                          {phase.items.map((item) => (
                            <div
                              key={item}
                              className="flex gap-3 rounded-2xl bg-gray-50 p-4"
                            >
                              <Check className="mt-0.5 h-5 w-5 shrink-0 text-purple-600" />
                              <p className="font-semibold leading-7 text-gray-800">
                                {item}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="bg-white py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-10">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-green-600">
                  How We Build
                </p>

                <h2 className="mt-5 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
                  Built with florists, not around them.
                </h2>
              </div>

              <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {principles.map((principle) => {
                  const Icon = principle.icon;

                  return (
                    <article
                      key={principle.title}
                      className="rounded-3xl border border-gray-200 bg-gray-50 p-7"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                        <Icon className="h-6 w-6" />
                      </div>

                      <h3 className="mt-6 text-xl font-black text-gray-950">
                        {principle.title}
                      </h3>

                      <p className="mt-3 leading-7 text-gray-600">
                        {principle.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="overflow-hidden bg-purple-700">
            <div className="mx-auto grid max-w-7xl gap-10 px-6 py-24 text-white lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-purple-200">
                  Help Shape What Comes Next
                </p>

                <h2 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
                  The future of GetBloomDirect starts with florist conversations.
                </h2>

                <p className="mt-6 max-w-3xl text-lg leading-8 text-purple-100">
                  Every suggestion helps us understand what independent florists
                  need from their technology. Join the network, explore the
                  platform, and tell us what would make your business stronger.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-lg font-bold text-purple-700 transition hover:bg-purple-50"
                >
                  Create a Free Account
                  <ArrowRight className="h-5 w-5" />
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/30 px-8 py-4 text-lg font-bold text-white transition hover:bg-white/10"
                >
                  Share Your Feedback
                </Link>
              </div>
            </div>
          </section>
        </main>

        <HomeFooter />
      </div>
    </>
  );
}
