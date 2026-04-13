import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import moment from "moment";
import { Types } from "mongoose";

interface BlackoutTime {
  start: string;
  end: string;
}

interface ShopResponse {
  _id: string;
  businessName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  contact: {
    phone: string;
  };
  verifiedFlorist: boolean;
  stats: {
    ordersCompleted: number;
    responseRate: number;
  };
  avgRating: number;
  deliveryCharge: number;
  delivery?: {
    sameDayCutoff?: string;
    blackoutTimes?: BlackoutTime[];
  };
  featuredBouquet?: {
    name?: string;
    price?: number;
    description?: string;
    image?: string;
  };
}

export async function POST(req: Request) {
  try {
    await connectToDB();

    const {
      address,
      city,
      state,
      zip,
      delDate,
      delTimeOpt,
      delTimeFrom,
      delTimeTo,
      currentShopId,
      excludedShopIds = [],
    } = await req.json();

    const idsToExclude = [
      ...(currentShopId ? [new Types.ObjectId(currentShopId)] : []),
      ...excludedShopIds.map((id: string) => new Types.ObjectId(id))
    ]

    // 1. Geocode Destination (OpenCage)
    const newAddress = address.replace(/ /g, "+");
    const newCity = city.replace(/ /g, "+");
    const newState = state.replace(/ /g, "+");

    const geoQuery = `${newAddress},+${newCity},+${newState},+${zip},+USA`;

    const url = `https://api.opencagedata.com/geocode/v1/json?q=${geoQuery}&key=${process.env.OPENCAGE_API_KEY}&language=en&pretty=1`;
    const geoRes = await fetch(url);
    const geoData = await geoRes.json();
    if (!geoData.results?.length)
      return NextResponse.json({ error: "Address not found" }, { status: 400 });
    const { lat, lng } = geoData.results[0].geometry;

    const deliveryDate = moment(delDate).startOf("day");
    const isToday = deliveryDate.isSame(moment(), "day");

    // 2. Aggregation Pipeline
    const shops: ShopResponse[] = await Shop.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          key: "address.geoLocation", // Fixes "unsure which index to use"
          distanceField: "calculatedDistance",
          spherical: true,
          distanceMultiplier: 0.000621371, // Miles
        },
      },
      {
        $match: {
          _id: { $nin: idsToExclude },
          isSuspended: false,
          isPublic: true,
          "delivery.blackoutDates": { $ne: deliveryDate.toDate() },
          "delivery.noMoreOrdersForDate": { $ne: deliveryDate.toDate() },
          ...(isToday
            ? {
                "delivery.noMoreOrdersToday": false,
                "delivery.allowSameDay": true,
              }
            : {}),
        },
      },
      {
        $addFields: {
          // Rule 6 Fix: Fallback to [] if zipZones is missing
          isZipValid: {
            $cond: [
              { $eq: ["$delivery.method", "zip"] },
              { $in: [zip, { $ifNull: ["$delivery.zipZones.zip", []] }] },
              true,
            ],
          },
          // Rule 7 & 8 Fix: Fallback for distance zones
          isDistanceValid: {
            $cond: [
              { $eq: ["$delivery.method", "distance"] },
              {
                $or: [
                  { $lte: ["$calculatedDistance", "$delivery.maxRadius"] },
                  {
                    $reduce: {
                      input: { $ifNull: ["$delivery.distanceZones", []] },
                      initialValue: false,
                      in: {
                        $or: [
                          "$$value",
                          {
                            $and: [
                              { $gte: ["$calculatedDistance", "$$this.min"] },
                              { $lte: ["$calculatedDistance", "$$this.max"] },
                            ],
                          },
                        ],
                      },
                    },
                  },
                ],
              },
              true,
            ],
          },
          isHoliday: {
            $in: [
              deliveryDate.toDate(),
              { $ifNull: ["$delivery.holidayDates.date", []] },
            ],
          },
          baseFee: {
            $cond: [
              { $eq: ["$delivery.method", "zip"] },
              {
                $getField: {
                  field: "fee",
                  input: {
                    $first: {
                      $filter: {
                        input: { $ifNull: ["$delivery.zipZones", []] },
                        as: "z",
                        cond: { $eq: ["$$z.zip", zip] },
                      },
                    },
                  },
                },
              },
              {
                $let: {
                  vars: {
                    zone: {
                      $first: {
                        $filter: {
                          input: { $ifNull: ["$delivery.distanceZones", []] },
                          as: "dz",
                          cond: {
                            $and: [
                              { $gte: ["$calculatedDistance", "$$dz.min"] },
                              { $lte: ["$calculatedDistance", "$$dz.max"] },
                            ],
                          },
                        },
                      },
                    },
                  },
                  in: { $ifNull: ["$$zone.fee", "$delivery.fallbackFee"] },
                },
              },
            ],
          },
        },
      },
      { $match: { isZipValid: true, isDistanceValid: true } },
      {
        $project: {
          businessName: 1,
          address: 1,
          "contact.phone": 1,
          verifiedFlorist: 1,
          "stats.ordersCompleted": 1,
          "stats.responseRate": 1,
          avgRating: { $ifNull: [{ $avg: "$reviews.rating" }, 0] },
          deliveryCharge: {
            $add: [
              { $ifNull: ["$baseFee", 0] },
              { $cond: ["$isHoliday", "$delivery.holidaySurcharge", 0] },
            ],
          },
          "delivery.sameDayCutoff": 1,
          "delivery.blackoutTimes": 1,
          "featuredBouquet": 1,
        },
      },
    ]);

    // 3. JS Refinement & Sort (Treating zero-reviews as 0.0 rating)
    const results = shops
      .filter((shop) => {
        if (delTimeOpt === "specific") {
          if (
            isToday &&
            shop.delivery?.sameDayCutoff &&
            shop.delivery.sameDayCutoff > delTimeFrom
          )
            return false;
          return !shop.delivery?.blackoutTimes?.some(
            (range: BlackoutTime) =>
              (delTimeFrom >= range.start && delTimeFrom <= range.end) ||
              (delTimeTo >= range.start && delTimeTo <= range.end),
          );
        }
        return true;
      })
      .sort(
        (a, b) =>
          a.deliveryCharge - b.deliveryCharge || b.avgRating - a.avgRating,
      );

    return NextResponse.json(results);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
