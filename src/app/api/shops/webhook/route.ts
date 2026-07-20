import { NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/get-current-shop";
import Webhook from "@/models/Webhook";
import {
  encryptWebhookSecret,
  generateWebhookSecret,
} from "@/lib/webhook-secret";

const SUPPORTED_EVENTS = [
  "order.created",
  "order.accepted",
  "order.declined",
  "order.paid",
  "order.completed",
] as const;

type SupportedEvent = (typeof SUPPORTED_EVENTS)[number];

function isValidWebhookUrl(value: string) {
  try {
    const url = new URL(value);

    if (process.env.NODE_ENV === "production") {
      return url.protocol === "https:";
    }

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function mapWebhookForClient(webhook: any) {
  return {
    id: webhook._id.toString(),
    url: webhook.url,
    events: webhook.events,
    isActive: webhook.isActive,
    createdAt: webhook.createdAt,
    updatedAt: webhook.updatedAt,
  };
}

export async function GET() {
  try {
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
      shopId: shop._id,
    });

    return NextResponse.json({
      success: true,
      webhook: webhook ? mapWebhookForClient(webhook) : null,
    });
  } catch (error) {
    console.error("Get webhook error:", error);

    return NextResponse.json(
      { error: "Failed to load webhook configuration." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const shop = await getCurrentShop();

    if (!shop.isPro) {
      return NextResponse.json(
        { error: "Bloom Pro is required to create POS webhooks." },
        { status: 403 },
      );
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        { error: "Suspended shops cannot manage POS webhooks." },
        { status: 403 },
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must contain valid JSON." },
        { status: 400 },
      );
    }

    const payload =
      body && typeof body === "object"
        ? (body as {
            url?: string;
            events?: unknown[];
          })
        : {};

    const url = typeof payload.url === "string" ? payload.url.trim() : "";

    const requestedEvents = Array.isArray(payload.events) ? payload.events : [];

    if (!url) {
      return NextResponse.json(
        { error: "Webhook URL is required." },
        { status: 400 },
      );
    }

    if (!isValidWebhookUrl(url)) {
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === "production"
              ? "Webhook URL must be a valid HTTPS URL."
              : "Webhook URL must be a valid HTTP or HTTPS URL.",
        },
        { status: 400 },
      );
    }

    const normalizedEvents = [
      ...new Set(
        requestedEvents.filter(
          (event: unknown): event is SupportedEvent =>
            typeof event === "string" &&
            SUPPORTED_EVENTS.includes(event as SupportedEvent),
        ),
      ),
    ];

    if (normalizedEvents.length === 0) {
      return NextResponse.json(
        { error: "Select at least one supported webhook event." },
        { status: 400 },
      );
    }

    if (normalizedEvents.length !== requestedEvents.length) {
      return NextResponse.json(
        { error: "One or more webhook events are unsupported." },
        { status: 400 },
      );
    }

    const existingWebhook = await Webhook.findOne({
      shopId: shop._id,
    });

    if (existingWebhook) {
      return NextResponse.json(
        {
          error:
            "A webhook already exists for this shop. Update the existing webhook instead.",
        },
        { status: 409 },
      );
    }

    const rawSecret = generateWebhookSecret();
    const encryptedSecret = encryptWebhookSecret(rawSecret);

    const webhook = await Webhook.create({
      shopId: shop._id,
      url,
      events: normalizedEvents,
      isActive: true,
      ...encryptedSecret,
    });

    return NextResponse.json(
      {
        success: true,
        webhook: mapWebhookForClient(webhook),
        secret: rawSecret,
        warning:
          "This is the only time the full webhook secret will be shown. Store it securely.",
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Create webhook error:", error);

    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "A webhook already exists for this shop." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create webhook configuration." },
      { status: 500 },
    );
  }
}
