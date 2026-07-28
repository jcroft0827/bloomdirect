// /api/admin/customers/[shopId]/send-readiness-reminder/route.ts

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import {
  getShopReadiness,
  type ShopReadiness,
} from "@/lib/shops/getShopReadiness";
import { EmailEvent } from "@/models/EmailEvent";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const REMINDER_TYPE = "SHOP_READINESS_REMINDER";
const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type RouteContext = {
  params: Promise<{
    shopId: string;
  }>;
};

type MissingRequirement = ShopReadiness["incompleteRequirements"][number];

const requirementLabels: Record<MissingRequirement, string> = {
  emailVerification: "Verify your email address",
  businessInformation: "Complete your business information",
  paymentMethods: "Add a payment method",
  deliverySettings: "Configure your delivery coverage",
  financialSettings: "Confirm your taxes and fees",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://getbloomdirect.com"
  ).replace(/\/$/, "");
}

function getReadinessImpacts(readiness: ShopReadiness) {
  const impacts: Array<{
    allowed: boolean;
    label: string;
    blockedMessage: string;
  }> = [
    {
      allowed: readiness.capabilities.canAppearInSearch,
      label: "Appear in florist searches",
      blockedMessage:
        "Other florists cannot currently find your shop in florist searches.",
    },
    {
      allowed: readiness.capabilities.canReceiveOrders,
      label: "Receive florist orders",
      blockedMessage:
        "Your shop cannot currently receive florist orders through the network.",
    },
    {
      allowed: readiness.capabilities.canSendOrders,
      label: "Send florist orders",
      blockedMessage:
        "Your shop cannot currently send florist orders through GetBloomDirect.",
    },
    {
      allowed: readiness.capabilities.canAcceptOrders,
      label: "Accept florist orders",
      blockedMessage: "Your shop cannot currently accept florist orders.",
    },
  ];

  return impacts;
}

