"use client";

import {
  Bot,
  Check,
  ChevronDown,
  CircleDollarSign,
  Cloud,
  Code2,
  Compass,
  Flower2,
  Globe2,
  LayoutDashboard,
  Link2,
  Network,
  PackageCheck,
  Rocket,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";

type Phase = "foundation" | "growth" | "platform" | "destination";
type Filter = "all" | Phase;

type RoadmapMilestone = {
  id: string;
  period: string;
  title: string;
  phase: Phase;
  badge: string;
  summary: string;
  groups: {
    title?: string;
    items: string[];
  }[];
  icon: typeof Flower2;
};

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Full Vision" },
  { value: "foundation", label: "Foundation" },
  { value: "growth", label: "Growth" },
  { value: "platform", label: "Platform" },
  { value: "destination", label: "Destination" },
];

const milestones: RoadmapMilestone[] = [
  {
    id: "2025-origin",
    period: "August–December 2025",
    title: "The Beginning",
    phase: "foundation",
    badge: "Origin",
    icon: Flower2,
    summary:
      "GetBloomDirect begins as a better way for independent florists to send work directly to one another without traditional wire-service fees.",
    groups: [
      {
        items: [
          "Define the florist-to-florist network and the fee-free philosophy.",
          "Establish the core shop, order, delivery, payment-method, messaging, review, and directory concepts.",
          "Choose the initial platform stack and begin building the production foundation.",
          "Adopt the founding principle: software should quietly help florists do their jobs better.",
        ],
      },
    ],
  },
  {
    id: "2026-foundation",
    period: "January–July 2026",
    title: "Build the Real Network",
    phase: "foundation",
    badge: "Product Foundation",
    icon: Network,
    summary:
      "The concept becomes a real production platform with the infrastructure florists need to send, receive, fulfill, and manage orders.",
    groups: [
      {
        title: "Network and florist experience",
        items: [
          "Launch onboarding, verification, public profiles, reviews, messaging, search, delivery configuration, outside-network orders, and notifications.",
          "Build fulfillment offerings, Designer’s Choice, pricing tiers, tax settings, substitutions, and product notes.",
          "Launch Bloom Free and Bloom Pro with sending limits, advanced offerings, favorites, reports, priority visibility, badges, and POS API access.",
          "Create the public marketing site, legal pages, SEO assets, and the long-term Bloom vision.",
        ],
      },
      {
        title: "Operations and infrastructure",
        items: [
          "Simplify the order lifecycle so orders track flowers while settlements track money.",
          "Add refunds, partial refunds, void history, audit records, order badges, and filters.",
          "Build Stripe subscriptions, admin overview, website verification, customer-success workflows, billing visibility, and spam-account controls.",
          "Strengthen authentication, email verification, password reset planning, suspension behavior, S3 assets, security, and production operations.",
        ],
      },
    ],
  },
  {
    id: "2026-execution",
    period: "August–December 2026",
    title: "Polish, Integrate, and Generate Revenue",
    phase: "foundation",
    badge: "Current Execution",
    icon: Rocket,
    summary:
      "Finish the product experience, establish the first deep POS partnership, and launch Bloom Websites as the near-term recurring-revenue engine.",
    groups: [
      {
        title: "GetBloomDirect polish",
        items: [
          "Rebuild navigation around Orders, Network, Business, Getting Started, and Support.",
          "Add a dismissible dashboard walkthrough and a complete video-based Getting Started center.",
          "Improve loading, empty, success, florist-selection, and order-entry states.",
          "Create the Network directory and allow orders to begin directly from a florist profile or directory card.",
          "Clean the folder structure and complete a first-time-user launch-readiness review.",
        ],
      },
      {
        title: "POS API V1",
        items: [
          "Incoming orders: receive, accept or decline, and mark delivered in the POS.",
          "Outgoing orders begin with recipient location and delivery date and time data.",
          "GBD returns only eligible fulfilling florists for that delivery.",
          "The POS selects a florist, loads up to ten active offerings, and supports multiple offerings and quantities.",
          "Require confirmed customer payment, a positive total, valid offering IDs and tiers, and final server validation before sending.",
          "Plan and launch the production integration with The Floral POS.",
        ],
      },
      {
        title: "Bloom Websites V1",
        items: [
          "Build professional florist websites as quickly as quality allows.",
          "Include catalog management, online ordering, branding, delivery rules, and payments.",
          "Target the first group of approximately twenty websites and roughly $2,000 in monthly recurring revenue.",
          "Use business revenue to reduce dependence on unstable employment and create greater family security.",
        ],
      },
    ],
  },
  {
    id: "2027-growth",
    period: "2027",
    title: "Prove the Business Model",
    phase: "growth",
    badge: "Growth",
    icon: CircleDollarSign,
    summary:
      "Turn the products into a repeatable company by proving acquisition, onboarding, retention, support, and sustainable recurring revenue.",
    groups: [
      {
        items: [
          "Sell and launch Bloom Websites consistently while continuing to grow the florist network.",
          "Build repeatable outreach, onboarding, support, billing, customer-success, retention, and referral systems.",
          "Expand GetBloomDirect participation through website customers, florist relationships, and POS partnerships.",
          "Complete reports with refunds, net totals, exports, printing, saved views, and operational insights.",
          "Strengthen marketing with demos, educational videos, social content, sales materials, SEO, and florist success stories.",
          "Validate the economics of Free, Pro, websites, payment processing, and future paid services without abandoning fee-free florist-to-florist orders.",
        ],
      },
    ],
  },
  {
    id: "2028-catalog",
    period: "2028",
    title: "One Bloom Catalog",
    phase: "growth",
    badge: "Shared Source of Truth",
    icon: Link2,
    summary:
      "Products stop belonging to one application. They become shared Bloom catalog items that can appear on every approved sales and fulfillment channel.",
    groups: [
      {
        title: "Catalog channels",
        items: [
          "Bloom Websites supports unlimited storefront products.",
          "GBD Pro retains its standalone offering limit for customers who only use GetBloomDirect.",
          "Florists using both Bloom Websites and GBD may link their catalog and unlock unlimited linked GBD offerings.",
          "Each item receives channel controls for Website, GetBloomDirect, POS, Customer Marketplace, seasonal campaigns, and future applications.",
        ],
      },
      {
        title: "Enter once, reuse everywhere",
        items: [
          "Reuse business information, branding, delivery rules, business hours, products, pricing, images, and availability across Bloom products.",
          "Allow florists to manage product data once instead of recreating it in every system.",
          "Preserve channel-specific rules without duplicating the core catalog record.",
        ],
      },
    ],
  },
  {
    id: "2029-platform",
    period: "2029",
    title: "The Florist Operating Platform",
    phase: "platform",
    badge: "Platform",
    icon: Cloud,
    summary:
      "Bloom becomes shared operational infrastructure connecting websites, GetBloomDirect, POS partners, catalogs, reporting, customers, and delivery rules.",
    groups: [
      {
        items: [
          "Unify identity, billing, catalog, customer records, delivery rules, reporting, notifications, reviews, and integrations across Bloom products.",
          "Allow approved POS systems to pull a florist’s complete Bloom catalog through a Sync Catalog action.",
          "Create new POS items, update changed products, deactivate retired items, and preserve POS-specific accounting and inventory fields.",
          "Support reliable IDs, versioning, conflict rules, webhooks, change logs, and safe re-syncing.",
          "Begin with Bloom-to-POS synchronization and evaluate controlled two-way synchronization later.",
          "Expand partner APIs so florists can work through their preferred tools without duplicating information.",
        ],
      },
    ],
  },
  {
    id: "2030-marketplace",
    period: "2030",
    title: "GetBloomDirect Customer Marketplace",
    phase: "platform",
    badge: "Consumer Expansion",
    icon: ShoppingBag,
    summary:
      "After the network contains enough real florists, dependable local coverage, and current catalogs, GBD opens a customer-facing discovery and ordering experience.",
    groups: [
      {
        items: [
          "Consumers search by recipient city, ZIP code, delivery date, occasion, availability, rating, and product offering.",
          "Local florists appear with verified profiles, reviews, delivery availability, and current catalog items.",
          "Customers choose a florist, build an order, pay, and send without using a traditional wire service.",
          "The same infrastructure supports florist-to-florist and customer-to-florist orders while keeping the workflows clearly separated.",
          "Bloom Websites customers use the same catalog on their own site and inside the marketplace.",
          "The marketplace becomes both a customer-acquisition channel for independent florists and a new revenue channel for Bloom.",
        ],
      },
    ],
  },
  {
    id: "2031-delivery",
    period: "2031",
    title: "Network Intelligence and Delivery",
    phase: "platform",
    badge: "Scale",
    icon: Truck,
    summary:
      "Use the strength of the network to improve matching, coverage, delivery reliability, and eventually create a specialized delivery network for florists.",
    groups: [
      {
        items: [
          "Use aggregated network data to improve florist matching, delivery coverage, demand forecasting, cutoff guidance, and fulfillment reliability.",
          "Build network-growth maps, underserved-market insights, demand analytics, and smarter recommendations.",
          "Explore the separate delivery-network concept where shops post deliveries and qualified drivers choose available work.",
          "Connect delivery status to GBD, websites, marketplace orders, customer notifications, and POS systems.",
          "Develop driver verification, insurance standards, fraud protection, dispute processes, service-quality requirements, and controlled market launches before scaling.",
        ],
      },
    ],
  },
  {
    id: "2032-ai",
    period: "2032",
    title: "Automation Without Losing the Human Business",
    phase: "platform",
    badge: "Intelligence",
    icon: Bot,
    summary:
      "Use AI to remove repetitive work while keeping florists firmly in control of creativity, pricing, substitutions, fulfillment, and customer relationships.",
    groups: [
      {
        items: [
          "Add practical assistance for product descriptions, website content, customer communication, order notes, catalog cleanup, reporting, and support.",
          "Explore conversational ordering through websites, the marketplace, assistants, and approved partners.",
          "Recommend products and fulfilling florists based on delivery requirements, availability, quality, and customer intent.",
          "Keep florists in control of pricing, substitutions, branding, fulfillment, and customer relationships.",
          "Continue the founding principle: technology is never the hero; people are.",
        ],
      },
    ],
  },
  {
    id: "2033-convergence",
    period: "2033–2034",
    title: "Prepare to Own the Complete Workflow",
    phase: "destination",
    badge: "Convergence",
    icon: PackageCheck,
    summary:
      "Use years of real integrations and florist operations data to prepare for a complete point-of-sale system without rushing into the most critical software in a shop.",
    groups: [
      {
        items: [
          "Standardize orders, customers, catalog, taxes, payments, settlements, refunds, inventory concepts, employees, permissions, reporting, and integrations.",
          "Learn from years of production POS partnerships before attempting to replace any florist’s core system.",
          "Build migration tools for products, customers, order history, tax rules, employees, permissions, and accounting mappings.",
          "Create enterprise-grade reliability, audit controls, security, offline contingencies, support, and partner documentation.",
          "Test POS workflows with a small group of trusted florists rather than forcing premature adoption.",
        ],
      },
    ],
  },
  {
    id: "2035-pos",
    period: "August 2035",
    title: "Bloom POS",
    phase: "destination",
    badge: "10-Year Destination",
    icon: LayoutDashboard,
    summary:
      "Bloom becomes capable of running the complete florist operation—not by starting with a POS, but by earning the right to build one after a decade of learning how florists actually work.",
    groups: [
      {
        title: "Sell",
        items: [
          "Accept in-store, phone, website, marketplace, and florist-network orders through one connected system.",
        ],
      },
      {
        title: "Fulfill",
        items: [
          "Manage production, substitutions, routing, delivery, communication, and fulfillment from one workflow.",
        ],
      },
      {
        title: "Operate",
        items: [
          "Run catalog, customers, employees, permissions, reporting, payments, settlements, refunds, and integrations from Bloom.",
        ],
      },
    ],
  },
];

