"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Crown,
  ExternalLink,
  Globe2,
  Loader2,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Store,
  UserPlus,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import toast from "react-hot-toast";

type CapabilitySet = {
  canAppearInSearch: boolean;
  canReceiveOrders: boolean;
  canSendOrders: boolean;
  canAcceptOrders: boolean;
};

type ShopReadiness = {
  percentage?: number;
  completionPercentage?: number;
  incompleteRequirements?: string[];
  capabilities: CapabilitySet;
};

type AttentionShop = {
  _id: string;
  businessName: string;
  email: string | null;
  isPro: boolean;
  isPublic: boolean;
  isSuspended: boolean;
  readinessPercentage: number;
  readiness: ShopReadiness;
};

type PendingWebsiteRequest = {
  _id: string;
  shopName: string;
  websiteUrl: string | null;
  failureReason: string | null;
  createdAt: string;
};

type RecentActivity = {
  id: string;
  type:
    | "shop_registered"
    | "order_created"
    | "website_approved"
    | "website_declined";
  title: string;
  description: string;
  occurredAt: string;
  metadata?: {
    status?: string | null;
    orderNumber?: string | null;
  };
};

type AdminOverviewResponse = {
  success?: boolean;
  error?: string;

  metrics?: {
    totalShops: number;
    proShops: number;
    shopsNeedingAttention: number;
    pendingWebsiteReviews: number;
    ordersThisMonth: number;
    totalOrders: number;
  };

  shopsNeedingAttention?: AttentionShop[];
  pendingWebsiteRequests?: PendingWebsiteRequest[];
  recentActivity?: RecentActivity[];
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong.";
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  const difference =
    Date.now() - date.getTime();

  const minutes = Math.floor(
    difference / (1000 * 60),
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 30) {
    return `${days}d ago`;
  }

  return formatDateTime(value);
}

function getActivityIcon(
  activity: RecentActivity,
) {
  switch (activity.type) {
    case "shop_registered":
      return UserPlus;

    case "order_created":
      return PackageCheck;

    case "website_approved":
      return CheckCircle2;

    case "website_declined":
      return XCircle;

    default:
      return Clock3;
  }
}

function CapabilityRow({
  enabled,
  label,
}: {
  enabled: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {enabled ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400" />
      )}

      <span
        className={
          enabled
            ? "text-slate-400"
            : "font-semibold text-slate-200"
        }
      >
        {label}
      </span>
    </div>
  );
}

