// api/shops/verification/website/route.ts

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import WebsiteVerificationRequest from "@/models/WebsiteVerificationRequest";
import { getAuthenticatedShop } from "@/lib/shops/getAuthenticatedShop";

const resend = new Resend(process.env.RESEND_API_KEY);

function normalizeWebsite(input: string) {
  let website = input.trim();

  if (!website.startsWith("http://") && !website.startsWith("https://")) {
    website = `https://${website}`;
  }

  const url = new URL(website);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Invalid website URL.");
  }

  return url.toString();
}

function cleanText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizePhone(phone?: string) {
  return phone?.replace(/\D/g, "") || "";
}

function hasCompletedVerification(shop: any) {
  const completedOrders = shop.stats?.ordersCompleted ?? 0;
  const reviewCount = shop.reviews?.length ?? 0;

  return (
    !!shop.verification?.emailVerified &&
    !!shop.verification?.websiteVerified &&
    !!shop.isPublic &&
    completedOrders >= 2 &&
    reviewCount >= 2
  );
}

async function sendNeedsReviewEmail({
  shop,
  website,
  failureReason,
  matchedSignals,
  riskSignals,
}: {
  shop: any;
  website: string;
  failureReason: string;
  matchedSignals: string[];
  riskSignals: string[];
}) {
  await resend.emails.send({
    from: "Get Bloom Direct <noreply@getbloomdirect.com>",
    to: "getbloomdirect@gmail.com",
    subject: `Manual Website Verification Needed: ${shop.businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; background:#f6f3ff; padding:24px;">
        <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e9d5ff;">
          <div style="background:#7e22ce; color:#ffffff; padding:20px 24px;">
            <h1 style="margin:0; font-size:22px;">Manual Website Verification Needed</h1>
            <p style="margin:6px 0 0; font-size:14px;">A shop website could not be automatically verified.</p>
          </div>

          <div style="padding:24px;">
            <h2 style="margin:0 0 12px; font-size:18px; color:#111827;">Shop Details</h2>

            <table style="width:100%; border-collapse:collapse; font-size:14px;">
              <tr>
                <td style="padding:8px 0; color:#6b7280;">Shop Name</td>
                <td style="padding:8px 0; font-weight:bold; color:#111827;">${shop.businessName || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#6b7280;">Shop ID</td>
                <td style="padding:8px 0; color:#111827;">${shop._id?.toString()}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#6b7280;">Account Email</td>
                <td style="padding:8px 0; color:#111827;">${shop.email || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#6b7280;">Phone</td>
                <td style="padding:8px 0; color:#111827;">${shop.contact?.phone || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#6b7280;">Location</td>
                <td style="padding:8px 0; color:#111827;">
                  ${shop.address?.city || ""}${shop.address?.city && shop.address?.state ? ", " : ""}${shop.address?.state || ""} ${shop.address?.zip || ""}
                </td>
              </tr>
            </table>

            <div style="margin:22px 0; padding:16px; background:#faf5ff; border:1px solid #e9d5ff; border-radius:12px;">
              <p style="margin:0 0 8px; color:#6b7280; font-size:13px;">Website</p>
              <a href="${website}" target="_blank" style="color:#6d28d9; font-weight:bold; font-size:16px; word-break:break-all;">
                ${website}
              </a>
            </div>

            <h2 style="margin:20px 0 8px; font-size:18px; color:#111827;">Review Reason</h2>
            <p style="margin:0; color:#374151; font-size:14px;">${failureReason}</p>

            <h2 style="margin:20px 0 8px; font-size:18px; color:#111827;">Matched Florist Signals</h2>
            <p style="margin:0; color:#374151; font-size:14px;">
              ${matchedSignals.length ? matchedSignals.join(", ") : "None"}
            </p>

            <h2 style="margin:20px 0 8px; font-size:18px; color:#111827;">Risk Signals</h2>
            <p style="margin:0; color:#374151; font-size:14px;">
              ${riskSignals.length ? riskSignals.join(", ") : "None"}
            </p>

            <div style="margin-top:24px;">
              <a href="${website}" target="_blank" style="display:inline-block; background:#7e22ce; color:#ffffff; text-decoration:none; padding:12px 16px; border-radius:10px; font-weight:bold;">
                Open Website
              </a>
            </div>
          </div>
        </div>
      </div>
    `,
  });
}

async function saveWebsiteNeedsReviewInfo({
  shop,
  website,
  failureReason,
  matchedSignals,
  riskSignals,
}: {
  shop: any;
  website: string;
  failureReason: string;
  matchedSignals: string[];
  riskSignals: string[];
}) {
  const existingRequest =
    await WebsiteVerificationRequest.findOne({
      shop: shop._id,
      status: "pending",
    });

  if (existingRequest) {
    return existingRequest;
  }

  return WebsiteVerificationRequest.create({
    shop: shop._id,
    shopName: shop.businessName,
    shopEmail: shop.email,
    phone: shop.contact?.phone,
    city: shop.address?.city,
    state: shop.address?.state,
    zip: shop.address?.zip,
    websiteUrl: website,
    failureReason,
    matchedSignals,
    riskSignals,
    status: "pending",
  });
}