const principles = [
  "Independent florists deserve a better way to work together.",
  "Florist-to-florist orders remain fee-free unless the company deliberately revisits that promise.",
  "Orders track flowers; settlements track money.",
  "Sending and fulfilling florists should do as little unnecessary work as possible.",
  "Software should interrupt users only when action is required.",
  "Information should be entered once and reused everywhere.",
  "The catalog becomes shared infrastructure rather than duplicated product lists.",
  "Bloom products should strengthen one another rather than compete internally.",
  "Growth should happen through meaningful, production-safe releases.",
  "Technology supports people; it never replaces the human value of the florist.",
];

const phaseStyles: Record<
  Phase,
  { dot: string; badge: string; line: string }
> = {
  foundation: {
    dot: "bg-violet-400",
    badge: "border-violet-400/20 bg-violet-500/10 text-violet-300",
    line: "from-violet-500/50",
  },
  growth: {
    dot: "bg-emerald-400",
    badge: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    line: "from-emerald-500/50",
  },
  platform: {
    dot: "bg-sky-400",
    badge: "border-sky-400/20 bg-sky-500/10 text-sky-300",
    line: "from-sky-500/50",
  },
  destination: {
    dot: "bg-amber-300",
    badge: "border-amber-300/20 bg-amber-400/10 text-amber-200",
    line: "from-amber-400/50",
  },
};

