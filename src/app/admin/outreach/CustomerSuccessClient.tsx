"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type InvitationStatus = "draft" | "sent" | "failed" | "registered" | "declined";

type InvitationItem = {
  id: string;
  recordType: "invitation";
  stage: "needs_follow_up" | "invited";

  shopName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;

  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };

  source: string;
  status: InvitationStatus;
  notes: string;

  invitationDestination: "homepage" | "registration";

  sendCount: number;
  sendError: string;

  invitedAt: string | null;
  lastSentAt: string | null;
  lastContactedAt: string | null;
  declinedAt: string | null;
  convertedAt: string | null;

  daysSinceLastContact: number | null;
  followUpReason: string | null;

  registeredShop?: unknown;
};

type IncompleteRequirement =
  | "emailVerification"
  | "businessInformation"
  | "paymentMethods"
  | "deliverySettings"
  | "financialSettings";

type ShopItem = {
  id: string;
  recordType: "shop";
  stage: "onboarding" | "active";

  shopName: string;
  email: string;
  slug: string;

  isPublic: boolean;
  isSuspended: boolean;
  isPro: boolean;

  readiness: {
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

  createdAt: string | null;
  updatedAt: string | null;
};

type CustomerSuccessResponse = {
  success: boolean;

  summary: {
    needsFollowUp: number;
    invited: number;
    onboarding: number;
    active: number;
    declined: number;
  };

  groups: {
    needsFollowUp: InvitationItem[];
    invited: InvitationItem[];
    onboarding: ShopItem[];
    active: ShopItem[];
    declined: InvitationItem[];
  };
};

type Tab = "needsFollowUp" | "invited" | "onboarding" | "active" | "declined";

type ActionState = {
  invitationId: string;
  action: "update_notes" | "mark_contacted" | "mark_declined" | "resend";
} | null;

const EMPTY_DATA: CustomerSuccessResponse = {
  success: true,

  summary: {
    needsFollowUp: 0,
    invited: 0,
    onboarding: 0,
    active: 0,
    declined: 0,
  },

  groups: {
    needsFollowUp: [],
    invited: [],
    onboarding: [],
    active: [],
    declined: [],
  },
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatRequirement(requirement: IncompleteRequirement): string {
  switch (requirement) {
    case "emailVerification":
      return "Verify email";

    case "businessInformation":
      return "Business information";

    case "paymentMethods":
      return "Payment method";

    case "deliverySettings":
      return "Delivery coverage";

    case "financialSettings":
      return "Financial settings";

    default:
      return requirement;
  }
}

function formatSource(source?: string) {
  if (!source) {
    return "Other";
  }

  return source
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getInvitationStatusClasses(status: InvitationStatus) {
  switch (status) {
    case "sent":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "failed":
      return "bg-red-50 text-red-700 ring-red-200";

    case "registered":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "declined":
      return "bg-slate-100 text-slate-700 ring-slate-200";

    case "draft":
    default:
      return "bg-amber-50 text-amber-700 ring-amber-200";
  }
}

function getInvitationStatusLabel(status: InvitationStatus) {
  switch (status) {
    case "sent":
      return "Invited";

    case "failed":
      return "Email Failed";

    case "registered":
      return "Registered";

    case "declined":
      return "Declined";

    case "draft":
    default:
      return "Draft";
  }
}

export default function CustomerSuccessClient() {
  const [data, setData] = useState<CustomerSuccessResponse>(EMPTY_DATA);

  const [activeTab, setActiveTab] = useState<Tab>("needsFollowUp");

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [actionState, setActionState] = useState<ActionState>(null);

  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>(
    {},
  );

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadCustomerSuccess = useCallback(async () => {
    try {
      setLoadError("");

      const response = await fetch("/api/admin/customer-success", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load Customer Success.");
      }

      const nextData = result as CustomerSuccessResponse;

      setData(nextData);

      const nextDrafts: Record<string, string> = {};

      [
        ...nextData.groups.needsFollowUp,
        ...nextData.groups.invited,
        ...nextData.groups.declined,
      ].forEach((invitation) => {
        nextDrafts[invitation.id] = invitation.notes || "";
      });

      setNoteDrafts(nextDrafts);
    } catch (error) {
      console.error("Failed to load Customer Success:", error);

      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load Customer Success.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomerSuccess();
  }, [loadCustomerSuccess]);

  const summaryCards = useMemo(
    () => [
      {
        key: "needsFollowUp" as const,
        label: "Needs Follow-Up",
        count: data.summary.needsFollowUp,
        description: "Florists needing your attention",
      },
      {
        key: "invited" as const,
        label: "Invited",
        count: data.summary.invited,
        description: "Invitations still in progress",
      },
      {
        key: "onboarding" as const,
        label: "Onboarding",
        count: data.summary.onboarding,
        description: "Registered but not fully ready",
      },
      {
        key: "active" as const,
        label: "Active",
        count: data.summary.active,
        description: "Ready to send and receive",
      },
      {
        key: "declined" as const,
        label: "Declined",
        count: data.summary.declined,
        description: "Prospects not moving forward",
      },
    ],
    [data.summary],
  );

  async function runInvitationAction(
    invitationId: string,
    action: "update_notes" | "mark_contacted" | "mark_declined",
    notes?: string,
  ) {
    try {
      setFeedback(null);

      setActionState({
        invitationId,
        action,
      });

      const response = await fetch(`/api/admin/invitations/${invitationId}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          action,
          ...(typeof notes === "string" ? { notes } : {}),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update florist.");
      }

      setFeedback({
        type: "success",
        message:
          action === "update_notes"
            ? "Notes saved."
            : action === "mark_contacted"
              ? "Contact recorded."
              : "Florist marked as declined.",
      });

      await loadCustomerSuccess();
    } catch (error) {
      console.error("Customer Success update failed:", error);

      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Unable to update florist.",
      });
    } finally {
      setActionState(null);
    }
  }

  async function resendInvitation(invitationId: string) {
    try {
      setFeedback(null);

      setActionState({
        invitationId,
        action: "resend",
      });

      const response = await fetch(
        `/api/admin/invitations/${invitationId}/resend`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({}),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to resend invitation.");
      }

      setFeedback({
        type: "success",
        message: "Invitation sent.",
      });

      await loadCustomerSuccess();
    } catch (error) {
      console.error("Failed to resend invitation:", error);

      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to resend invitation.",
      });
    } finally {
      setActionState(null);
    }
  }

  function isWorking(
    invitationId: string,
    action?: NonNullable<ActionState>["action"],
  ) {
    if (!actionState) {
      return false;
    }

    if (actionState.invitationId !== invitationId) {
      return false;
    }

    if (!action) {
      return true;
    }

    return actionState.action === action;
  }

  function renderInvitationCard(invitation: InvitationItem) {
    const noteIsExpanded = expandedNotes[invitation.id] === true;

    const noteDraft = noteDrafts[invitation.id] ?? "";

    return (
      <article
        key={invitation.id}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                {invitation.shopName}
              </h3>

              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getInvitationStatusClasses(
                  invitation.status,
                )}`}
              >
                {getInvitationStatusLabel(invitation.status)}
              </span>

              {invitation.followUpReason ? (
                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                  {invitation.followUpReason}
                </span>
              ) : null}
            </div>

            <p className="mt-1 text-sm font-medium text-slate-600">
              {invitation.contactName}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              <a
                href={`mailto:${invitation.email}`}
                className="hover:text-purple-700 hover:underline"
              >
                {invitation.email}
              </a>

              {invitation.phone ? (
                <a
                  href={`tel:${invitation.phone}`}
                  className="hover:text-purple-700 hover:underline"
                >
                  {invitation.phone}
                </a>
              ) : null}

              {invitation.website ? (
                <a
                  href={invitation.website}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-purple-700 hover:underline"
                >
                  Website
                </a>
              ) : null}
            </div>

            {(invitation.address.city ||
              invitation.address.state ||
              invitation.address.zip) && (
              <p className="mt-2 text-sm text-slate-500">
                {[
                  invitation.address.city,
                  invitation.address.state,
                  invitation.address.zip,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {invitation.status !== "declined" ? (
              <>
                <button
                  type="button"
                  disabled={isWorking(invitation.id)}
                  onClick={() =>
                    void runInvitationAction(invitation.id, "mark_contacted")
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isWorking(invitation.id, "mark_contacted")
                    ? "Saving..."
                    : "Mark Contacted"}
                </button>

                <button
                  type="button"
                  disabled={isWorking(invitation.id)}
                  onClick={() => void resendInvitation(invitation.id)}
                  className="rounded-lg bg-purple-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isWorking(invitation.id, "resend")
                    ? "Sending..."
                    : "Resend Invite"}
                </button>

                <button
                  type="button"
                  disabled={isWorking(invitation.id)}
                  onClick={() => {
                    const confirmed = window.confirm(
                      `Mark ${invitation.shopName} as declined?`,
                    );

                    if (!confirmed) {
                      return;
                    }

                    void runInvitationAction(
                      invitation.id,
                      "mark_declined",
                      noteDraft,
                    );
                  }}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isWorking(invitation.id, "mark_declined")
                    ? "Saving..."
                    : "Declined"}
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={() =>
                setExpandedNotes((current) => ({
                  ...current,
                  [invitation.id]: !current[invitation.id],
                }))
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {noteIsExpanded
                ? "Hide Notes"
                : invitation.notes
                  ? "Edit Notes"
                  : "Add Note"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="font-semibold text-slate-500">Source</p>

            <p className="mt-1 text-slate-800">
              {formatSource(invitation.source)}
            </p>
          </div>

          <div>
            <p className="font-semibold text-slate-500">Last Contact</p>

            <p className="mt-1 text-slate-800">
              {formatDate(invitation.lastContactedAt)}
            </p>
          </div>

          <div>
            <p className="font-semibold text-slate-500">Last Invite</p>

            <p className="mt-1 text-slate-800">
              {formatDate(invitation.lastSentAt)}
            </p>
          </div>

          <div>
            <p className="font-semibold text-slate-500">Invites Sent</p>

            <p className="mt-1 text-slate-800">{invitation.sendCount}</p>
          </div>
        </div>

        {invitation.sendError ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-800">
              Email delivery problem
            </p>

            <p className="mt-1 break-words text-sm text-red-700">
              {invitation.sendError}
            </p>
          </div>
        ) : null}

        {!noteIsExpanded && invitation.notes ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Notes
            </p>

            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
              {invitation.notes}
            </p>
          </div>
        ) : null}

        {noteIsExpanded ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label
              htmlFor={`notes-${invitation.id}`}
              className="text-sm font-bold text-slate-800"
            >
              Customer Success Notes
            </label>

            <textarea
              id={`notes-${invitation.id}`}
              value={noteDraft}
              onChange={(event) =>
                setNoteDrafts((current) => ({
                  ...current,
                  [invitation.id]: event.target.value,
                }))
              }
              rows={4}
              placeholder="Add call notes, follow-up details, objections, or anything useful for the next conversation."
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
            />

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={isWorking(invitation.id)}
                onClick={() =>
                  void runInvitationAction(
                    invitation.id,
                    "update_notes",
                    noteDraft,
                  )
                }
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isWorking(invitation.id, "update_notes")
                  ? "Saving..."
                  : "Save Notes"}
              </button>
            </div>
          </div>
        ) : null}
      </article>
    );
  }

  function renderShopCard(shop: ShopItem) {
    const missing = shop.readiness.incompleteRequirements;

    return (
      <article
        key={shop.id}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                {shop.shopName || "Unnamed Shop"}
              </h3>

              {shop.isPro ? (
                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 ring-1 ring-inset ring-purple-200">
                  Bloom Pro
                </span>
              ) : null}

              {shop.isSuspended ? (
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-inset ring-red-200">
                  Suspended
                </span>
              ) : null}

              {shop.isPublic ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  Public
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200">
                  Private
                </span>
              )}
            </div>

            <a
              href={`mailto:${shop.email}`}
              className="mt-2 inline-block text-sm text-slate-600 hover:text-purple-700 hover:underline"
            >
              {shop.email}
            </a>
          </div>

          <div className="min-w-[150px]">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-600">Setup</span>

              <span className="font-bold text-slate-900">
                {shop.readiness.completionPercentage}%
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-purple-600 transition-all"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, shop.readiness.completionPercentage),
                  )}%`,
                }}
              />
            </div>

            <p className="mt-2 text-right text-xs text-slate-500">
              {shop.readiness.completedCount} of {shop.readiness.totalCount}{" "}
              complete
            </p>
          </div>
        </div>

        {shop.stage === "onboarding" ? (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-sm font-bold text-slate-700">Still needed</p>

            {missing.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {missing.map((requirement) => (
                  <span
                    key={requirement}
                    className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"
                  >
                    {formatRequirement(requirement)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">
                Setup requirements are complete, but this shop is not yet fully
                able to send and receive orders.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                Can Send Orders
              </span>

              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                Can Receive Orders
              </span>
            </div>
          </div>
        )}
      </article>
    );
  }

  function renderCurrentGroup() {
    switch (activeTab) {
      case "needsFollowUp":
        return data.groups.needsFollowUp.map(renderInvitationCard);

      case "invited":
        return data.groups.invited.map(renderInvitationCard);

      case "onboarding":
        return data.groups.onboarding.map(renderShopCard);

      case "active":
        return data.groups.active.map(renderShopCard);

      case "declined":
        return data.groups.declined.map(renderInvitationCard);

      default:
        return null;
    }
  }

  const currentCount =
    activeTab === "needsFollowUp"
      ? data.groups.needsFollowUp.length
      : activeTab === "invited"
        ? data.groups.invited.length
        : activeTab === "onboarding"
          ? data.groups.onboarding.length
          : activeTab === "active"
            ? data.groups.active.length
            : data.groups.declined.length;

  return (
    <div className="space-y-6">
      {feedback ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => {
          const selected = activeTab === card.key;

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveTab(card.key)}
              className={`rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-purple-300 bg-purple-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-purple-200 hover:bg-slate-50"
              }`}
            >
              <p
                className={`text-sm font-bold ${
                  selected ? "text-purple-800" : "text-slate-700"
                }`}
              >
                {card.label}
              </p>

              <p className="mt-2 text-3xl font-black text-slate-900">
                {card.count}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {card.description}
              </p>
            </button>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {summaryCards.find((card) => card.key === activeTab)?.label ||
                "Customer Success"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {summaryCards.find((card) => card.key === activeTab)
                ?.description || ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadCustomerSuccess();
            }}
            disabled={loading}
            className="self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="font-semibold text-slate-700">
              Loading Customer Success...
            </p>
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
            <p className="font-bold text-red-800">
              Customer Success could not be loaded.
            </p>

            <p className="mt-2 text-sm text-red-700">{loadError}</p>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void loadCustomerSuccess();
              }}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              Try Again
            </button>
          </div>
        ) : currentCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="font-bold text-slate-800">Nothing here right now.</p>

            <p className="mt-2 text-sm text-slate-500">
              This group will update automatically as florists move through
              GetBloomDirect.
            </p>
          </div>
        ) : (
          <div className="space-y-4">{renderCurrentGroup()}</div>
        )}
      </section>
    </div>
  );
}