export default function AdminOverviewClient() {
  const [data, setData] =
    useState<AdminOverviewResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const loadOverview = useCallback(
    async (showRefreshState = false) => {
      try {
        if (showRefreshState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await fetch(
          "/api/admin/overview",
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const responseData =
          (await response.json()) as AdminOverviewResponse;

        if (!response.ok) {
          throw new Error(
            responseData.error ||
              "Failed to load Admin overview.",
          );
        }

        setData(responseData);
      } catch (error: unknown) {
        console.error(
          "Failed to load Admin overview:",
          error,
        );

        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-400" />

          <p className="mt-3 text-sm text-slate-400">
            Loading platform overview...
          </p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics ?? {
    totalShops: 0,
    proShops: 0,
    shopsNeedingAttention: 0,
    pendingWebsiteReviews: 0,
    ordersThisMonth: 0,
    totalOrders: 0,
  };

  const metricCards = [
    {
      label: "Total Shops",
      value: metrics.totalShops,
      description:
        "Florist accounts on the platform.",
      icon: Store,
      href: "/admin/shops",
    },
    {
      label: "Bloom Pro",
      value: metrics.proShops,
      description:
        "Active shops with Bloom Pro.",
      icon: Crown,
      href: "/admin/shops?plan=pro",
    },
    {
      label: "Needs Attention",
      value: metrics.shopsNeedingAttention,
      description:
        "Shops missing readiness requirements.",
      icon: AlertTriangle,
      href: "/admin/shops?readiness=incomplete",
    },
    {
      label: "Website Reviews",
      value: metrics.pendingWebsiteReviews,
      description:
        "Requests waiting for manual review.",
      icon: Globe2,
      href: "/admin/websites",
    },
    {
      label: "Orders This Month",
      value: metrics.ordersThisMonth,
      description:
        "Orders created during this month.",
      icon: PackageCheck,
      href: "/admin/orders",
    },
    {
      label: "Total Orders",
      value: metrics.totalOrders,
      description:
        "Orders handled across the network.",
      icon: ShieldCheck,
      href: "/admin/orders",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">
            Platform Overview
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Monitor florist readiness, website reviews,
            order activity, and the items that need your
            attention.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOverview(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />

          Refresh
        </button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric) => {
          const Icon = metric.icon;

          return (
            <Link
              key={metric.label}
              href={metric.href}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-400/25 hover:bg-white/[0.05]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10">
                  <Icon className="h-5 w-5 text-violet-300" />
                </div>

                <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-violet-300" />
              </div>

              <p className="mt-5 text-sm font-semibold text-slate-400">
                {metric.label}
              </p>

              <p className="mt-1 text-3xl font-black text-white">
                {metric.value.toLocaleString()}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {metric.description}
              </p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-bold text-white">
                Shops Needing Attention
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Lowest-readiness active shops.
              </p>
            </div>

            <Link
              href="/admin/shops"
              className="inline-flex items-center gap-1 text-sm font-semibold text-violet-300 transition hover:text-violet-200"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {data?.shopsNeedingAttention?.length ? (
            <div className="divide-y divide-white/10">
              {data.shopsNeedingAttention.map(
                (shop) => (
                  <div
                    key={shop._id}
                    className="p-5 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-white">
                            {shop.businessName}
                          </h3>

                          {shop.isPro && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                              <Crown className="h-3 w-3" />
                              Pro
                            </span>
                          )}
                        </div>

                        {shop.email && (
                          <p className="mt-1 truncate text-sm text-slate-500">
                            {shop.email}
                          </p>
                        )}

                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          <CapabilityRow
                            enabled={
                              shop.readiness
                                .capabilities
                                .canAppearInSearch
                            }
                            label="Search visibility"
                          />

                          <CapabilityRow
                            enabled={
                              shop.readiness
                                .capabilities
                                .canReceiveOrders
                            }
                            label="Receive orders"
                          />

                          <CapabilityRow
                            enabled={
                              shop.readiness
                                .capabilities
                                .canSendOrders
                            }
                            label="Send orders"
                          />

                          <CapabilityRow
                            enabled={
                              shop.readiness
                                .capabilities
                                .canAcceptOrders
                            }
                            label="Accept orders"
                          />
                        </div>
                      </div>

                      <div className="shrink-0 lg:text-right">
                        <p className="text-2xl font-black text-white">
                          {shop.readinessPercentage}%
                        </p>

                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Ready
                        </p>

                        <Link
                          href={`/admin/shops?shopId=${shop._id}`}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet-300 hover:text-violet-200"
                        >
                          View shop
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />

              <h3 className="mt-4 font-bold text-white">
                All active shops are ready
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                No florist accounts currently require
                setup assistance.
              </p>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="font-bold text-white">
                Website Review Queue
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Oldest pending requests first.
              </p>
            </div>

            <Link
              href="/admin/websites"
              className="inline-flex items-center gap-1 text-sm font-semibold text-violet-300 hover:text-violet-200"
            >
              Review
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {data?.pendingWebsiteRequests?.length ? (
            <div className="divide-y divide-white/10">
              {data.pendingWebsiteRequests.map(
                (request) => (
                  <div
                    key={request._id}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-white">
                          {request.shopName}
                        </p>

                        <p
                          className="mt-1 text-xs text-slate-500"
                          title={formatDateTime(
                            request.createdAt,
                          )}
                        >
                          Submitted{" "}
                          {formatRelativeDate(
                            request.createdAt,
                          )}
                        </p>

                        {request.failureReason && (
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                            {request.failureReason}
                          </p>
                        )}
                      </div>

                      {request.websiteUrl && (
                        <a
                          href={
                            request.websiteUrl.startsWith(
                              "http",
                            )
                              ? request.websiteUrl
                              : `https://${request.websiteUrl}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                          aria-label={`Open ${request.shopName} website`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400" />

              <h3 className="mt-4 font-bold text-white">
                Queue clear
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                No websites are waiting for review.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-5 py-4 sm:px-6">
          <h2 className="font-bold text-white">
            Recent Platform Activity
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Recent shop registrations, orders, and
            website decisions.
          </p>
        </div>

        {data?.recentActivity?.length ? (
          <div className="divide-y divide-white/10">
            {data.recentActivity.map((activity) => {
              const Icon =
                getActivityIcon(activity);

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 px-5 py-4 sm:px-6"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">
                    <Icon className="h-4 w-4 text-violet-300" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">
                        {activity.title}
                      </p>

                      <p
                        className="text-xs text-slate-500"
                        title={formatDateTime(
                          activity.occurredAt,
                        )}
                      >
                        {formatRelativeDate(
                          activity.occurredAt,
                        )}
                      </p>
                    </div>

                    <p className="mt-1 text-sm text-slate-400">
                      {activity.description}
                    </p>

                    {activity.metadata?.status && (
                      <span className="mt-2 inline-flex rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                        {activity.metadata.status.replaceAll(
                          "_",
                          " ",
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <Clock3 className="mx-auto h-8 w-8 text-slate-600" />

            <p className="mt-4 text-sm text-slate-500">
              No recent activity is available.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}