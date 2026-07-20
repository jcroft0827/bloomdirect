import { NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/get-current-shop";
import Webhook from "@/models/Webhook";

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

export async function PATCH(
  req: Request,
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
            isActive?: boolean;
          })
        : {};

    const webhook = await Webhook.findOne({
      _id: id,
      shopId: shop._id,
    });

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found." },
        { status: 404 },
      );
    }

    if (payload.url !== undefined) {
      const url = payload.url.trim();

      if (!url) {
        return NextResponse.json(
          { error: "Webhook URL cannot be empty." },
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

      webhook.url = url;
    }

    if (payload.events !== undefined) {
      if (!Array.isArray(payload.events)) {
        return NextResponse.json(
          { error: "Webhook events must be an array." },
          { status: 400 },
        );
      }

      const normalizedEvents = [
        ...new Set(
          payload.events.filter(
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

      if (normalizedEvents.length !== payload.events.length) {
        return NextResponse.json(
          { error: "One or more webhook events are unsupported." },
          { status: 400 },
        );
      }

      webhook.events = normalizedEvents;
    }

    if (payload.isActive !== undefined) {
      if (typeof payload.isActive !== "boolean") {
        return NextResponse.json(
          { error: "isActive must be a boolean." },
          { status: 400 },
        );
      }

      webhook.isActive = payload.isActive;
    }

    await webhook.save();

    return NextResponse.json({
      success: true,
      webhook: mapWebhookForClient(webhook),
    });
  } catch (error) {
    console.error("Update webhook error:", error);

    return NextResponse.json(
      { error: "Failed to update webhook configuration." },
      { status: 500 },
    );
  }
}