import authOptions from "@/lib/auth";
import { getAuthenticatedShop } from "@/lib/shops/getAuthenticatedShop";
import {
  BadgeCheck,
  BookOpenCheck,
  Boxes,
  CircleDollarSign,
  Code2,
  ExternalLink,
  Globe2,
  HeartHandshake,
  MessageSquareText,
  PackageCheck,
  Palette,
  PlayCircle,
  Rocket,
  Search,
  Send,
  Settings2,
  ShoppingBag,
  Store,
  Truck,
  UserRoundCheck,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import VideoWalkthrough from "@/components/getting-started/VideoWalkthrough";

type Walkthrough = {
  title: string;
  description: string;
  topics: string[];
  icon: typeof PlayCircle;
  proOnly?: boolean;
  youtubeId?: string;
  href?: string;
  actionLabel?: string;
};

type LearningSection = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof PlayCircle;
  accentClass: string;
  walkthroughs: Walkthrough[];
};

const getBloomDirectWalkthroughs: Walkthrough[] = [
  {
    title: "Welcome to GetBloomDirect",
    description:
      "A complete introduction to the florist network, the dashboard, and the fastest way to start sending and receiving florist-to-florist orders.",
    topics: [
      "How the network works",
      "Dashboard overview",
      "Recommended first steps",
    ],
    icon: PlayCircle,
    youtubeId: "9ph-H4Yf0_A",
  },
  {
    title: "Add GetBloomDirect Payment Methods",
    description:
      "Choose how other florists can pay your shop and set the method you prefer to use by default for network orders.",
    topics: [
      "Supported payment methods",
      "Default payment method",
      "Receiving eligibility",
    ],
    icon: CircleDollarSign,
    youtubeId: "MXf6tbHtpHc",
  },
  {
    title: "Create and Send an Order",
    description:
      "Learn how delivery details generate eligible florists, how to choose a shop, and how to send a complete order.",
    topics: [
      "Recipient and delivery details",
      "Choosing a fulfilling florist",
      "Reviewing and sending",
    ],
    icon: Send,
    href: "/dashboard/new-order",
    actionLabel: "Create an order",
  },
  {
    title: "Receive and Fulfill Orders",
    description:
      "Follow the incoming-order workflow from acceptance through delivery while keeping the sending florist informed.",
    topics: [
      "Accepting or declining",
      "Order communication",
      "Completing an order",
    ],
    icon: PackageCheck,
    href: "/dashboard/incoming",
    actionLabel: "Open GBD orders",
  },
  {
    title: "Manage Fulfillment Offerings",
    description:
      "Show sending florists what your shop can create, how much it costs, and which options are currently available.",
    topics: [
      "Designer’s Choice",
      "Pricing tiers",
      "Activation and substitutions",
    ],
    icon: Boxes,
    href: "/dashboard/offerings",
    actionLabel: "Manage offerings",
  },
  {
    title: "Messaging and Notifications",
    description:
      "Keep florist-to-florist order conversations organized and understand which order updates need your attention.",
    topics: ["Order messages", "Read status", "Important order updates"],
    icon: MessageSquareText,
    href: "/dashboard/incoming",
    actionLabel: "Open GBD orders",
  },
  {
    title: "Reviews and Verification",
    description:
      "Build confidence across the network through completed orders, verified reviews, and an accurate public shop profile.",
    topics: [
      "Leaving and receiving reviews",
      "Verification progress",
      "Network trust",
    ],
    icon: BadgeCheck,
    href: "/dashboard",
    actionLabel: "View dashboard",
  },
  {
    title: "Bloom Pro",
    description:
      "Bloom Pro is the optional paid plan for GetBloomDirect network features. It is separate from a BloomWebsites subscription.",
    topics: [
      "Unlimited GBD sending",
      "Advanced reports and tools",
      "POS API integration",
    ],
    icon: HeartHandshake,
    proOnly: true,
    href: "/dashboard/upgrade",
    actionLabel: "View Bloom Pro",
  },
  {
    title: "GBD POS Integration",
    description:
      "Understand GetBloomDirect API access, incoming-order actions, webhooks, and how a connected POS can work with network orders.",
    topics: ["API credentials", "Order actions", "Webhook configuration"],
    icon: Code2,
    proOnly: true,
    href: "/dashboard/pos-integration",
    actionLabel: "Open POS integration",
  },
];