function buildReminderEmail({
  shopName,
  readiness,
  isPublic,
}: {
  shopName: string;
  readiness: ShopReadiness;
  isPublic: boolean;
}) {
  const baseUrl = getBaseUrl();

  const loginUrl = `${baseUrl}/login?callbackUrl=${encodeURIComponent(
    "/dashboard",
  )}`;

  const impacts = getReadinessImpacts(readiness);
  const blockedImpacts = impacts.filter((impact) => !impact.allowed);

  const missingSteps = readiness.incompleteRequirements.map(
    (requirement) => requirementLabels[requirement],
  );

  if (!isPublic) {
    missingSteps.push("Make your florist profile public");
  }

  const uniqueMissingSteps = [...new Set(missingSteps)];

  const impactRows = impacts
    .map(
      (impact) => `
        <tr>
          <td
            style="
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
              vertical-align: top;
              width: 28px;
              font-size: 18px;
            "
          >
            ${impact.allowed ? "✅" : "❌"}
          </td>

          <td
            style="
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
              color: #334155;
              font-size: 15px;
              line-height: 22px;
            "
          >
            ${escapeHtml(impact.label)}
          </td>
        </tr>
      `,
    )
    .join("");

  const missingStepItems = uniqueMissingSteps
    .map(
      (step) => `
        <li style="margin-bottom: 8px;">
          ${escapeHtml(step)}
        </li>
      `,
    )
    .join("");

  const primaryImpact =
    blockedImpacts.length > 0
      ? blockedImpacts[0].blockedMessage
      : "A few account details still need your attention.";

  const subject = "Finish setting up your GetBloomDirect account";

  const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
        "
      >
        <div style="padding: 32px 16px;">
          <div
            style="
              max-width: 620px;
              margin: 0 auto;
              overflow: hidden;
              border: 1px solid #e2e8f0;
              border-radius: 18px;
              background-color: #ffffff;
            "
          >
            <div
              style="
                padding: 28px 32px;
                background-color: #111827;
                color: #ffffff;
              "
            >
              <p
                style="
                  margin: 0;
                  color: #c4b5fd;
                  font-size: 12px;
                  font-weight: 700;
                  letter-spacing: 1.5px;
                  text-transform: uppercase;
                "
              >
                GetBloomDirect
              </p>

              <h1
                style="
                  margin: 10px 0 0;
                  font-size: 27px;
                  line-height: 34px;
                "
              >
                You’re almost ready.
              </h1>
            </div>

            <div style="padding: 32px;">
              <p
                style="
                  margin: 0 0 18px;
                  font-size: 16px;
                  line-height: 25px;
                "
              >
                Hi ${escapeHtml(shopName)},
              </p>

              <p
                style="
                  margin: 0 0 18px;
                  color: #334155;
                  font-size: 16px;
                  line-height: 25px;
                "
              >
                Your GetBloomDirect account still has a few setup items that
                need attention.
              </p>

              <p
                style="
                  margin: 0 0 24px;
                  color: #334155;
                  font-size: 16px;
                  line-height: 25px;
                "
              >
                ${escapeHtml(primaryImpact)}
                Completing your setup helps your shop participate fully in the
                GetBloomDirect florist network.
              </p>

              <div
                style="
                  margin: 24px 0;
                  padding: 20px;
                  border: 1px solid #e2e8f0;
                  border-radius: 14px;
                  background-color: #f8fafc;
                "
              >
                <p
                  style="
                    margin: 0 0 12px;
                    color: #475569;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                  "
                >
                  Your current account access
                </p>

                <table
                  role="presentation"
                  style="
                    width: 100%;
                    border-collapse: collapse;
                  "
                >
                  ${impactRows}
                </table>
              </div>

              ${
                uniqueMissingSteps.length > 0
                  ? `
                    <div style="margin: 24px 0;">
                      <p
                        style="
                          margin: 0 0 12px;
                          color: #334155;
                          font-size: 15px;
                          font-weight: 700;
                        "
                      >
                        Remaining setup steps:
                      </p>

                      <ul
                        style="
                          margin: 0;
                          padding-left: 22px;
                          color: #475569;
                          font-size: 15px;
                          line-height: 23px;
                        "
                      >
                        ${missingStepItems}
                      </ul>
                    </div>
                  `
                  : ""
              }

              <div style="margin: 30px 0;">
                <a
                  href="${loginUrl}"
                  style="
                    display: inline-block;
                    border-radius: 10px;
                    background-color: #7c3aed;
                    padding: 13px 22px;
                    color: #ffffff;
                    font-size: 15px;
                    font-weight: 700;
                    text-decoration: none;
                  "
                >
                  Finish My Setup
                </a>
              </div>

              <p
                style="
                  margin: 0;
                  color: #64748b;
                  font-size: 14px;
                  line-height: 22px;
                "
              >
                After signing in, your dashboard will show exactly which
                account-readiness items still need to be completed.
              </p>

              <p
                style="
                  margin: 26px 0 0;
                  color: #334155;
                  font-size: 15px;
                  line-height: 23px;
                "
              >
                — The GetBloomDirect Team
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${shopName},

You’re almost ready on GetBloomDirect.

Your account still has a few setup items that need attention.

${primaryImpact}

Your current account access:

${impacts
  .map(
    (impact) =>
      `${impact.allowed ? "Available" : "Unavailable"}: ${impact.label}`,
  )
  .join("\n")}

${
  uniqueMissingSteps.length > 0
    ? `Remaining setup steps:\n${uniqueMissingSteps
        .map((step) => `- ${step}`)
        .join("\n")}`
    : ""
}

Sign in and finish your setup:
${loginUrl}

After signing in, your dashboard will show exactly which account-readiness items still need to be completed.

— The GetBloomDirect Team
  `.trim();

  return {
    subject,
    html,
    text,
    loginUrl,
    blockedCapabilities: blockedImpacts.map((impact) => impact.label),
    missingSteps: uniqueMissingSteps,
  };
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDB();

    const { shopId } = await context.params;

    const shop = await Shop.findById(shopId).select(
      [
        "businessName",
        "shopName",
        "email",
        "role",
        "isPublic",
        "isSuspended",
        "verification.emailVerified",
        "setupProgress.financialSettings",
        "contact",
        "address",
        "paymentMethods",
        "delivery",
        "financials",
      ].join(" "),
    );

    if (!shop) {
      return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    }

    if (shop.role === "admin") {
      return NextResponse.json(
        { error: "Readiness reminders cannot be sent to Admin accounts." },
        { status: 400 },
      );
    }

    if (shop.isSuspended === true) {
      return NextResponse.json(
        {
          error:
            "This shop is suspended. Resolve the suspension before sending a readiness reminder.",
        },
        { status: 400 },
      );
    }

    if (typeof shop.email !== "string" || shop.email.trim().length === 0) {
      return NextResponse.json(
        { error: "This shop does not have a valid email address." },
        { status: 400 },
      );
    }

    const readiness = getShopReadiness(shop);

    const isFullyParticipating =
      readiness.capabilities.canAppearInSearch &&
      readiness.capabilities.canReceiveOrders &&
      readiness.capabilities.canSendOrders &&
      readiness.capabilities.canAcceptOrders;

    if (isFullyParticipating) {
      return NextResponse.json(
        {
          error:
            "This shop is already fully ready and does not need a readiness reminder.",
        },
        { status: 400 },
      );
    }

    const cooldownStartedAt = new Date(Date.now() - REMINDER_COOLDOWN_MS);

    const recentReminder = await EmailEvent.findOne({
      type: REMINDER_TYPE,
      status: "sent",
      "payload.targetShopId": shopId,
      createdAt: {
        $gte: cooldownStartedAt,
      },
    }).sort({ createdAt: -1 });

    if (recentReminder?.createdAt) {
      const nextAllowedAt = new Date(
        new Date(recentReminder.createdAt).getTime() + REMINDER_COOLDOWN_MS,
      );

      return NextResponse.json(
        {
          error:
            "A readiness reminder was already sent to this shop within the last 24 hours.",
          nextAllowedAt,
        },
        { status: 429 },
      );
    }

    const shopName = shop.businessName || shop.shopName || "your florist shop";

    const email = buildReminderEmail({
      shopName,
      readiness,
      isPublic: shop.isPublic === true,
    });

    const fromAddress = "GetBloomDirect <noreply@getbloomdirect.com>";

    try {
      const result = await resend.emails.send({
        from: fromAddress,
        to: shop.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      await EmailEvent.create({
        type: REMINDER_TYPE,
        to: shop.email,
        subject: email.subject,
        status: "sent",
        resendId: result.data?.id,

        payload: {
          targetShopId: shopId,
          targetShopName: shopName,
          sentByAdminId: session.user.id,
          readiness,
          blockedCapabilities: email.blockedCapabilities,
          missingSteps: email.missingSteps,
          actionUrl: email.loginUrl,
        },
      });

      const sentAt = new Date();

      return NextResponse.json({
        success: true,
        message: `Readiness reminder sent to ${shopName}.`,
        sentAt: sentAt.toISOString(),
        nextAllowedAt: new Date(
          sentAt.getTime() + REMINDER_COOLDOWN_MS,
        ).toISOString(),
      });
    } catch (emailError: unknown) {
      const errorMessage =
        emailError instanceof Error
          ? emailError.message
          : "Unknown email error.";

      await EmailEvent.create({
        type: REMINDER_TYPE,
        to: shop.email,
        subject: email.subject,
        status: "failed",
        error: errorMessage,

        payload: {
          targetShopId: shopId,
          targetShopName: shopName,
          sentByAdminId: session.user.id,
          readiness,
          blockedCapabilities: email.blockedCapabilities,
          missingSteps: email.missingSteps,
          actionUrl: email.loginUrl,
        },
      });

      throw emailError;
    }
  } catch (error: unknown) {
    console.error("Failed to send shop readiness reminder:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to send readiness reminder.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
