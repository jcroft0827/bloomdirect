// app/api/shops/near/route.ts

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { getShopReadiness } from "@/lib/shops/getShopReadiness";

type NearbyShopRequest = {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeZip(value: string): string {
  return value.trim();
}

export async function POST(request: Request) {
  try {
    await connectToDB();

    const body = (await request.json()) as NearbyShopRequest;

    const street = body.street?.trim() || "";
    const city = body.city?.trim() || "";
    const state = body.state?.trim() || "";
    const zip = body.zip ? normalizeZip(body.zip) : "";

    if (
      !hasText(street) ||
      !hasText(city) ||
      !hasText(state) ||
      !hasText(zip)
    ) {
      return NextResponse.json(
        {
          error:
            "Street, city, state, and ZIP code are required to search for nearby florists.",
        },
        { status: 400 },
      );
    }

    /*
     * Support normal 5-digit ZIP codes and ZIP+4 values.
     * Delivery ZIP-zone matching uses the first five digits.
     */
    const fiveDigitZip = zip.match(/^\d{5}/)?.[0];

    if (!fiveDigitZip) {
      return NextResponse.json(
        { error: "Please provide a valid ZIP code." },
        { status: 400 },
      );
    }

    if (!process.env.OPENCAGE_API_KEY) {
      console.error("OPEN CAGE API KEY IS NOT CONFIGURED");

      return NextResponse.json(
        { error: "Location search is temporarily unavailable." },
        { status: 500 },
      );
    }

    /*
     * Convert the requested delivery address into coordinates.
     */
    const addressQuery = encodeURIComponent(
      `${street}, ${city}, ${state}, ${fiveDigitZip}, USA`,
    );

    const geoResponse = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${addressQuery}&key=${process.env.OPENCAGE_API_KEY}&countrycode=us&limit=1`,
      {
        cache: "no-store",
      },
    );

    if (!geoResponse.ok) {
      console.error(
        "OPENCAGE REQUEST FAILED:",
        geoResponse.status,
        geoResponse.statusText,
      );

      return NextResponse.json(
        { error: "Unable to locate that address. Please try again." },
        { status: 502 },
      );
    }

    const geoData = await geoResponse.json();

    if (!geoData.results?.length) {
      return NextResponse.json(
        {
          error:
            "We could not locate that address. Please check the address and try again.",
        },
        { status: 400 },
      );
    }

    const latitude = Number(geoData.results[0]?.geometry?.lat);
    const longitude = Number(geoData.results[0]?.geometry?.lng);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return NextResponse.json(
        { error: "The address returned invalid location information." },
        { status: 400 },
      );
    }

    /*
     * Search rules:
     *
     * ZIP delivery:
     * - The destination ZIP must exist in the florist's ZIP zones.
     * - maxRadius is not required.
     *
     * Distance delivery:
     * - The address must be within maxRadius, or
     * - The address must fall within one of the configured distance zones.
     *
     * setupProgress is intentionally not used. Current shop data is evaluated
     * by getShopReadiness after MongoDB returns the eligible candidates.
     */
    const candidateShops = await Shop.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          key: "address.geoLocation",
          distanceField: "calculatedDistance",
          spherical: true,
          query: {
            isPublic: true,
            isSuspended: { $ne: true },
            "verification.emailVerified": true,
          },
        },
      },
      {
        $addFields: {
          distanceInMiles: {
            $divide: ["$calculatedDistance", 1609.344],
          },
        },
      },
      {
        $match: {
          $or: [
            /*
             * Exact ZIP-zone delivery.
             */
            {
              "delivery.method": "zip",
              "delivery.zipZones": {
                $elemMatch: {
                  zip: fiveDigitZip,
                },
              },
            },

            /*
             * Distance-based delivery.
             */
            {
              "delivery.method": "distance",
              $expr: {
                $or: [
                  /*
                   * Use maxRadius when one has been configured.
                   */
                  {
                    $and: [
                      {
                        $gt: [
                          {
                            $ifNull: ["$delivery.maxRadius", 0],
                          },
                          0,
                        ],
                      },
                      {
                        $lte: [
                          "$distanceInMiles",
                          {
                            $ifNull: ["$delivery.maxRadius", 0],
                          },
                        ],
                      },
                    ],
                  },

                  /*
                   * Also support shops configured with distance zones.
                   * A destination qualifies when it falls between a zone's
                   * minimum and maximum mileage.
                   */
                  {
                    $gt: [
                      {
                        $size: {
                          $filter: {
                            input: {
                              $ifNull: ["$delivery.distanceZones", []],
                            },
                            as: "zone",
                            cond: {
                              $and: [
                                {
                                  $lte: [
                                    {
                                      $ifNull: ["$$zone.min", 0],
                                    },
                                    "$distanceInMiles",
                                  ],
                                },
                                {
                                  $gte: [
                                    {
                                      $ifNull: ["$$zone.max", -1],
                                    },
                                    "$distanceInMiles",
                                  ],
                                },
                              ],
                            },
                          },
                        },
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
      {
        $sort: {
          distanceInMiles: 1,
        },
      },
    ]);

    /*
     * Apply the centralized readiness policy.
     *
     * This protects the search results if readiness requirements change later,
     * without rebuilding those rules inside this API.
     */
    const shops = candidateShops
      .filter((shop) => {
        const readiness = getShopReadiness(shop);

        return readiness.capabilities.canAppearInSearch;
      })
      .map((shop) => ({
        _id: shop._id,
        businessName: shop.businessName,
        slug: shop.slug,
        address: shop.address,
        contact: {
          phone: shop.contact?.phone || "",
          website: shop.contact?.website || "",
        },
        isPro: shop.isPro === true,
        isSuspended: shop.isSuspended === true,
        verifiedFlorist: shop.verifiedFlorist === true,
        delivery: shop.delivery,
        branding: {
          logo: shop.branding?.logo || "",
          primaryColor: shop.branding?.primaryColor || "#000000",
        },
        distanceInMiles:
          typeof shop.distanceInMiles === "number"
            ? Number(shop.distanceInMiles.toFixed(1))
            : null,
      }));

    return NextResponse.json({ shops });
  } catch (error) {
    console.error("NEARBY SHOP SEARCH ERROR:", error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while searching for nearby florists. Please try again.",
      },
      { status: 500 },
    );
  }
}