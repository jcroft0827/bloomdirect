import authOptions from "@/lib/auth";
import { geoCodeAddress } from "@/lib/geocode";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { section, data } = await req.json();

    const shop = await Shop.findById(session.user.id);
    if (!shop)
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    switch (section) {
      case "shopInfo":
        // // Handle root fields + nested data
        shop.businessName = data.businessName;
        shop.slug = data.slug;
        shop.contact = { ...shop.contact, ...data.contact };
        shop.address = { ...shop.address, ...data.address };

        try {
          const geoRes = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(`${data.address.street}, ${data.address.city}, ${data.address.state}, ${data.address.zip}, ${data.address.country}`)}&key=${process.env.OPENCAGE_API_KEY}`,
          );
          const geoData = await geoRes.json();
          if (geoData.results?.length > 0) {
            const { lat, lng } = geoData.results[0].geometry;
            shop.address.geoLocation = {
              type: "Point",
              coordinates: [lng, lat],
            };
          }
        } catch (err) {
          console.warn("Geocoding failed", err);
        }

        break;

      case "paymentMethods":
        shop.paymentMethods = {
          ...shop.paymentMethods,
          ...data.paymentMethods,
        };
        break;

      case "delivery":
        const existingDelivery = shop.delivery ? shop.delivery.toObject() : {};
        shop.delivery = { ...existingDelivery, ...data };
        break;

      case "financials":
        shop.financials = { ...shop.financials, ...data.financials };
        break;

      case "branding":
        const existingBranding = shop.branding ? shop.branding.toObject() : {};

        shop.branding = {
          ...existingBranding,
          ...data,
          socialLinks: {
            ...(existingBranding.socialLinks || {}),
            ...(data.socialLinks || {}),
          },
        };
        break;

      case "featuredBouquet":
        shop.featuredBouquet = {
          ...shop.featuredBouquet,
          ...data.featuredBouquet,
        };
        break;

      case "securityCode":
        shop.securityCode = data.securityCode;
        break;

    case "":

    }

    // Save Changes
    await shop.save();

    // Return a success response
    return NextResponse.json({
      message: "Settings updated successfully",
      shop,
    });
  } catch (error) {
    console.error("UPDATE ERROR: ", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