const bloomWebsiteWalkthroughs: Walkthrough[] = [
  {
    title: "BloomWebsites Overview",
    description:
      "Start here to see website readiness, preview your storefront, and jump into the major website setup areas.",
    topics: ["Website status", "Preview storefront", "Setup shortcuts"],
    icon: Globe2,
    href: "/dashboard/websites",
    actionLabel: "Open website overview",
  },
  {
    title: "Branding and Storefront Content",
    description:
      "Set your logo, colors, hero content, footer details, social links, and the customer-facing copy used throughout your storefront.",
    topics: ["Logo and colors", "Hero content", "Storefront section copy"],
    icon: Palette,
    href: "/dashboard/websites/branding",
    actionLabel: "Open Branding",
  },
  {
    title: "Products and Add-Ons",
    description:
      "Build your online catalog, configure pricing tiers, manage product images, recipes, ordering rules, add-ons, and product SEO.",
    topics: ["Products", "Pricing and recipes", "Catalog management"],
    icon: ShoppingBag,
    href: "/dashboard/websites/products",
    actionLabel: "Open Catalog",
  },
  {
    title: "Website SEO",
    description:
      "Give Bloom the facts about your shop and let the platform turn them into strong homepage, local, social, and technical SEO.",
    topics: ["Homepage SEO", "Local delivery SEO", "Search-engine settings"],
    icon: Search,
    href: "/dashboard/websites/seo",
    actionLabel: "Open SEO",
  },
  {
    title: "Website Orders",
    description:
      "Manage paid website orders, fulfillment, refunds, customer notifications, and POS-export status from one place.",
    topics: ["Order workflow", "Refunds", "TFPOS export status"],
    icon: PackageCheck,
    href: "/dashboard/websites/orders",
    actionLabel: "Open website orders",
  },
  {
    title: "Launch and Billing",
    description:
      "Review launch readiness, connect merchant payments, choose monthly or annual BloomWebsites billing, and publish when your site is ready.",
    topics: ["Readiness", "Subscription", "Going live"],
    icon: Rocket,
    href: "/dashboard/websites/launch",
    actionLabel: "Open Launch & Billing",
  },
  {
    title: "Custom Domain",
    description:
      "Connect your florist domain, verify ownership, point DNS to Bloom, and confirm routing before launch.",
    topics: ["Ownership verification", "DNS routing", "Custom-domain status"],
    icon: Globe2,
    href: "/dashboard/websites/domain",
    actionLabel: "Open Domain setup",
  },
  {
    title: "The Floral POS Integration",
    description:
      "Connect BloomWebsites to The Floral POS so paid website orders can be exported automatically or pushed manually when needed.",
    topics: ["Connection settings", "Automatic export", "Push and resend"],
    icon: Code2,
    href: "/dashboard/websites/integrations/tfpos",
    actionLabel: "Open TFPOS integration",
  },
];

const sharedWalkthroughs: Walkthrough[] = [
  {
    title: "Build Your Shared Shop Profile",
    description:
      "Maintain the business identity used across GetBloomDirect and BloomWebsites, including your public shop information and branding.",
    topics: [
      "Business details",
      "Branding and logo",
      "Public profile and verification",
    ],
    icon: Store,
    youtubeId: "1CYGDZQKci8",
  },
  {
    title: "Configure Delivery Settings",
    description:
      "Set your shop’s delivery information and review the channel-specific controls that determine how GetBloomDirect and BloomWebsites use it.",
    topics: [
      "Delivery zones",
      "Cutoff and same-day rules",
      "Blackout dates and fees",
    ],
    icon: Truck,
    youtubeId: "o29xGgZSoNE",
  },
  {
    title: "Shared Shop Settings",
    description:
      "Manage the shop information that can be reused across both products instead of maintaining duplicate business details.",
    topics: [
      "Business and contact information",
      "Shared social links",
      "Channel-specific settings",
    ],
    icon: Settings2,
    href: "/dashboard/settings",
    actionLabel: "Open Shared Settings",
  },
  {
    title: "Review Your Public Profile",
    description:
      "See how your shop appears to other florists on GetBloomDirect and confirm that the shared information customers and florists rely on is accurate.",
    topics: ["Shop identity", "Social links", "Public contact information"],
    icon: UserRoundCheck,
    href: "__PUBLIC_PROFILE__",
    actionLabel: "Open public profile",
  },
];

