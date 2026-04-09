import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Shop from "@/models/Shop";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.id;
    const body = await req.json();

    const { phone, street, city, state, zip, country = "US", timezone, website } = body;

    // Check for P.O. Box
    const isPOBox = (address: string) => {
      const lower = address.toLowerCase().replace(/\s+/g, "");
      return ["pobox", "p.o.box", "po.box", "p.o.b", "p.o", "box"].some(p => lower.startsWith(p));
    };
    if (isPOBox(street)) {
      return NextResponse.json({ error: "P.O. Box addresses are not supported." }, { status: 400 });
    }

    // Geocoding
    let coordinates: [number, number] = [0, 0];
    try {
      const geoRes = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(`${street}, ${city}, ${state}, ${zip}, ${country}`)}&key=${process.env.OPENCAGE_API_KEY}`);
      const geoData = await geoRes.json();
      if (geoData.results?.length > 0) {
        const lat = geoData.results[0].geometry.lat;
        const lng = geoData.results[0].geometry.lng;
        coordinates = [lng, lat];
      }
    } catch (err) {
      console.warn("Geocoding failed", err);
    }

    // Find the shop
    const shop = await Shop.findById(shopId);
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });


    // ====== Merge / Add missing fields to existing address ======
    shop.address = {
      ...shop.address, // keep existing zip, country, timezone
      street,
      city,
      state,
      zip,      // overwrite in case it changed
      country,  // overwrite in case it changed
      timezone, // overwrite in case it changed
      geoLocation: { type: "Point", coordinates },
    };

    // Update website
    shop.contact = {
      ...shop.contact,
      phone,
      whatsapp: "",
      emailSecondary: "",
      website,
    };

    // Mark businessInfo setup as complete
    shop.setupProgress = {
      ...shop.setupProgress,
      businessInfo: true,
    };

    await shop.save();

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Business setup error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}