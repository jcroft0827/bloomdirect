// /app/api/admin/websites/[id]/decline/route.ts

import authOptions from "@/lib/auth";
import { sendWebsiteDeclinedEmail } from "@/lib/email/websiteVerificationDecisionEmail";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import WebsiteVerificationRequest from "@/models/WebsiteVerificationRequest";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type DeclineBody = {
  reason?: unknown;
};

export async function POST(
  requestBody: Request,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    let body: DeclineBody;

    try {
      body = (await requestBody.json()) as DeclineBody;
    } catch {
      return NextResponse.json(
        { error: "A decline reason is required." },
        { status: 400 },
      );
    }

    const declineReason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    if (declineReason.length < 10) {
      return NextResponse.json(
        {
          error:
            "Please provide a clear decline reason of at least 10 characters.",
        },
        { status: 400 },
      );
    }

    if (declineReason.length > 500) {
      return NextResponse.json(
        {
          error:
            "The decline reason must be 500 characters or fewer.",
        },
        { status: 400 },
      );
    }

    await connectToDB();

    const { id } = await context.params;
    const now = new Date();

    const verificationRequest =
      await WebsiteVerificationRequest.findOneAndUpdate(
        {
          _id: id,
          status: "pending",
        },
        {
          $set: {
            status: "declined",
            reviewedBy: session.user.id,
            reviewedAt: now,
            declineReason,
          },
        },
        {
          new: true,
        },
      );

    if (!verificationRequest) {
      const existingRequest =
        await WebsiteVerificationRequest.findById(id)
          .select("status");

      if (!existingRequest) {
        return NextResponse.json(
          {
            error:
              "Website verification request not found.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json(
        {
          error: `This request has already been ${existingRequest.status}.`,
        },
        { status: 409 },
      );
    }

    const shop = await Shop.findByIdAndUpdate(
      verificationRequest.shop,
      {
        $set: {
          "verification.websiteVerified": false,

          websiteVerifications: {
            status: "declined",
            checkedAt: now,
            failureReason: declineReason,
            matchedSignals:
              verificationRequest.matchedSignals || [],
            riskSignals:
              verificationRequest.riskSignals || [],
          },
        },

        $unset: {
          "verification.websiteVerifiedAt": 1,
        },
      },
      {
        new: true,
      },
    );

    if (!shop) {
      await WebsiteVerificationRequest.findByIdAndUpdate(
        verificationRequest._id,
        {
          $set: {
            status: "pending",
          },
          $unset: {
            reviewedBy: 1,
            reviewedAt: 1,
            declineReason: 1,
          },
        },
      );

      return NextResponse.json(
        { error: "Shop not found." },
        { status: 404 },
      );
    }

    let emailSent = false;
    let emailWarning: string | null = null;

    if (shop.email) {
      try {
        await sendWebsiteDeclinedEmail({
          to: shop.email,
          shopName:
            shop.businessName ||
            verificationRequest.shopName ||
            "Your Shop",
          websiteUrl:
            verificationRequest.websiteUrl,

          // Add this argument if your helper supports it.
          reason: declineReason,
        });

        emailSent = true;
      } catch (emailError: unknown) {
        console.error(
          "Website decline email failed:",
          emailError,
        );

        emailWarning =
          "The website was declined, but the notification email could not be sent.";
      }
    }

    return NextResponse.json({
      success: true,
      message: "Website verification declined.",
      emailSent,
      warning: emailWarning,
    });
  } catch (error: unknown) {
    console.error(
      "Decline website verification failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to decline website verification.",
      },
      { status: 500 },
    );
  }
}