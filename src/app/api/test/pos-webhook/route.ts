import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    const event = req.headers.get("x-webhook-event");
    const deliveryId = req.headers.get("x-webhook-delivery-id");
    const receivedSignature = req.headers.get(
      "x-webhook-signature",
    );

    const webhookSecret = process.env.TEST_POS_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("TEST_POS_WEBHOOK_SECRET is not configured.");
    }

    if (!receivedSignature) {
      return Response.json(
        {
          success: false,
          error: "Missing webhook signature.",
        },
        { status: 401 },
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const signaturesMatch =
      receivedSignature.length === expectedSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(receivedSignature, "utf8"),
        Buffer.from(expectedSignature, "utf8"),
      );

    console.log("\n========== POS WEBHOOK RECEIVED ==========");
    console.log("Event:", event);
    console.log("Delivery ID:", deliveryId);
    console.log("Signature valid:", signaturesMatch);
    // console.log("Raw Body:", rawBody);
    console.log("==========================================\n");

    if (!signaturesMatch) {
      return Response.json(
        {
          success: false,
          error: "Invalid webhook signature.",
        },
        { status: 401 },
      );
    }

    return Response.json({
      success: true,
      received: true,
      event,
      deliveryId,
      signatureValid: true,
    });
  } catch (error) {
    console.error("Test POS webhook failed:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process test webhook.",
      },
      { status: 500 },
    );
  }
}