export default function RoadmapTimeline() {
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(
    () => new Set(milestones.map((milestone) => milestone.id)),
  );

  const visibleMilestones = useMemo(
    () =>
      filter === "all"
        ? milestones
        : milestones.filter((milestone) => milestone.phase === filter),
    [filter],
  );

  function toggleMilestone(id: string) {
    setExpandedMilestones((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function setAllExpanded(expanded: boolean) {
    setExpandedMilestones(
      expanded ? new Set(visibleMilestones.map((milestone) => milestone.id)) : new Set(),
    );
  }

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Starting Point"
          value="2025"
          description="GetBloomDirect begins"
          icon={Flower2}
        />
        <SummaryCard
          label="Revenue Engine"
          value="2026"
          description="Bloom Websites"
          icon={Store}
        />
        <SummaryCard
          label="Platform Expansion"
          value="2028+"
          description="One shared Bloom ecosystem"
          icon={Globe2}
        />
        <SummaryCard
          label="10-Year Destination"
          value="2035"
          description="Bloom POS"
          icon={LayoutDashboard}
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2" aria-label="Roadmap filters">
            {filters.map((item) => {
              const active = filter === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                      : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAllExpanded(true)}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-400 transition hover:border-white/20 hover:text-white"
            >
              Expand All
            </button>
            <button
              type="button"
              onClick={() => setAllExpanded(false)}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-400 transition hover:border-white/20 hover:text-white"
            >
              Collapse All
            </button>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-500">
          Near-term milestones are execution-focused. Later milestones preserve
          the intended product sequence but may move as customers, revenue,
          partnerships, and technology shape the company.
        </p>
      </section>

      <section className="relative">
        <div className="absolute bottom-0 left-[23px] top-0 hidden w-px bg-gradient-to-b from-violet-500/60 via-sky-500/30 to-amber-300/60 sm:block" />

        <div className="space-y-5">
          {visibleMilestones.map((milestone) => {
            const expanded = expandedMilestones.has(milestone.id);
            const styles = phaseStyles[milestone.phase];
            const Icon = milestone.icon;
            const isDestination = milestone.id === "2035-pos";

            return (
              <article
                key={milestone.id}
                className="relative sm:pl-16"
              >
                <div
                  className={`absolute left-3 top-8 z-10 hidden h-6 w-6 rounded-full border-[5px] border-slate-950 sm:block ${styles.dot} ${
                    isDestination ? "ring-4 ring-amber-300/10" : ""
                  }`}
                />

                <div
                  className={`overflow-hidden rounded-3xl border transition ${
                    isDestination
                      ? "border-amber-300/25 bg-gradient-to-br from-amber-400/10 via-slate-900 to-slate-900"
                      : "border-white/10 bg-slate-900/75"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleMilestone(milestone.id)}
                    className="flex w-full items-start justify-between gap-5 px-5 py-6 text-left sm:px-7"
                    aria-expanded={expanded}
                  >
                    <div className="flex min-w-0 gap-4">
                      <div
                        className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border sm:flex ${styles.badge}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-sm font-semibold text-slate-400">
                            {milestone.period}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${styles.badge}`}
                          >
                            {milestone.badge}
                          </span>
                        </div>

                        <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl">
                          {milestone.title}
                        </h2>

                        <p className="mt-3 max-w-4xl leading-7 text-slate-300">
                          {milestone.summary}
                        </p>
                      </div>
                    </div>

                    <ChevronDown
                      className={`mt-1 h-5 w-5 shrink-0 text-slate-500 transition-transform ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {expanded && (
                    <div className="border-t border-white/10 px-5 py-6 sm:px-7">
                      <div
                        className={`grid gap-5 ${
                          milestone.groups.length >= 3
                            ? "lg:grid-cols-3"
                            : milestone.groups.length === 2
                              ? "lg:grid-cols-2"
                              : ""
                        }`}
                      >
                        {milestone.groups.map((group, groupIndex) => (
                          <div key={`${milestone.id}-${groupIndex}`}>
                            {group.title && (
                              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
                                {group.title}
                              </h3>
                            )}

                            <ul className="space-y-3">
                              {group.items.map((item) => (
                                <li
                                  key={item}
                                  className="flex gap-3 text-sm leading-6 text-slate-300"
                                >
                                  <span
                                    className={`mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${styles.dot} text-slate-950`}
                                  >
                                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                                  </span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>

                      {isDestination && (
                        <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/5 px-5 py-4">
                          <p className="text-lg font-bold text-amber-100">
                            The destination: “Bloom runs my business.”
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/75 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-300">
              Permanent principles
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">
              What Remains True Across All Ten Years
            </h2>
          </div>
        </div>

        <div className="mt-7 grid gap-x-8 gap-y-4 md:grid-cols-2">
          {principles.map((principle) => (
            <div key={principle} className="flex gap-3 text-sm leading-6 text-slate-300">
              <Sparkles className="mt-1 h-4 w-4 shrink-0 text-violet-300" />
              <span>{principle}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <VisionNode icon={Network} title="Network" detail="Florist to florist" />
        <VisionNode icon={Store} title="Commerce" detail="Websites and marketplace" />
        <VisionNode icon={Code2} title="Operating Platform" detail="Integrations to Bloom POS" />
      </section>

      <footer className="rounded-2xl border border-white/10 bg-white/[0.025] px-5 py-4 text-sm leading-6 text-slate-500">
        This is a strategic timeline rather than a promise that every distant
        feature will launch in the exact year shown. The intended sequence is:
        network → websites → shared catalog → marketplace and integrations →
        operating platform → Bloom POS.
      </footer>
    </>
  );
}

function SummaryCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof Flower2;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="h-5 w-5 text-violet-300" />
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}

function VisionNode({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof Network;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-bold text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
