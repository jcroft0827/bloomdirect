// /api/shops/settings/route.ts

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { getAuthenticatedShop } from "@/lib/shops/getAuthenticatedShop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { section, data } = await req.json();

    const shop = await getAuthenticatedShop(session.user.id);

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    switch (section) {
      case "shopInfo": {
        shop.businessName = data.businessName;
        shop.slug = data.slug;
        shop.contact = {
          ...shop.contact,
          ...data.contact,
        };
        shop.address = {
          ...shop.address,
          ...data.address,
        };

        /*
         * Saving this section means the florist has intentionally completed
         * the Business Information step.
         */
        shop.set("setupProgress.businessInfo", true);

        try {
          const address = `${data.address.street}, ${data.address.city}, ${data.address.state}, ${data.address.zip}, ${data.address.country}`;

          const geoRes = await fetch(
            `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${process.env.OPENCAGE_API_KEY}`,
          );

          const geoData = await geoRes.json();

          if (geoData.results?.length > 0) {
            const { lat, lng } = geoData.results[0].geometry;

            shop.address.geoLocation = {
              type: "Point",
              coordinates: [lng, lat],
            };
          }
        } catch (error) {
          console.warn("Geocoding failed", error);
        }

        break;
      }

      case "paymentMethods": {
        shop.paymentMethods = {
          ...shop.paymentMethods,
          ...data.paymentMethods,
        };

        /*
         * The readiness helper will still verify that at least one real
         * payment method exists. This flag records that the section was saved.
         */
        shop.set("setupProgress.paymentMethods", true);

        break;
      }

      case "delivery": {
        const existingDelivery = shop.delivery ? shop.delivery.toObject() : {};

        shop.delivery = {
          ...existingDelivery,
          ...data,
        };

        /*
         * The readiness helper separately confirms that real delivery
         * coverage exists before making the shop searchable.
         */
        shop.set("setupProgress.deliverySettings", true);

        break;
      }

      case "financials": {
        shop.financials = {
          ...shop.financials,
          ...data.financials,
        };

        /*
         * An explicit completion flag is required here because 0% tax and
         * $0 fees are valid choices and may also match schema defaults.
         */
        shop.set("setupProgress.financialSettings", true);

        break;
      }

      case "branding": {
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
      }

      case "securityCode": {
        shop.securityCode = data.securityCode;
        break;
      }

      default: {
        return NextResponse.json(
          { error: "Invalid settings section" },
          { status: 400 },
        );
      }
    }

    await shop.save();

    return NextResponse.json({
      message: "Settings updated successfully",
      shop,
    });
  } catch (error) {
    console.error("UPDATE ERROR:", error);

    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