function LearningCard({
  walkthrough,
  index,
  publicProfileHref,
}: {
  walkthrough: Walkthrough;
  index: number;
  publicProfileHref: string;
}) {
  const Icon = walkthrough.icon;
  const href =
    walkthrough.href === "__PUBLIC_PROFILE__"
      ? publicProfileHref
      : walkthrough.href;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Icon size={24} />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            Step {index + 1}
          </span>
          {walkthrough.proOnly && (
            <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
              Bloom Pro
            </span>
          )}
        </div>
      </div>

      <h3 className="mt-5 text-lg font-bold text-gray-900">
        {walkthrough.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        {walkthrough.description}
      </p>

      <div className="mt-5 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          What this covers
        </p>
        <ul className="mt-3 space-y-2">
          {walkthrough.topics.map((topic) => (
            <li
              key={topic}
              className="flex items-start gap-2 text-sm text-gray-600"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              {topic}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-6">
        {walkthrough.youtubeId ? (
          <VideoWalkthrough
            youtubeId={walkthrough.youtubeId}
            title={walkthrough.title}
          />
        ) : href ? (
          <Link
            href={href}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            {walkthrough.actionLabel || "Open this area"}
            <ExternalLink size={16} />
          </Link>
        ) : (
          <div className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500">
            <PlayCircle size={18} />
            Guide coming soon
          </div>
        )}
      </div>
    </article>
  );
}

export default async function GettingStartedPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const shop = await getAuthenticatedShop(session.user.id);

  if (!shop) {
    redirect("/login");
  }

  if (shop.isSuspended) {
    redirect("/dashboard");
  }

  const sections: LearningSection[] = [
    {
      id: "getbloomdirect",
      eyebrow: "Florist-to-florist network",
      title: "GetBloomDirect",
      description:
        "Learn the network workflows used to send orders, receive work from other florists, manage offerings, and get more from Bloom Pro.",
      icon: Send,
      accentClass: "bg-emerald-100 text-emerald-700",
      walkthroughs: getBloomDirectWalkthroughs,
    },
    {
      id: "bloomwebsites",
      eyebrow: "Your ecommerce website",
      title: "BloomWebsites",
      description:
        "Build, manage, launch, and operate your florist website without needing to become a web developer or SEO expert.",
      icon: Globe2,
      accentClass: "bg-purple-100 text-purple-700",
      walkthroughs: bloomWebsiteWalkthroughs,
    },
    {
      id: "shared",
      eyebrow: "Used across Bloom",
      title: "Shared Setup",
      description:
        "Keep core shop information accurate once and understand which settings are shared between GetBloomDirect and BloomWebsites.",
      icon: Settings2,
      accentClass: "bg-amber-100 text-amber-700",
      walkthroughs: sharedWalkthroughs,
    },
  ];

  const allWalkthroughs = sections.flatMap((section) => section.walkthroughs);
  const availableVideos = allWalkthroughs.filter(
    (walkthrough) => walkthrough.youtubeId,
  ).length;

  return (
    <main className="pb-10">
      <div className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-8 sm:px-6 lg:px-0">
        <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                <BookOpenCheck size={16} />
                Bloom Learning Center
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Start with the product you&apos;re working on.
              </h1>
              <p className="mt-4 text-base leading-7 text-gray-600 sm:text-lg">
                GetBloomDirect and BloomWebsites are separate products that share
                important shop information. Choose a section below for focused
                guidance instead of sorting through one giant setup list.
              </p>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700 sm:h-28 sm:w-28">
              <PlayCircle size={52} strokeWidth={1.6} />
            </div>
          </div>
        </section>

        <section className="sticky top-0 z-30 -mx-4 grid gap-2 border-y border-gray-200 bg-emerald-50/95 px-4 py-3 shadow-sm backdrop-blur sm:-mx-6 sm:px-6 md:grid-cols-3 lg:mx-0 lg:rounded-2xl lg:border lg:px-3">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="group rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-purple-200 hover:bg-purple-50/40"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${section.accentClass}`}
                  >
                    <Icon size={19} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 sm:text-xs">
                      {section.eyebrow}
                    </p>
                    <h2 className="mt-0.5 text-base font-bold text-gray-900 group-hover:text-purple-700 sm:text-lg">
                      {section.title}
                    </h2>
                    <p className="mt-0.5 hidden text-xs leading-5 text-gray-500 sm:block">
                      {section.walkthroughs.length} setup topics
                    </p>
                  </div>
                </div>
              </a>
            );
          })}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{availableVideos}</p>
            <p className="text-sm text-gray-500">Videos available now</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">
              {allWalkthroughs.length}
            </p>
            <p className="text-sm text-gray-500">Guided setup topics</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">3</p>
            <p className="text-sm text-gray-500">Clearly separated areas</p>
          </div>
        </section>

        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-32"
            >
              <div className="mb-5 flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${section.accentClass}`}
                >
                  <Icon size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    {section.eyebrow}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-gray-900">
                    {section.title}
                  </h2>
                  <p className="mt-1 max-w-3xl text-gray-600">
                    {section.description}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {section.walkthroughs.map((walkthrough, index) => (
                  <LearningCard
                    key={walkthrough.title}
                    walkthrough={walkthrough}
                    index={index}
                    publicProfileHref={`/dashboard/shops/${shop.slug}`}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <section className="rounded-2xl border border-purple-100 bg-purple-50 p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-purple-950">
                Still need a hand?
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-purple-800">
                If a workflow is unclear or something does not behave as
                expected, open Support and we&apos;ll point you in the right
                direction.
              </p>
            </div>
            <Link
              href="/support"
              className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
            >
              <HeartHandshake size={20} />
              Open Support
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
