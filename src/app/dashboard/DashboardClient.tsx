"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  FileText,
  Globe2,
  Network,
  Package2,
  Palette,
  PanelsTopLeft,
  PlusCircle,
  Rocket,
  Settings2,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import BloomSpinner from "@/components/BloomSpinner";

type MonthlySendUsage = {
  isPro: boolean;
  sentThisMonth: number;
  limit: number | null;
  remaining: number | null;
  allowed: boolean;
};

type ReadinessKey =
  | "emailVerification"
  | "businessInformation"
  | "paymentMethods"
  | "deliverySettings"
  | "financialSettings";

type ShopReadiness = {
  requirements: {
    accountCreated: boolean;
    emailVerified: boolean;
    businessInfoComplete: boolean;
    paymentConfigured: boolean;
    deliveryConfigured: boolean;
    financialsConfigured: boolean;
  };
  incompleteRequirements: ReadinessKey[];
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
};

type Shop = {
  businessName: string;
  isPro: boolean;
};

type ShortcutProps = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone?: "purple" | "emerald";
};

function WebsiteShortcut({
  href,
  title,
  description,
  icon,
  tone = "purple",
}: ShortcutProps) {
  const toneClasses =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100"
      : "bg-purple-50 text-purple-700 group-hover:bg-purple-100";

  return (
    <Link
      href={href}
      className="group flex min-h-[138px] flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-100"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${toneClasses}`}>
        {icon}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <h3 className="font-black text-slate-900">{title}</h3>
        <ArrowRight
          className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-purple-600"
          aria-hidden="true"
        />
      </div>

      <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
    </Link>
  );
}

const readinessLabels: Record<ReadinessKey, string> = {
  emailVerification: "Verify email",
  businessInformation: "Business information",
  paymentMethods: "Payment method",
  deliverySettings: "Delivery settings",
  financialSettings: "Taxes & fees",
};

export default function DashboardClient() {
  const { status } = useSession();
  const [shop, setShop] = useState<Shop | null>(null);
  const [readiness, setReadiness] = useState<ShopReadiness | null>(null);
  const [monthlySendUsage, setMonthlySendUsage] =
    useState<MonthlySendUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") {
      if (status === "unauthenticated") {
        setIsLoading(false);
      }
      return;
    }

    let mounted = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);

        const [shopRes, usageRes] = await Promise.all([
          fetch("/api/shops/me"),
          fetch("/api/orders/send-usage"),
        ]);

        const shopData = await shopRes.json();
        const usageData = await usageRes.json();

        if (!shopRes.ok) {
          throw new Error(shopData.error || "Unable to load shop information.");
        }

        if (!usageRes.ok) {
          throw new Error(
            usageData.error || "Unable to load monthly order usage.",
          );
        }

        if (!mounted) return;

        if (shopData?.shop) {
          setShop({
            businessName: shopData.shop.businessName || "Your flower shop",
            isPro: Boolean(shopData.shop.isPro),
          });
        }

        setReadiness(shopData?.readiness ?? null);
        setMonthlySendUsage(usageData?.usage ?? null);
      } catch (error) {
        console.error("Failed to load home dashboard:", error);
        toast.error(
          "We couldn't load your Bloom home page. Refresh and try again.",
        );
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [status]);

  if (status === "unauthenticated") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        You must be logged in to view Bloom.
      </div>
    );
  }

  if (isLoading || status === "loading") {
    return (
      <div className="flex h-[65vh] items-center justify-center gap-5 text-slate-600">
        <BloomSpinner size={58} />
        <p className="font-semibold">Opening your Bloom workspace…</p>
      </div>
    );
  }

  const incompleteItems = readiness?.incompleteRequirements ?? [];
  const setupComplete = Boolean(readiness && readiness.completionPercentage >= 100);
  const usagePercent =
    monthlySendUsage && !monthlySendUsage.isPro && monthlySendUsage.limit
      ? Math.min(
          100,
          Math.round(
            (monthlySendUsage.sentThisMonth / monthlySendUsage.limit) * 100,
          ),
        )
      : 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 pb-10">
      <header className="flex flex-col gap-3 px-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-600">
            Bloom home
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Welcome back{shop?.businessName ? `, ${shop.businessName}` : ""}.
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">
            Your website is front and center. Everything else is one click away when you need it.
          </p>
        </div>

        <Link
          href="/dashboard/getting-started"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Getting Started
        </Link>
      </header>

      {!setupComplete && readiness ? (
        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70">
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <CircleAlert className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-black text-slate-900">
                  A few account details still need your attention.
                </p>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate-600">
                  <span>{readiness.completionPercentage}% complete</span>
                  {incompleteItems.slice(0, 3).map((item) => (
                    <span key={item} className="before:mr-2 before:text-slate-300 before:content-['•']">
                      {readinessLabels[item]}
                    </span>
                  ))}
                  {incompleteItems.length > 3 ? (
                    <span className="before:mr-2 before:text-slate-300 before:content-['•']">
                      +{incompleteItems.length - 3} more
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <Link
              href="/dashboard/settings"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Finish setup
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : setupComplete ? (
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 px-2">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Your Bloom account setup is complete.
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-purple-200 bg-white shadow-sm">
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-purple-800 to-violet-700 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-28 right-32 h-64 w-64 rounded-full bg-fuchsia-300/10 blur-3xl" />

          <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                  <Globe2 className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-100">
                  BloomWebsites · Start here
                </p>
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                Your website is your storefront.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-purple-100 sm:text-lg">
                Build your site, manage products, handle website orders, and keep your storefront looking its best.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/dashboard/websites"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-black text-purple-800 transition hover:bg-purple-50"
              >
                Open BloomWebsites
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/dashboard/websites/storefront"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/15"
              >
                Edit Storefront
                <PanelsTopLeft className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6 lg:p-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-950">Website essentials</h3>
              <p className="mt-1 text-sm text-slate-500">
                The places you'll use most often.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <WebsiteShortcut
              href="/dashboard/websites/orders"
              title="Website Orders"
              description="See and manage orders placed through your storefront."
              icon={<ShoppingBag className="h-5 w-5" aria-hidden="true" />}
            />
            <WebsiteShortcut
              href="/dashboard/websites/products"
              title="Products"
              description="Add arrangements, pricing tiers, add-ons, and images."
              icon={<Package2 className="h-5 w-5" aria-hidden="true" />}
            />
            <WebsiteShortcut
              href="/dashboard/websites/storefront"
              title="Storefront Editor"
              description="Control banners, homepage sections, and site presentation."
              icon={<PanelsTopLeft className="h-5 w-5" aria-hidden="true" />}
            />
            <WebsiteShortcut
              href="/dashboard/websites/branding"
              title="Branding"
              description="Manage your logo, colors, and brand identity."
              icon={<Palette className="h-5 w-5" aria-hidden="true" />}
            />
            <WebsiteShortcut
              href="/dashboard/websites/reports"
              title="Website Reports"
              description="Review website order performance and sales activity."
              icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
            />
            <WebsiteShortcut
              href="/dashboard/websites/launch"
              title="Launch & Billing"
              description="Manage launch readiness, plan, and website billing."
              icon={<Rocket className="h-5 w-5" aria-hidden="true" />}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
        <div className="rounded-[26px] border border-emerald-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Network className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    GetBloomDirect
                  </p>
                  <h2 className="mt-0.5 text-xl font-black text-slate-950">
                    Florist-to-florist network
                  </h2>
                </div>
              </div>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Send orders to other florists, manage incoming network orders, and find shops in the network.
              </p>
            </div>

            {!shop?.isPro && monthlySendUsage ? (
              <Link
                href="/dashboard/upgrade"
                className="inline-flex w-fit items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-black text-purple-700 transition hover:bg-purple-100"
              >
                Bloom Pro
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link
              href="/dashboard/new-order"
              className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50"
            >
              <PlusCircle className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              <p className="mt-3 font-black text-slate-900">Create Order</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Send a florist-to-florist order.</p>
            </Link>
            <Link
              href="/dashboard/incoming"
              className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50"
            >
              <FileText className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              <p className="mt-3 font-black text-slate-900">Network Orders</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Review sent and received orders.</p>
            </Link>
            <Link
              href="/dashboard/network"
              className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50"
            >
              <Network className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              <p className="mt-3 font-black text-slate-900">Find Florists</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Search shops in the network.</p>
            </Link>
          </div>

          {monthlySendUsage && !monthlySendUsage.isPro ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                <span>Orders sent this month</span>
                <span className="text-slate-800">
                  {monthlySendUsage.sentThisMonth} / {monthlySendUsage.limit}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          ) : monthlySendUsage?.isPro ? (
            <p className="mt-5 text-sm font-semibold text-emerald-700">
              Unlimited network sending with Bloom Pro.
            </p>
          ) : null}
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <Settings2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-xl font-black text-slate-950">Need something else?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Account settings, communications, profile tools, and help stay out of your way until you need them.
          </p>
          <div className="mt-5 space-y-2">
            <Link
              href="/dashboard/communications"
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Communications
              <ArrowRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Settings
              <ArrowRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
            </Link>
            <Link
              href="/support"
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Support
              <ArrowRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
