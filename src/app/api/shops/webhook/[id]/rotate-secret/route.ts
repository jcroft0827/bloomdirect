import { NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/get-current-shop";
import Webhook from "@/models/Webhook";
import {
  encryptWebhookSecret,
  generateWebhookSecret,
} from "@/lib/webhook-secret";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const shop = await getCurrentShop();

    if (!shop.isPro) {
      return NextResponse.json(
        { error: "Bloom Pro is required to manage POS webhooks." },
        { status: 403 },
      );
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        { error: "Suspended shops cannot manage POS webhooks." },
        { status: 403 },
      );
    }

    const webhook = await Webhook.findOne({
      _id: id,
      shopId: shop._id,
    }).select("+encryptedSecret +encryptionIv +encryptionAuthTag");

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found." },
        { status: 404 },
      );
    }

    const rawSecret = generateWebhookSecret();
    const encrypted = encryptWebhookSecret(rawSecret);

    webhook.encryptedSecret = encrypted.encryptedSecret;
    webhook.encryptionIv = encrypted.encryptionIv;
    webhook.encryptionAuthTag = encrypted.encryptionAuthTag;

    await webhook.save();

    return NextResponse.json({
      success: true,
      secret: rawSecret,
      warning:
        "This is the only time the full webhook secret will be shown. Update your POS integration immediately.",
    });
  } catch (error) {
    console.error("Rotate webhook secret error:", error);

    return NextResponse.json(
      { error: "Failed to rotate webhook secret." },
      { status: 500 },
    );
  }
}