async function inspectWebsite(website: string, shop: any) {
  const floristSignals = [
    "florist",
    "flowers",
    "flower shop",
    "bouquet",
    "arrangement",
    "sympathy",
    "wedding flowers",
    "funeral flowers",
    "roses",
    "same day delivery",
  ];

  const riskSignals = [
    "send flowers nationwide",
    "flowers delivered anywhere",
    "local florist network",
    "network of florists",
    "partner florist",
    "we route your order",
    "affiliate",
    "order gatherer",
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(website, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GetBloomDirect-WebsiteVerifier/1.0",
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return {
        status: "needs_review",
        failureReason: `Website returned HTTP ${res.status}.`,
        matchedSignals: [],
        riskSignals: [],
      };
    }

    const html = await res.text();
    const text = cleanText(html);

    const matchedSignals = floristSignals.filter((signal) =>
      text.includes(signal),
    );

    const matchedRiskSignals = riskSignals.filter((signal) =>
      text.includes(signal),
    );

    const businessNameMatch =
      shop.businessName &&
      text.includes(shop.businessName.toLowerCase());

    const cityMatch =
      shop.address?.city && text.includes(shop.address.city.toLowerCase());

    const stateMatch =
      shop.address?.state && text.includes(shop.address.state.toLowerCase());

    const phone = normalizePhone(shop.contact?.phone);
    const phoneMatch = phone.length >= 10 && text.replace(/\D/g, "").includes(phone);

    const hasFloristSignals = matchedSignals.length >= 2;
    const hasLocalSignals = !!businessNameMatch || !!cityMatch || !!stateMatch || !!phoneMatch;
    const hasStrongRisk = matchedRiskSignals.length >= 1;

    if (hasFloristSignals && hasLocalSignals && !hasStrongRisk) {
      return {
        status: "verified",
        failureReason: "",
        matchedSignals,
        riskSignals: matchedRiskSignals,
      };
    }

    return {
      status: "needs_review",
      failureReason: hasStrongRisk
        ? "Website contains possible order-gatherer or network language."
        : "Website did not contain enough local florist signals for automatic verification.",
      matchedSignals,
      riskSignals: matchedRiskSignals,
    };
  } catch {
    clearTimeout(timeout);

    return {
      status: "needs_review",
      failureReason: "Website could not be loaded or timed out.",
      matchedSignals: [],
      riskSignals: [],
    };
  }
}

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { website } = await req.json();

    if (!website || typeof website !== "string") {
      return NextResponse.json(
        { error: "Website is required." },
        { status: 400 },
      );
    }

    let normalizedWebsite: string;

    try {
      normalizedWebsite = normalizeWebsite(website);
    } catch {
      return NextResponse.json(
        { error: "Please enter a valid website URL." },
        { status: 400 },
      );
    }

    const shop = await getAuthenticatedShop(session.user.id);

    if (!shop) {
      return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    }

    if (
      shop.websiteVerifications?.status === "needs_review" &&
      !shop.verification?.websiteVerified
    ) {
      return NextResponse.json({
        success: true,
        needsReview: true,
        message:
          "Your website is currently under manual review by a GetBloomDirect admin. You do not need to submit it again.",
        website: shop.contact?.website,
        websiteVerifications: shop.websiteVerifications,
      });
    }

    const result = await inspectWebsite(normalizedWebsite, shop);
    const now = new Date();

    shop.contact.website = normalizedWebsite;

    shop.websiteVerifications = {
      status: result.status,
      checkedAt: now,
      failureReason: result.failureReason,
      matchedSignals: result.matchedSignals,
      riskSignals: result.riskSignals,
    };

    if (result.status === "verified") {
      shop.verification.websiteVerified = true;
      shop.verification.websiteVerifiedAt = now;
    } else {
      shop.verification.websiteVerified = false;
      shop.verification.websiteVerifiedAt = undefined;
    }

    const isNowFullyVerified = hasCompletedVerification(shop);

    if (isNowFullyVerified) {
      shop.isVerified = true;
      shop.verifiedFlorist = true;
      shop.verification.verifiedAt = shop.verification.verifiedAt || now;
    }

    await shop.save();

    if (result.status === "needs_review") {
      await sendNeedsReviewEmail({
        shop,
        website: normalizedWebsite,
        failureReason: result.failureReason,
        matchedSignals: result.matchedSignals,
        riskSignals: result.riskSignals,
      });

      await saveWebsiteNeedsReviewInfo({
        shop,
        website: normalizedWebsite,
        failureReason: result.failureReason,
        matchedSignals: result.matchedSignals,
        riskSignals: result.riskSignals,
      });
    }

    return NextResponse.json({
      success: true,
      needsReview: result.status === "needs_review",
      message:
        result.status === "verified"
          ? "Website verified successfully."
          : "Your website has been submitted for manual review. A GetBloomDirect admin will review it soon.",
      website: normalizedWebsite,
      websiteVerifications: shop.websiteVerifications,
      verification: {
        websiteVerified: shop.verification.websiteVerified,
        websiteVerifiedAt: shop.verification.websiteVerifiedAt,
        verifiedAt: shop.verification.verifiedAt,
      },
      isVerified: shop.isVerified,
      verifiedFlorist: shop.verifiedFlorist,
      isFullyVerified: isNowFullyVerified,
    });
  } catch (err) {
    console.error("Website verification error:", err);

    return NextResponse.json(
      { error: "Failed to verify website." },
      { status: 500 },
    );
  }
}