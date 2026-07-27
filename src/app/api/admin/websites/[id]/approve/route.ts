// /app/api/admin/websites/[id]/approve/route.ts

import authOptions from "@/lib/auth";
import { sendWebsiteApprovedEmail } from "@/lib/email/websiteVerificationDecisionEmail";
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

export async function POST(
  _request: Request,
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

    await connectToDB();

    const { id } = await context.params;
    const now = new Date();

    const request =
      await WebsiteVerificationRequest.findOneAndUpdate(
        {
          _id: id,
          status: "pending",
        },
        {
          $set: {
            status: "approved",
            reviewedBy: session.user.id,
            reviewedAt: now,
          },
        },
        {
          new: true,
        },
      );

    if (!request) {
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
      request.shop,
      {
        $set: {
          "verification.websiteVerified": true,
          "verification.websiteVerifiedAt": now,
          "contact.website": request.websiteUrl,

          websiteVerifications: {
            status: "verified",
            checkedAt: now,
            failureReason: "",
            matchedSignals:
              request.matchedSignals || [],
            riskSignals: request.riskSignals || [],
          },
        },
      },
      {
        new: true,
      },
    );

    if (!shop) {
      await WebsiteVerificationRequest.findByIdAndUpdate(
        request._id,
        {
          $set: {
            status: "pending",
          },
          $unset: {
            reviewedBy: 1,
            reviewedAt: 1,
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
        await sendWebsiteApprovedEmail({
          to: shop.email,
          shopName:
            shop.businessName ||
            request.shopName ||
            "Your Shop",
          websiteUrl: request.websiteUrl,
        });

        emailSent = true;
      } catch (emailError: unknown) {
        console.error(
          "Website approval email failed:",
          emailError,
        );

        emailWarning =
          "The website was approved, but the confirmation email could not be sent.";
      }
    }

    return NextResponse.json({
      success: true,
      message: "Website verification approved.",
      emailSent,
      warning: emailWarning,
    });
  } catch (error: unknown) {
    console.error(
      "Approve website verification failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to approve website verification.",
      },
      { status: 500 },
    );
  }
}