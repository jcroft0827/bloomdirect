"use client";

import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Crown,
  ExternalLink,
  Globe2,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Store,
  UserRoundCog,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

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

type AdminCustomer = {
  _id: string;
  businessName?: string;
  shopName?: string;
  email?: string;
  role?: string;

  isPro?: boolean;
  isPublic?: boolean;
  isSuspended?: boolean;

  isVerified?: boolean;
  verifiedFlorist?: boolean;

  createdAt?: string;
  lastLogin?: string;

  readiness: ShopReadiness;

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
  error?: string;
};

type ShopFilter =
  | "all"
  | "pro"
  | "free"
  | "verified"
  | "ready"
  | "needs_attention"
  | "searchable"
  | "private"
  | "suspended";

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
  { label: "Searchable", value: "searchable" },
  { label: "Private", value: "private" },
  { label: "Suspended", value: "suspended" },
];

export default function ShopsClient() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ShopFilter>("all");

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

  const metrics = useMemo(() => {
    return {
      total: customers.length,

      pro: customers.filter((customer) => customer.isPro).length,

      ready: customers.filter(isShopReady).length,

      needsAttention: customers.filter((customer) => !isShopReady(customer))
        .length,
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

        case "searchable":
          return customer.readiness.capabilities.canAppearInSearch;

        case "private":
          return !customer.isPublic;

        case "suspended":
          return Boolean(customer.isSuspended);

        case "all":
        default:
          return true;
      }
    });
  }, [activeFilter, customers, searchQuery]);

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
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              <ShopCard key={customer._id} customer={customer} />
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
};

function ShopCard({ customer }: ShopCardProps) {
  const cityState = [customer.address?.city, customer.address?.state]
    .filter(Boolean)
    .join(", ");

  const location = [cityState, customer.address?.zip].filter(Boolean).join(" ");

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 sm:p-6">
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

            {customer.isSuspended && (
              <StatusBadge label="Suspended" variant="red" />
            )}
          </div>
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

        <ReadinessReminderButton customer={customer} />
      </div>
    </article>
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

type StatusBadgeProps = {
  label: string;
  variant: "violet" | "emerald" | "blue" | "amber" | "red" | "slate";
};

const statusBadgeClasses: Record<StatusBadgeProps["variant"], string> = {
  violet: "bg-violet-400/10 text-violet-300",
  emerald: "bg-emerald-400/10 text-emerald-300",
  blue: "bg-blue-400/10 text-blue-300",
  amber: "bg-amber-400/10 text-amber-300",
  red: "bg-red-400/10 text-red-300",
  slate: "bg-slate-400/10 text-slate-300",
};

function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClasses[variant]}`}
    >
      {label}
    </span>
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

  if (!needsReminder || customer.isSuspended || customer.role === "admin") {
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
