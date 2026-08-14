"use client";

import StatusBadge from "@/components/admin/StatusBadge";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  BadgeCheck,
  Ban,
  Building2,
  CalendarDays,
  CheckCircle2,
  Crown,
  ExternalLink,
  Globe2,
  Loader2,
  MailWarning,
  MapPin,
  MapPinned,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Store,
  UserRoundCog,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";

type IncompleteRequirement =
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

  capabilities: {
    canAccessDashboard: boolean;
    canAppearInSearch: boolean;
    canSendOrders: boolean;
    canReceiveOrders: boolean;
    canAcceptOrders: boolean;
  };

  incompleteRequirements: IncompleteRequirement[];

  completedCount: number;
  totalCount: number;
  completionPercentage: number;
};

type AccountRiskLevel = "low" | "review" | "likely_spam";

type AccountRiskReason =
  | "EMAIL_UNVERIFIED"
  | "NO_PHONE"
  | "NO_LOCATION"
  | "NO_WEBSITE"
  | "VERY_LOW_READINESS"
  | "NO_LOGIN_ACTIVITY"
  | "RANDOM_LOOKING_BUSINESS_NAME";

type AccountRisk = {
  level: AccountRiskLevel;
  score: number;
  reasons: AccountRiskReason[];
};

type AdminCustomer = {
  _id: string;
  businessName?: string;
  shopName?: string;
  email?: string;
  role?: string;

  isPro?: boolean;
  isPublic?: boolean;
  isSuspended?: boolean;
  suspensionReason?: string | null;
  isMarkedSpam?: boolean;
  spamReviewReason?: string | null;
  markedSpamAt?: string | null;
  isArchived?: boolean;
  archivedReason?: string | null;
  archivedAt?: string | null;

  isVerified?: boolean;
  verifiedFlorist?: boolean;

  createdAt?: string;
  lastLogin?: string;
  lastActivity?: string;

  readiness: ShopReadiness;
  accountRisk: AccountRisk;

  readinessReminder: {
    lastSentAt: string | null;
    canSendAgain: boolean;
    nextAllowedAt: string | null;
  };

  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };

  contact?: {
    phone?: string;
    website?: string;
  };
};

type CustomersResponse = {
  customers?: AdminCustomer[];
  riskSummary?: {
    low: number;
    review: number;
    likelySpam: number;
  };
  error?: string;
};

type ShopFilter =
  | "all"
  | "pro"
  | "free"
  | "verified"
  | "ready"
  | "needs_attention"
  | "needs_review"
  | "likely_spam"
  | "email_unverified"
  | "no_location"
  | "searchable"
  | "private"
  | "suspended"
  | "marked_spam"
  | "archived";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function getShopName(customer: AdminCustomer) {
  return customer.businessName || customer.shopName || "Unnamed Shop";
}

