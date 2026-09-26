import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsitePosIntegration from "@/models/BloomWebsitePosIntegration";
import {
  loadTfposIntegrationWithSecrets,
  tfposTransportConfigFromIntegration,
} from "@/lib/bloom-websites/pos/getBloomWebsitePosTransportConfig";
import { testPosTransportConnection } from "@/lib/bloom-websites/pos/transport/sendPosPayload";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDB();

  const website = await BloomWebsite.findOne({ shop: session.user.id })
    .select("_id")
    .lean<any>();

  if (!website) {
    return NextResponse.json({ error: "BloomWebsite not found." }, { status: 404 });
  }

  const integration = await loadTfposIntegrationWithSecrets({
    shopId: session.user.id,
    websiteId: String(website._id),
  });

  if (!integration) {
    return NextResponse.json(
      { error: "Save The Floral POS integration before testing it." },
      { status: 404 },
    );
  }

  try {
    const config = tfposTransportConfigFromIntegration(integration, { requireEnabled: false });
    const result = await testPosTransportConnection(config);

    await BloomWebsitePosIntegration.updateOne(
      { _id: integration._id },
      {
        $set: {
          "lastConnectionTest.status": "succeeded",
          "lastConnectionTest.testedAt": new Date(),
          "lastConnectionTest.message": result.message,
        },
      },
    );

    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection test failed.";

    await BloomWebsitePosIntegration.updateOne(
      { _id: integration._id },
      {
        $set: {
          "lastConnectionTest.status": "failed",
          "lastConnectionTest.testedAt": new Date(),
          "lastConnectionTest.message": message,
        },
      },
    );

    return NextResponse.json({ error: message }, { status: 409 });
  }
}
