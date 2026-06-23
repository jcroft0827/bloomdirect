import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { sendWebsiteDeclinedEmail } from "@/lib/email/websiteVerificationDecisionEmail";
import Shop from "@/models/Shop";
import WebsiteVerificationRequest from "@/models/WebsiteVerificationRequest";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const now = new Date();

    const request = await WebsiteVerificationRequest.findById(id);

    if (!request) {
      return NextResponse.json(
        { error: "Website verification request not found." },
        { status: 404 }
      );
    }

    const shop = await Shop.findById(request.shop);

    if (!shop) {
      return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    }

    shop.verification.websiteVerified = false;
    shop.verification.websiteVerifiedAt = undefined;

    shop.websiteVerifications = {
      status: "declined",
      checkedAt: now,
      failureReason:
        request.failureReason || "Website was declined after manual review.",
      matchedSignals: request.matchedSignals || [],
      riskSignals: request.riskSignals || [],
    };

    await shop.save();

    request.status = "declined";
    request.reviewedBy = session.user.id;
    request.reviewedAt = now;
    await request.save();

    if (shop.email) {
      await sendWebsiteDeclinedEmail({
        to: shop.email,
        shopName: shop.businessName || request.shopName,
        websiteUrl: request.websiteUrl,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Website verification declined.",
    });
  } catch (error) {
    console.error("Decline website verification failed:", error);

    return NextResponse.json(
      { error: "Failed to decline website verification." },
      { status: 500 }
    );
  }
}