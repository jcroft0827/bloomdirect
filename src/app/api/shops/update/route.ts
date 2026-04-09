import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { ApiError } from "@/lib/api-error";
import { geoCodeAddress } from "@/lib/geocode";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);
    const shopId = session?.user?.id;

    if (!shopId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    
    const body = await req.json();
    
    // Check for P.O. Box in address (not supported by geocoding)
    function isPOBox(address: string) {
      if (!address) return false;
      const lower = address.toLowerCase().replace(/\s+/g, ""); // remove spaces to catch tricky formatting
      const patterns = [
        "pobox",
        "p.o.box",
        "po.box",
        "p.o.b",
        "p.o",
        "box", // catches "Box 123"
        "mailingaddress",
      ];

      // Return true if any pattern matches at the start of the address
      return patterns.some((pattern) => lower.startsWith(pattern));
    }

    if (isPOBox(body.address)) {
      return NextResponse.json(
        { error: "P.O. Box addresses are not supported. Please provide a physical address." },
        { status: 400 }
      );
    }

    // 🔒 Whitelist allowed fields
    const allowedFields = [
      "shopName",
      "phone",
      "address",
      "city",
      "state",
      "zip",
      "logo",
      "featuredBouquet",
      "acceptsWalkIns",
      "weddingConsultations",
      "securityCode",
    ];

    const shop = await Shop.findById(shopId);

    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      );
    }

    // Only update defined + allowed fields
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        // @ts-ignore
        shop[key] = body[key];
      }
    }

    // Update geoLocation if address changed
    if (body.address || body.city || body.state || body.zip) {
      const fullAddress = `${shop.address}, ${shop.city}, ${shop.state} ${shop.zip}`;
      const geoLocation = await geoCodeAddress(fullAddress);
      if (geoLocation) shop.geoLocation = geoLocation;
    }

    console.log(shop);

    await shop.save();

    return NextResponse.json({
      success: true,
      shop,
    });

  } catch (error: any) {
    console.error("UPDATE SHOP ERROR:", error);

    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        error:
          "Something went wrong. Please try again. If the issue persists, Contact GetBloomDirect Support.",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}