function formatDate(value?: string) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeWebsiteUrl(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

function isShopReady(customer: AdminCustomer) {
  return customer.readiness.completionPercentage === 100;
}

function hasShopLocation(customer: AdminCustomer) {
  return Boolean(
    customer.address?.street?.trim() &&
    customer.address?.city?.trim() &&
    customer.address?.state?.trim() &&
    customer.address?.zip?.trim(),
  );
}

const filters: Array<{
  label: string;
  value: ShopFilter;
}> = [
  { label: "All", value: "all" },
  { label: "Pro", value: "pro" },
  { label: "Free", value: "free" },
  { label: "Verified Florists", value: "verified" },
  { label: "Ready", value: "ready" },
  { label: "Needs Attention", value: "needs_attention" },
  { label: "Needs Review", value: "needs_review" },
  { label: "Likely Spam", value: "likely_spam" },
  { label: "Email Unverified", value: "email_unverified" },
  { label: "No Location", value: "no_location" },
  { label: "Searchable", value: "searchable" },
  { label: "Private", value: "private" },
  { label: "Suspended", value: "suspended" },
  { label: "Marked Spam", value: "marked_spam" },
  { label: "Archived", value: "archived" },
];

export default function ShopsClient() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ShopFilter>("all");

  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
  const [bulkSpamArchiving, setBulkSpamArchiving] = useState(false);

  const searchParams = useSearchParams();

  const loadCustomers = useCallback(async (showRefreshState = false) => {
    try {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/admin/customers", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as CustomersResponse;

      if (!response.ok) {
        throw new Error(data.error || "Failed to load shops.");
      }

      setCustomers(Array.isArray(data.customers) ? data.customers : []);
    } catch (error: unknown) {
      console.error("Failed to load shops:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    const requestedFilter = searchParams.get("filter");

    if (
      requestedFilter &&
      filters.some((filter) => filter.value === requestedFilter)
    ) {
      setActiveFilter(requestedFilter as ShopFilter);
    }
  }, [searchParams]);

  const metrics = useMemo(() => {
    return {
      total: customers.length,

      pro: customers.filter((customer) => customer.isPro).length,

      ready: customers.filter(isShopReady).length,

      needsAttention: customers.filter((customer) => !isShopReady(customer))
        .length,

      needsReview: customers.filter(
        (customer) => customer.accountRisk.level === "review",
      ).length,

      likelySpam: customers.filter(
        (customer) => customer.accountRisk.level === "likely_spam",
      ).length,

      markedSpam: customers.filter((customer) => customer.isMarkedSpam).length,
      archived: customers.filter((customer) => customer.isArchived).length,
    };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [
          customer.businessName,
          customer.shopName,
          customer.email,
          customer.address?.city,
          customer.address?.state,
          customer.address?.zip,
          customer.contact?.phone,
        ].some((value) => value?.toLowerCase().includes(normalizedQuery));

      if (!matchesSearch) {
        return false;
      }

      switch (activeFilter) {
        case "pro":
          return Boolean(customer.isPro);

        case "free":
          return !customer.isPro;

        case "verified":
          return Boolean(customer.verifiedFlorist || customer.isVerified);

        case "ready":
          return isShopReady(customer);

        case "needs_attention":
          return !isShopReady(customer);

        case "needs_review":
          return customer.accountRisk.level === "review";

        case "likely_spam":
          return (
            customer.accountRisk.level === "likely_spam" && !customer.isArchived
          );

        case "email_unverified":
          return !customer.readiness.requirements.emailVerified;

        case "no_location":
          return !hasShopLocation(customer);

        case "searchable":
          return customer.readiness.capabilities.canAppearInSearch;

        case "private":
          return !customer.isPublic;

        case "suspended":
          return Boolean(customer.isSuspended);

        case "marked_spam":
          return Boolean(customer.isMarkedSpam);

        case "archived":
          return Boolean(customer.isArchived);

        case "all":
        default:
          return true;
      }
    });
  }, [activeFilter, customers, searchQuery]);

  const bulkSpamEligibleCustomers = useMemo(() => {
    if (activeFilter !== "likely_spam") {
      return [];
    }

    return filteredCustomers.filter(
      (customer) => customer.role !== "admin" && !customer.isArchived,
    );
  }, [activeFilter, filteredCustomers]);

  const allVisibleSpamSelected =
    bulkSpamEligibleCustomers.length > 0 &&
    bulkSpamEligibleCustomers.every((customer) =>
      selectedShopIds.includes(customer._id),
    );

  useEffect(() => {
    setSelectedShopIds([]);
  }, [activeFilter, searchQuery]);

  function toggleShopSelection(shopId: string) {
    setSelectedShopIds((current) =>
      current.includes(shopId)
        ? current.filter((id) => id !== shopId)
        : [...current, shopId],
    );
  }

  function toggleAllVisibleSpam() {
    const visibleIds = bulkSpamEligibleCustomers.map(
      (customer) => customer._id,
    );

    if (allVisibleSpamSelected) {
      setSelectedShopIds((current) =>
        current.filter((id) => !visibleIds.includes(id)),
      );

      return;
    }

    setSelectedShopIds((current) =>
      Array.from(new Set([...current, ...visibleIds])),
    );
  }

  async function bulkMarkSpamAndArchive() {
    if (selectedShopIds.length === 0) {
      toast.error("Select at least one spam account.");
      return;
    }

    const confirmed = window.confirm(
      selectedShopIds.length === 1
        ? "Mark this account as spam, suspend it, hide it, and archive it?"
        : `Mark these ${selectedShopIds.length} accounts as spam, suspend them, hide them, and archive them?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setBulkSpamArchiving(true);

      const response = await fetch("/api/admin/customers/bulk-spam-archive", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shopIds: selectedShopIds,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        processedCount?: number;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to process selected spam accounts.",
        );
      }

      toast.success(
        data.message || `${selectedShopIds.length} spam accounts processed.`,
      );

      setSelectedShopIds([]);

      await loadCustomers(true);
    } catch (error: unknown) {
      console.error("Failed to bulk mark spam and archive shops:", error);

      toast.error(getErrorMessage(error));
    } finally {
      setBulkSpamArchiving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-400" />

          <p className="mt-3 text-sm text-slate-400">
            Loading GetBloomDirect shops...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <MetricCard
          label="Total shops"
          value={metrics.total}
          icon={Building2}
        />

        <MetricCard label="Bloom Pro" value={metrics.pro} icon={Crown} />

        <MetricCard label="Ready" value={metrics.ready} icon={ShieldCheck} />

        <MetricCard
          label="Needs attention"
          value={metrics.needsAttention}
          icon={UserRoundCog}
        />

        <MetricCard
          label="Needs review"
          value={metrics.needsReview}
          icon={ShieldAlert}
        />

        <MetricCard
          label="Likely spam"
          value={metrics.likelySpam}
          icon={AlertTriangle}
        />

        <MetricCard
          label="Marked spam"
          value={metrics.markedSpam}
          icon={ShieldOff}
        />

        <MetricCard label="Archived" value={metrics.archived} icon={Archive} />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search shops, emails, cities, or ZIP codes..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/10"
            />
          </div>

          <button
            type="button"
            onClick={() => void loadCustomers(true)}
            disabled={refreshing}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh shops
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((filter) => {
            const active = activeFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  active
                    ? "bg-violet-500 text-white"
                    : "border border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Platform accounts</h2>

            <p className="mt-1 text-sm text-slate-500">
              Showing {filteredCustomers.length} of {customers.length} shops.
            </p>
          </div>

          {activeFilter === "likely_spam" && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleAllVisibleSpam}
                disabled={
                  bulkSpamEligibleCustomers.length === 0 || bulkSpamArchiving
                }
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {allVisibleSpamSelected
                  ? "Clear selection"
                  : `Select all (${bulkSpamEligibleCustomers.length})`}
              </button>

              <button
                type="button"
                onClick={() => void bulkMarkSpamAndArchive()}
                disabled={selectedShopIds.length === 0 || bulkSpamArchiving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-400/[0.08] px-4 py-2.5 text-sm font-bold text-red-200 transition hover:bg-red-400/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkSpamArchiving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}

                {bulkSpamArchiving
                  ? "Processing..."
                  : `Mark Spam & Archive${
                      selectedShopIds.length > 0
                        ? ` (${selectedShopIds.length})`
                        : ""
                    }`}
              </button>
            </div>
          )}
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
            <Store className="mx-auto h-8 w-8 text-slate-600" />

            <h3 className="mt-4 text-lg font-bold text-white">
              No matching shops
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or account filter.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCustomers.map((customer) => (
              <ShopCard
                key={customer._id}
                customer={customer}
                selectable={
                  activeFilter === "likely_spam" &&
                  customer.role !== "admin" &&
                  !customer.isArchived
                }
                selected={selectedShopIds.includes(customer._id)}
                onSelectionChanged={toggleShopSelection}
                onSuspensionChanged={(
                  shopId,
                  isSuspended,
                  suspensionReason,
                ) => {
                  setCustomers((current) =>
                    current.map((shop) =>
                      shop._id === shopId
                        ? { ...shop, isSuspended, suspensionReason }
                        : shop,
                    ),
                  );
                }}
                onReviewChanged={(
                  shopId,
                  isMarkedSpam,
                  spamReviewReason,
                  markedSpamAt,
                ) => {
                  setCustomers((current) =>
                    current.map((shop) =>
                      shop._id === shopId
                        ? {
                            ...shop,
                            isMarkedSpam,
                            spamReviewReason,
                            markedSpamAt,
                          }
                        : shop,
                    ),
                  );
                }}
                onArchiveChanged={(
                  shopId,
                  isArchived,
                  archivedReason,
                  archivedAt,
                ) => {
                  setCustomers((current) =>
                    current.map((shop) =>
                      shop._id === shopId
                        ? { ...shop, isArchived, archivedReason, archivedAt }
                        : shop,
                    ),
                  );
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: number;
  icon: typeof Building2;
};

function MetricCard({ label, value, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>

          <p className="mt-2 text-3xl font-black text-white">{value}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10">
          <Icon className="h-5 w-5 text-violet-400" />
        </div>
      </div>
    </div>
  );
}

type ShopCardProps = {
  customer: AdminCustomer;
  selectable: boolean;
  selected: boolean;
  onSelectionChanged: (shopId: string) => void;
  onSuspensionChanged: (
    shopId: string,
    isSuspended: boolean,
    suspensionReason: string | null,
  ) => void;
  onReviewChanged: (
    shopId: string,
    isMarkedSpam: boolean,
    spamReviewReason: string | null,
    markedSpamAt: string | null,
  ) => void;
  onArchiveChanged: (
    shopId: string,
    isArchived: boolean,
    archivedReason: string | null,
    archivedAt: string | null,
  ) => void;
};

function ShopCard({
  customer,
  selectable,
  selected,
  onSelectionChanged,
  onSuspensionChanged,
  onReviewChanged,
  onArchiveChanged,
}: ShopCardProps) {
  const cityState = [customer.address?.city, customer.address?.state]
    .filter(Boolean)
    .join(", ");

  const location = [cityState, customer.address?.zip].filter(Boolean).join(" ");

  return (
    <article
      className={`rounded-2xl border bg-white/[0.03] p-5 transition sm:p-6 ${
        selected
          ? "border-red-400/40 bg-red-400/[0.03]"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      {selectable && (
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelectionChanged(customer._id)}
              className="h-4 w-4 cursor-pointer rounded border-white/20 bg-slate-950 accent-red-500"
            />

            <span className="text-sm font-semibold text-slate-300">
              Select for spam cleanup
            </span>
          </label>

          {selected && (
            <span className="rounded-full bg-red-400/10 px-2.5 py-1 text-xs font-bold text-red-300">
              Selected
            </span>
          )}
        </div>
      )}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10">
              <Building2 className="h-6 w-6 text-violet-400" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-white">
                {getShopName(customer)}
              </h3>

              <p className="mt-1 break-all text-sm text-slate-400">
                {customer.email || "No email available"}
              </p>

              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{location || "No location available"}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {customer.role === "admin" && (
              <StatusBadge label="Admin" variant="violet" />
            )}

            {customer.isPro ? (
              <StatusBadge label="Bloom Pro" variant="emerald" />
            ) : (
              <StatusBadge label="Bloom Free" variant="slate" />
            )}

            {(customer.verifiedFlorist || customer.isVerified) && (
              <StatusBadge label="Verified" variant="blue" />
            )}

            {isShopReady(customer) ? (
              <StatusBadge label="Ready" variant="emerald" />
            ) : (
              <StatusBadge
                label={`${customer.readiness.completionPercentage}% Ready`}
                variant="amber"
              />
            )}

            {customer.readiness.incompleteRequirements.includes(
              "emailVerification",
            ) && <StatusBadge label="Email Unverified" variant="amber" />}

            {customer.readiness.incompleteRequirements.includes(
              "businessInformation",
            ) && <StatusBadge label="Business Info Missing" variant="amber" />}

            {customer.readiness.incompleteRequirements.includes(
              "paymentMethods",
            ) && <StatusBadge label="Payment Method Missing" variant="amber" />}

            {customer.readiness.incompleteRequirements.includes(
              "deliverySettings",
            ) && <StatusBadge label="Delivery Missing" variant="amber" />}

            {customer.readiness.incompleteRequirements.includes(
              "financialSettings",
            ) && <StatusBadge label="Taxes & Fees Missing" variant="amber" />}

            {!customer.isPublic && (
              <StatusBadge label="Private" variant="slate" />
            )}

            {customer.accountRisk.level === "review" && (
              <StatusBadge label="Needs Review" variant="amber" />
            )}

            {customer.accountRisk.level === "likely_spam" && (
              <StatusBadge label="Likely Spam" variant="red" />
            )}

            {customer.isSuspended && (
              <StatusBadge label="Suspended" variant="red" />
            )}

            {customer.isMarkedSpam && (
              <StatusBadge label="Marked Spam" variant="red" />
            )}

            {customer.isArchived && (
              <StatusBadge label="Archived" variant="slate" />
            )}
          </div>
          {customer.accountRisk.level !== "low" && (
            <AccountRiskPanel risk={customer.accountRisk} />
          )}

          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <CapabilityStatus
              label="Search Visibility"
              available={customer.readiness.capabilities.canAppearInSearch}
            />

            <CapabilityStatus
              label="Receive Orders"
              available={customer.readiness.capabilities.canReceiveOrders}
            />

            <CapabilityStatus
              label="Send Orders"
              available={customer.readiness.capabilities.canSendOrders}
            />

            <CapabilityStatus
              label="Accept Orders"
              available={customer.readiness.capabilities.canAcceptOrders}
            />
          </div>
        </div>

        <div className="grid min-w-full gap-3 text-sm sm:grid-cols-2 xl:min-w-[28rem]">
          <ShopDetail label="Phone" value={customer.contact?.phone || "N/A"} />

          <ShopDetail
            label="Joined"
            value={formatDate(customer.createdAt)}
            icon={CalendarDays}
          />

          <ShopDetail
            label="Last login"
            value={formatDate(customer.lastLogin)}
          />

          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Website
            </p>

            {customer.contact?.website ? (
              <a
                href={normalizeWebsiteUrl(customer.contact.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 break-all text-sm font-semibold text-violet-300 transition hover:text-violet-200"
              >
                Open website
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              <p className="mt-1 font-semibold text-slate-300">N/A</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Globe2 className="h-3.5 w-3.5" />

            {customer.isPublic ? "Public profile" : "Private profile"}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {customer.readiness.completedCount} of{" "}
            {customer.readiness.totalCount} readiness requirements complete
          </span>

          <span className="inline-flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5" />

            {customer.readiness.capabilities.canAppearInSearch
              ? "Eligible for florist search"
              : "Not eligible for florist search"}
          </span>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <ReadinessReminderButton customer={customer} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ReviewStatusActionButton
              customer={customer}
              onChanged={onReviewChanged}
            />
            <SuspensionActionButton
              customer={customer}
              onChanged={onSuspensionChanged}
            />
            <ArchiveActionButton
              customer={customer}
              onChanged={onArchiveChanged}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

const accountRiskReasonLabels: Record<AccountRiskReason, string> = {
  EMAIL_UNVERIFIED: "Email has not been verified",
  NO_PHONE: "No phone number",
  NO_LOCATION: "No complete location",
  NO_WEBSITE: "No website",
  VERY_LOW_READINESS: "Very low setup readiness",
  NO_LOGIN_ACTIVITY: "No login or account activity after 24 hours",
  RANDOM_LOOKING_BUSINESS_NAME: "Business name appears randomly generated",
};

type AccountRiskPanelProps = {
  risk: AccountRisk;
};

function AccountRiskPanel({ risk }: AccountRiskPanelProps) {
  const likelySpam = risk.level === "likely_spam";

  return (
    <div
      className={`mt-5 rounded-xl border p-4 ${
        likelySpam
          ? "border-red-400/20 bg-red-400/[0.05]"
          : "border-amber-400/20 bg-amber-400/[0.05]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {likelySpam ? (
            <AlertTriangle className="h-4 w-4 text-red-300" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-amber-300" />
          )}

          <p
            className={`text-sm font-bold ${
              likelySpam ? "text-red-200" : "text-amber-200"
            }`}
          >
            {likelySpam ? "Likely spam account" : "Account needs review"}
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            likelySpam
              ? "bg-red-400/10 text-red-300"
              : "bg-amber-400/10 text-amber-300"
          }`}
        >
          Risk score: {risk.score}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {risk.reasons.map((reason) => (
          <span
            key={reason}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/30 px-2.5 py-1.5 text-xs font-medium text-slate-300"
          >
            {reason === "EMAIL_UNVERIFIED" && (
              <MailWarning className="h-3.5 w-3.5 text-amber-300" />
            )}

            {reason === "NO_LOCATION" && (
              <MapPinned className="h-3.5 w-3.5 text-amber-300" />
            )}

            {accountRiskReasonLabels[reason]}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        This assessment is informational only. No account action has been taken.
      </p>
    </div>
  );
}

type ShopDetailProps = {
  label: string;
  value: string;
  icon?: typeof CalendarDays;
};

function ShopDetail({ label, value, icon: Icon }: ShopDetailProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 flex items-center gap-1.5 font-semibold text-slate-300">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-500" />}
        {value}
      </p>
    </div>
  );
}

type ReadinessReminderButtonProps = {
  customer: AdminCustomer;
};

type ReminderState = {
  lastSentAt: string | null;
  canSendAgain: boolean;
  nextAllowedAt: string | null;
};

function formatReminderDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function ReadinessReminderButton({ customer }: ReadinessReminderButtonProps) {
  const [sending, setSending] = useState(false);

  const [reminder, setReminder] = useState<ReminderState>(
    customer.readinessReminder,
  );

  const needsReminder =
    !customer.readiness.capabilities.canAppearInSearch ||
    !customer.readiness.capabilities.canReceiveOrders ||
    !customer.readiness.capabilities.canSendOrders ||
    !customer.readiness.capabilities.canAcceptOrders;

  if (
    !needsReminder ||
    customer.isSuspended ||
    customer.isArchived ||
    customer.role === "admin"
  ) {
    return null;
  }

  async function sendReminder() {
    try {
      setSending(true);

      const response = await fetch(
        `/api/admin/customers/${customer._id}/send-readiness-reminder`,
        {
          method: "POST",
        },
      );

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
        sentAt?: string;
        nextAllowedAt?: string;
      };

      if (!response.ok) {
        if (response.status === 429 && data.nextAllowedAt) {
          setReminder({
            lastSentAt: reminder.lastSentAt,
            canSendAgain: false,
            nextAllowedAt: data.nextAllowedAt,
          });

          throw new Error(
            `Another reminder can be sent after ${formatReminderDate(
              data.nextAllowedAt,
            )}.`,
          );
        }

        throw new Error(data.error || "Failed to send readiness reminder.");
      }

      const sentAt = data.sentAt || new Date().toISOString();

      setReminder({
        lastSentAt: sentAt,
        canSendAgain: false,
        nextAllowedAt:
          data.nextAllowedAt ||
          new Date(
            new Date(sentAt).getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(),
      });

      toast.success(data.message || "Readiness reminder sent.");
    } catch (error: unknown) {
      console.error("Failed to send readiness reminder:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to send readiness reminder.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {reminder.lastSentAt && (
        <p className="text-xs leading-5 text-slate-500">
          Reminder sent{" "}
          <span className="font-semibold text-slate-400">
            {formatReminderDate(reminder.lastSentAt)}
          </span>
        </p>
      )}

      <button
        type="button"
        onClick={() => void sendReminder()}
        disabled={sending || !reminder.canSendAgain}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/25 bg-violet-400/[0.08] px-4 py-2.5 text-sm font-bold text-violet-200 transition hover:bg-violet-400/[0.14] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : reminder.canSendAgain ? (
          <Send className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}

        {sending
          ? "Sending..."
          : reminder.canSendAgain
            ? reminder.lastSentAt
              ? "Send Again"
              : "Send Readiness Reminder"
            : "Reminder Sent"}
      </button>

      {!reminder.canSendAgain && reminder.nextAllowedAt && (
        <p className="text-[11px] leading-4 text-slate-600">
          Available again {formatReminderDate(reminder.nextAllowedAt)}
        </p>
      )}
    </div>
  );
}

type SuspensionActionButtonProps = {
  customer: AdminCustomer;
  onChanged: (
    shopId: string,
    isSuspended: boolean,
    suspensionReason: string | null,
  ) => void;
};

function SuspensionActionButton({
  customer,
  onChanged,
}: SuspensionActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const suspending = !customer.isSuspended;
  const actionLabel = suspending ? "Suspend Account" : "Restore Account";

  async function submitAction() {
    const normalizedReason = reason.trim();

    if (normalizedReason.length < 5) {
      toast.error("Please enter a reason of at least 5 characters.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `/api/admin/customers/${customer._id}/suspension`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            suspended: suspending,
            reason: normalizedReason,
          }),
        },
      );

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
        shop?: {
          _id: string;
          isSuspended: boolean;
          suspensionReason: string | null;
        };
      };

      if (!response.ok || !data.shop) {
        throw new Error(data.error || "Failed to update the shop account.");
      }

      onChanged(
        data.shop._id,
        data.shop.isSuspended,
        data.shop.suspensionReason,
      );

      toast.success(data.message || "Shop account updated.");
      setOpen(false);
      setReason("");
    } catch (error: unknown) {
      console.error("Failed to update shop suspension:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
          suspending
            ? "border-red-400/25 bg-red-400/[0.08] text-red-200 hover:bg-red-400/[0.14]"
            : "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-200 hover:bg-emerald-400/[0.14]"
        }`}
      >
        {suspending ? (
          <Ban className="h-4 w-4" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        {actionLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`suspension-title-${customer._id}`}
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  suspending ? "bg-red-400/10" : "bg-emerald-400/10"
                }`}
              >
                {suspending ? (
                  <ShieldOff className="h-5 w-5 text-red-300" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                )}
              </div>

              <div>
                <h3
                  id={`suspension-title-${customer._id}`}
                  className="text-lg font-bold text-white"
                >
                  {actionLabel}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  {suspending
                    ? `Suspending ${getShopName(customer)} immediately blocks dashboard access and all order capabilities.`
                    : `Restoring ${getShopName(customer)} removes the suspension. Normal readiness rules will still apply.`}
                </p>
              </div>
            </div>

            {customer.isSuspended && customer.suspensionReason && (
              <div className="mt-5 rounded-xl border border-red-400/15 bg-red-400/[0.05] p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-red-300">
                  Current suspension reason
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {customer.suspensionReason}
                </p>
              </div>
            )}

            <label className="mt-5 block">
              <span className="text-sm font-semibold text-slate-300">
                {suspending ? "Suspension reason" : "Restoration reason"}
              </span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={4}
                placeholder={
                  suspending
                    ? "Example: Registration appears automated and contains no legitimate florist information."
                    : "Example: Confirmed legitimate florist account after direct contact."
                }
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-400/10"
              />
              <span className="mt-1 block text-right text-xs text-slate-600">
                {reason.length}/500
              </span>
            </label>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              This action and reason will be recorded in the admin audit log.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setReason("");
                }}
                disabled={saving}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void submitAction()}
                disabled={saving || reason.trim().length < 5}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  suspending
                    ? "bg-red-500 hover:bg-red-400"
                    : "bg-emerald-500 hover:bg-emerald-400"
                }`}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : `Confirm ${actionLabel}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type ReviewStatusActionButtonProps = {
  customer: AdminCustomer;
  onChanged: (
    shopId: string,
    isMarkedSpam: boolean,
    spamReviewReason: string | null,
    markedSpamAt: string | null,
  ) => void;
};

function ReviewStatusActionButton({
  customer,
  onChanged,
}: ReviewStatusActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const markingSpam = !customer.isMarkedSpam;

  async function submitAction() {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 5) {
      toast.error("Please enter a reason of at least 5 characters.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        `/api/admin/customers/${customer._id}/review-status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            markedSpam: markingSpam,
            reason: normalizedReason,
          }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        shop?: {
          _id: string;
          isMarkedSpam: boolean;
          spamReviewReason: string | null;
          markedSpamAt: string | null;
        };
      };
      if (!response.ok || !data.shop)
        throw new Error(data.error || "Failed to update review status.");
      onChanged(
        data.shop._id,
        data.shop.isMarkedSpam,
        data.shop.spamReviewReason,
        data.shop.markedSpamAt,
      );
      toast.success(data.message || "Review status updated.");
      setOpen(false);
      setReason("");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${markingSpam ? "border-amber-400/25 bg-amber-400/[0.08] text-amber-200 hover:bg-amber-400/[0.14]" : "border-blue-400/25 bg-blue-400/[0.08] text-blue-200 hover:bg-blue-400/[0.14]"}`}
      >
        {markingSpam ? (
          <ShieldAlert className="h-4 w-4" />
        ) : (
          <BadgeCheck className="h-4 w-4" />
        )}
        {markingSpam ? "Mark as Spam" : "Mark Legitimate"}
      </button>
      {open && (
        <AccountActionModal
          title={
            markingSpam ? "Mark Account as Spam" : "Mark Account as Legitimate"
          }
          description={
            markingSpam
              ? `Record ${getShopName(customer)} as confirmed spam. This label does not suspend or archive the account automatically.`
              : `Remove the spam designation from ${getShopName(customer)} and record why it is legitimate.`
          }
          reasonLabel={markingSpam ? "Spam review reason" : "Legitimacy reason"}
          reason={reason}
          setReason={setReason}
          saving={saving}
          confirmLabel={markingSpam ? "Confirm Spam" : "Confirm Legitimate"}
          onCancel={() => {
            setOpen(false);
            setReason("");
          }}
          onConfirm={() => void submitAction()}
        />
      )}
    </>
  );
}

type ArchiveActionButtonProps = {
  customer: AdminCustomer;
  onChanged: (
    shopId: string,
    isArchived: boolean,
    archivedReason: string | null,
    archivedAt: string | null,
  ) => void;
};

function ArchiveActionButton({
  customer,
  onChanged,
}: ArchiveActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const archiving = !customer.isArchived;
  const disabled = archiving && !customer.isSuspended;

  async function submitAction() {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 5) {
      toast.error("Please enter a reason of at least 5 characters.");
      return;
    }
    try {
      setSaving(true);
      const response = await fetch(
        `/api/admin/customers/${customer._id}/archive`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            archived: archiving,
            reason: normalizedReason,
          }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        message?: string;
        shop?: {
          _id: string;
          isArchived: boolean;
          archivedReason: string | null;
          archivedAt: string | null;
        };
      };
      if (!response.ok || !data.shop)
        throw new Error(data.error || "Failed to update archive status.");
      onChanged(
        data.shop._id,
        data.shop.isArchived,
        data.shop.archivedReason,
        data.shop.archivedAt,
      );
      toast.success(data.message || "Archive status updated.");
      setOpen(false);
      setReason("");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={
          disabled ? "Suspend this account before archiving it." : undefined
        }
        className="inline-flex items-center gap-2 rounded-xl border border-slate-400/20 bg-slate-400/[0.06] px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:bg-slate-400/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {archiving ? (
          <Archive className="h-4 w-4" />
        ) : (
          <ArchiveRestore className="h-4 w-4" />
        )}
        {archiving ? "Archive" : "Restore Archive"}
      </button>
      {open && (
        <AccountActionModal
          title={archiving ? "Archive Account" : "Restore Archived Account"}
          description={
            archiving
              ? `Archive ${getShopName(customer)}. The account must remain suspended and will be hidden from normal active-account views.`
              : `Restore ${getShopName(customer)} from the archive. The account will remain suspended until you separately restore access.`
          }
          reasonLabel={archiving ? "Archive reason" : "Restore reason"}
          reason={reason}
          setReason={setReason}
          saving={saving}
          confirmLabel={archiving ? "Confirm Archive" : "Confirm Restore"}
          onCancel={() => {
            setOpen(false);
            setReason("");
          }}
          onConfirm={() => void submitAction()}
        />
      )}
    </>
  );
}

type AccountActionModalProps = {
  title: string;
  description: string;
  reasonLabel: string;
  reason: string;
  setReason: (value: string) => void;
  saving: boolean;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

function AccountActionModal({
  title,
  description,
  reasonLabel,
  reason,
  setReason,
  saving,
  confirmLabel,
  onCancel,
  onConfirm,
}: AccountActionModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        <label className="mt-5 block">
          <span className="text-sm font-semibold text-slate-300">
            {reasonLabel}
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={4}
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50"
          />
          <span className="mt-1 block text-right text-xs text-slate-600">
            {reason.length}/500
          </span>
        </label>
        <p className="mt-3 text-xs text-slate-500">
          This action and reason will be recorded in the admin audit log.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold text-slate-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving || reason.trim().length < 5}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type CapabilityStatusProps = {
  label: string;
  available: boolean;
};

function CapabilityStatus({ label, available }: CapabilityStatusProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${
        available
          ? "border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300"
          : "border-amber-400/15 bg-amber-400/[0.05] text-amber-300"
      }`}
    >
      {available ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-current text-[10px] font-black">
          !
        </span>
      )}

      {label}
    </div>
  );
}
