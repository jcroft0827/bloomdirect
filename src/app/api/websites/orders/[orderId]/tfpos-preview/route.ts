import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { generateTfposXml } from "@/lib/bloom-websites/pos/tfpos/generateTfposXml";
import { getTfposSafePaymentDetails } from "@/lib/bloom-websites/pos/tfpos/getTfposSafePaymentDetails";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";
import BloomWebsitePosIntegration from "@/models/BloomWebsitePosIntegration";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { orderId } = await params;

  if (!isValidObjectId(orderId)) {
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  }

  await connectToDB();

  const order = await BloomWebsiteOrder.findOne({
    _id: orderId,
    shop: session.user.id,
  }).lean<any>();

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (order.payment?.status !== "paid") {
    return NextResponse.json(
      { error: "Only fully paid orders can be previewed for TFPOS export." },
      { status: 409 },
    );
  }

  const integration = await BloomWebsitePosIntegration.findOne({
    website: order.website,
    shop: session.user.id,
    provider: "tfpos",
  })
    .select("transport.protocol sourceVendor")
    .lean<any>();

  const payment = await getTfposSafePaymentDetails(order);
  const xml = generateTfposXml({
    order,
    payment,
    protocol: integration?.transport?.protocol || "sftp",
    sourceVendor: integration?.sourceVendor || "BloomWebsites",
  });

  const safeOrderNumber = String(order.orderNumber || "order").replace(
    /[^A-Za-z0-9_-]+/g,
    "-",
  );

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `inline; filename="${safeOrderNumber}.xml"`,
      "Cache-Control": "no-store",
    },
  });
}
