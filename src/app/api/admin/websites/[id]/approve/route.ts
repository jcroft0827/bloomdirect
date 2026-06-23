import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { sendWebsiteApprovedEmail } from "@/lib/email/websiteVerificationDecisionEmail";
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

    shop.verification.websiteVerified = true;
    shop.verification.websiteVerifiedAt = now;
    shop.contact.website = request.websiteUrl;

    shop.websiteVerifications = {
      status: "verified",
      checkedAt: now,
      failureReason: "",
      matchedSignals: request.matchedSignals || [],
      riskSignals: request.riskSignals || [],
    };

    await shop.save();

    request.status = "approved";
    request.reviewedBy = session.user.id;
    request.reviewedAt = now;
    await request.save();

    if (shop.email) {
      await sendWebsiteApprovedEmail({
        to: shop.email,
        shopName: shop.businessName || request.shopName,
        websiteUrl: request.websiteUrl,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Website verification approved.",
    });
  } catch (error) {
    console.error("Approve website verification failed:", error);

    return NextResponse.json(
      { error: "Failed to approve website verification." },
      { status: 500 }
    );
  }
}