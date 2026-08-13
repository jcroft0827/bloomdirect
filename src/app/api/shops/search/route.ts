// app/api/shops/search/route.ts

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import moment from "moment";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type LeanSendingShop = {
  _id: Types.ObjectId;
  blockedFlorists?: Array<{
    shopId?: Types.ObjectId | string | null;
  }>;
};

type GoogleGeocodingResponse = {
  status?: string;
  error_message?: string;
  results?: Array<{
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
};

interface BlackoutTime {
  start: string;
  end: string;
}

interface ShopResponse {
  _id: string;
  businessName: string;
  slug: string;
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
  isPro: boolean;
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
  featuredArrangement?: {
    name?: string;
    description?: string;
    image?: string;
    pricingTiers?: {
      label: string;
      price: number;
    }[];
  };
}

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sendingShop = await Shop.findById(session.user.id)
      .select("_id blockedFlorists")
      .lean<LeanSendingShop>();

    if (!sendingShop) {
      return NextResponse.json(
        { error: "Sending shop not found" },
        { status: 404 },
      );
    }

    const {
      address,
      city,
      state,
      zip,
      delDate,
      delTimeOpt,
      delTimeFrom,
      delTimeTo,
      excludedShopIds = [],
    } = await req.json();

    const blockedShopIds = (sendingShop.blockedFlorists ?? []).flatMap(
      (entry) => {
        const shopId = entry.shopId;

        if (!shopId) {
          return [];
        }

        const normalizedShopId = shopId.toString();

        if (!Types.ObjectId.isValid(normalizedShopId)) {
          return [];
        }

        return [new Types.ObjectId(normalizedShopId)];
      },
    );

    const validExcludedShopIds = (
      Array.isArray(excludedShopIds) ? excludedShopIds : []
    ).flatMap((id: unknown) => {
      if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
        return [];
      }

      return [new Types.ObjectId(id)];
    });

    const idsToExclude = [
      new Types.ObjectId(session.user.id),
      ...blockedShopIds,
      ...validExcludedShopIds,
    ];

    /*
     * 1. Geocode the delivery destination with Google.
     *
     * Google Geocoding is now the production geocoder for
     * GetBloomDirect network searches.
     */
    const googleApiKey = process.env.GOOGLE_API;

    if (!googleApiKey) {
      console.error("GOOGLE_API is not configured for geocoding.");

      return NextResponse.json(
        { error: "Geocoding service is unavailable." },
        { status: 500 },
      );
    }

    const fullAddress = [address, city, state, zip, "USA"]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .join(", ");

    if (!fullAddress) {
      return NextResponse.json(
        { error: "A delivery address is required." },
        { status: 400 },
      );
    }

    const geocodeUrl = new URL(
      "https://maps.googleapis.com/maps/api/geocode/json",
    );

    geocodeUrl.searchParams.set("address", fullAddress);

    geocodeUrl.searchParams.set("key", googleApiKey);

    const geoRes = await fetch(geocodeUrl.toString(), {
      cache: "no-store",
    });

    if (!geoRes.ok) {
      console.error(
        "Google Geocoding HTTP error:",
        geoRes.status,
        geoRes.statusText,
      );

      return NextResponse.json(
        { error: "Unable to geocode the delivery address." },
        { status: 502 },
      );
    }

    const geoData = (await geoRes.json()) as GoogleGeocodingResponse;

    if (geoData.status !== "OK" || !geoData.results?.length) {
      console.warn(
        "Google Geocoding did not find the address:",
        geoData.status,
        geoData.error_message || "",
      );

      return NextResponse.json({ error: "Address not found" }, { status: 400 });
    }

    const location = geoData.results[0]?.geometry?.location;

    const lat = location?.lat;
    const lng = location?.lng;

    // Debugging output for geocoded destination
    console.log("SHOP SEARCH DEBUG - geocoded destination", {
      fullAddress,
      lat,
      lng,
      zip,
    });

    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      console.error("Google Geocoding returned invalid coordinates.");

      return NextResponse.json(
        { error: "Unable to resolve address coordinates." },
        { status: 502 },
      );
    }

    const deliveryDate = moment(delDate).startOf("day");
    const isToday = deliveryDate.isSame(moment(), "day");

    /*
     * 2. Find eligible GetBloomDirect florists.
     */
    //const shops: ShopResponse[] = await Shop.aggregate([
    const debugCandidates = await Shop.find({
      isSuspended: { $ne: true },
      isArchived: { $ne: true },
      isMarkedSpam: { $ne: true },
      isPublic: true,
      "verification.emailVerified": true,
    })
      .select(
        "_id businessName address delivery paymentMethods verifiedFlorist isPro",
      )
      .lean();

    console.log(
      "SHOP SEARCH DEBUG - base candidates",
      debugCandidates.map((shop) => ({
        id: String(shop._id),
        businessName: shop.businessName,
        zip: shop.address?.zip,
        geoLocation: shop.address?.geoLocation,
        deliveryMethod: shop.delivery?.method,
        zipZones: shop.delivery?.zipZones,
        maxRadius: shop.delivery?.maxRadius,
        paymentMethods: shop.paymentMethods,
      })),
    );

    const shops: ShopResponse[] = await Shop.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat],
          },
          key: "address.geoLocation",
          distanceField: "calculatedDistance",
          spherical: true,
          distanceMultiplier: 0.000621371,
        },
      },
      {
        $match: {
          _id: {
            $nin: idsToExclude,
          },

          isSuspended: {
            $ne: true,
          },

          isArchived: {
            $ne: true,
          },

          isMarkedSpam: {
            $ne: true,
          },

          isPublic: true,

          "verification.emailVerified": true,

          businessName: {
            $type: "string",
            $ne: "",
          },

          email: {
            $type: "string",
            $ne: "",
          },

          "contact.phone": {
            $type: "string",
            $ne: "",
          },

          "address.street": {
            $type: "string",
            $ne: "",
          },

          "address.city": {
            $type: "string",
            $ne: "",
          },

          "address.state": {
            $type: "string",
            $ne: "",
          },

          "address.zip": {
            $type: "string",
            $ne: "",
          },

          "delivery.blackoutDates": {
            $ne: deliveryDate.toDate(),
          },

          "delivery.noMoreOrdersForDate": {
            $ne: deliveryDate.toDate(),
          },

          $and: [
            {
              $or: [
                {
                  "paymentMethods.venmoHandle": {
                    $type: "string",
                    $ne: "",
                  },
                },
                {
                  "paymentMethods.cashAppTag": {
                    $type: "string",
                    $ne: "",
                  },
                },
                {
                  "paymentMethods.zellePhoneOrEmail": {
                    $type: "string",
                    $ne: "",
                  },
                },
                {
                  "paymentMethods.paypalEmail": {
                    $type: "string",
                    $ne: "",
                  },
                },
              ],
            },

            ...(isToday
              ? [
                  {
                    "delivery.allowSameDay": true,

                    $or: [
                      {
                        "delivery.noMoreOrdersTodayUntil": null,
                      },
                      {
                        "delivery.noMoreOrdersTodayUntil": {
                          $exists: false,
                        },
                      },
                      {
                        "delivery.noMoreOrdersTodayUntil": {
                          $lte: new Date(),
                        },
                      },
                    ],
                  },
                ]
              : []),
          ],
        },
      },
      {
        $addFields: {
          isZipValid: {
            $cond: [
              {
                $eq: ["$delivery.method", "zip"],
              },
              {
                $in: [
                  zip,
                  {
                    $ifNull: ["$delivery.zipZones.zip", []],
                  },
                ],
              },
              true,
            ],
          },

          isDistanceValid: {
            $cond: [
              {
                $eq: ["$delivery.method", "distance"],
              },
              {
                $or: [
                  {
                    $lte: ["$calculatedDistance", "$delivery.maxRadius"],
                  },
                  {
                    $reduce: {
                      input: {
                        $ifNull: ["$delivery.distanceZones", []],
                      },
                      initialValue: false,
                      in: {
                        $or: [
                          "$$value",
                          {
                            $and: [
                              {
                                $gte: ["$calculatedDistance", "$$this.min"],
                              },
                              {
                                $lte: ["$calculatedDistance", "$$this.max"],
                              },
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
              {
                $ifNull: ["$delivery.holidayDates.date", []],
              },
            ],
          },

          baseFee: {
            $cond: [
              {
                $eq: ["$delivery.method", "zip"],
              },
              {
                $getField: {
                  field: "fee",
                  input: {
                    $first: {
                      $filter: {
                        input: {
                          $ifNull: ["$delivery.zipZones", []],
                        },
                        as: "z",
                        cond: {
                          $eq: ["$$z.zip", zip],
                        },
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
                          input: {
                            $ifNull: ["$delivery.distanceZones", []],
                          },
                          as: "dz",
                          cond: {
                            $and: [
                              {
                                $gte: ["$calculatedDistance", "$$dz.min"],
                              },
                              {
                                $lte: ["$calculatedDistance", "$$dz.max"],
                              },
                            ],
                          },
                        },
                      },
                    },
                  },
                  in: {
                    $ifNull: ["$$zone.fee", "$delivery.fallbackFee"],
                  },
                },
              },
            ],
          },
        },
      },

      {
        $match: {
          isZipValid: true,
          isDistanceValid: true,
        },
      },

      {
        $lookup: {
          from: "fulfillmentofferings",
          let: {
            shopId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$shop", "$$shopId"],
                },
                isActive: true,
                isFeatured: true,
                type: "featured",
              },
            },
            {
              $sort: {
                sortOrder: 1,
                createdAt: -1,
              },
            },
            {
              $limit: 1,
            },
            {
              $project: {
                name: 1,
                description: 1,
                image: 1,
                pricingTiers: 1,
              },
            },
          ],
          as: "featuredArrangement",
        },
      },

      {
        $addFields: {
          featuredArrangement: {
            $first: "$featuredArrangement",
          },
        },
      },

      {
        $project: {
          businessName: 1,
          slug: 1,
          address: 1,
          "contact.phone": 1,
          verifiedFlorist: 1,
          isPro: 1,
          "stats.ordersCompleted": 1,
          "stats.responseRate": 1,

          avgRating: {
            $ifNull: [
              {
                $avg: "$reviews.rating",
              },
              0,
            ],
          },

          deliveryCharge: {
            $add: [
              {
                $ifNull: ["$baseFee", 0],
              },
              {
                $cond: ["$isHoliday", "$delivery.holidaySurcharge", 0],
              },
            ],
          },

          "delivery.sameDayCutoff": 1,
          "delivery.blackoutTimes": 1,
          featuredArrangement: 1,
        },
      },
    ]);

    // Debugging output for eligible shops after aggregation
    console.log(
      "SHOP SEARCH DEBUG - aggregation results",
      shops.map((shop) => ({
        id: shop._id,
        businessName: shop.businessName,
        deliveryCharge: shop.deliveryCharge,
      })),
    );

    /*
     * 3. Refine for delivery-time availability and apply
     * GetBloomDirect network priority sorting.
     */
    const results = shops
      .filter((shop) => {
        if (delTimeOpt === "specific") {
          if (
            isToday &&
            shop.delivery?.sameDayCutoff &&
            shop.delivery.sameDayCutoff > delTimeFrom
          ) {
            return false;
          }

          return !shop.delivery?.blackoutTimes?.some(
            (range: BlackoutTime) =>
              (delTimeFrom >= range.start && delTimeFrom <= range.end) ||
              (delTimeTo >= range.start && delTimeTo <= range.end),
          );
        }

        return true;
      })
      .sort((a, b) => {
        const aVerified = a.verifiedFlorist ? 1 : 0;

        const bVerified = b.verifiedFlorist ? 1 : 0;

        const aPro = a.isPro ? 1 : 0;
        const bPro = b.isPro ? 1 : 0;

        const aPriority = aVerified * 2 + aPro;

        const bPriority = bVerified * 2 + bPro;

        return (
          bPriority - aPriority ||
          a.deliveryCharge - b.deliveryCharge ||
          b.avgRating - a.avgRating ||
          a.businessName.localeCompare(b.businessName)
        );
      });

    return NextResponse.json(results);
  } catch (error) {
    console.error("API Error:", error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      { status: 500 },
    );
  }
}

// import { NextResponse } from "next/server";
// import { connectToDB } from "@/lib/mongoose";
// import Shop from "@/models/Shop";
// import moment from "moment";
// import { Types } from "mongoose";
// import authOptions from "@/lib/auth";
// import { getServerSession } from "next-auth";

// type LeanSendingShop = {
//   _id: Types.ObjectId;
//   blockedFlorists?: Array<{
//     shopId?: Types.ObjectId | string | null;
//   }>;
// };

// interface BlackoutTime {
//   start: string;
//   end: string;
// }

// interface ShopResponse {
//   _id: string;
//   businessName: string;
//   slug: string;
//   address: {
//     street: string;
//     city: string;
//     state: string;
//     zip: string;
//   };
//   contact: {
//     phone: string;
//   };
//   verifiedFlorist: boolean;
//   isPro: boolean;
//   stats: {
//     ordersCompleted: number;
//     responseRate: number;
//   };
//   avgRating: number;
//   deliveryCharge: number;
//   delivery?: {
//     sameDayCutoff?: string;
//     blackoutTimes?: BlackoutTime[];
//   };
//   featuredArrangement?: {
//     name?: string;
//     description?: string;
//     image?: string;
//     pricingTiers?: {
//       label: string;
//       price: number;
//     }[];
//   };
// }

// export async function POST(req: Request) {
//   try {
//     await connectToDB();

//     const session = await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const sendingShop = await Shop.findById(session.user.id)
//       .select("_id blockedFlorists")
//       .lean<LeanSendingShop>();

//     if (!sendingShop) {
//       return NextResponse.json(
//         { error: "Sending shop not found" },
//         { status: 404 },
//       );
//     }

//     const {
//       address,
//       city,
//       state,
//       zip,
//       delDate,
//       delTimeOpt,
//       delTimeFrom,
//       delTimeTo,
//       excludedShopIds = [],
//     } = await req.json();

//     const blockedShopIds = (sendingShop.blockedFlorists ?? []).flatMap(
//       (entry) => {
//         const shopId = entry.shopId;

//         if (!shopId) {
//           return [];
//         }

//         const normalizedShopId = shopId.toString();

//         if (!Types.ObjectId.isValid(normalizedShopId)) {
//           return [];
//         }

//         return [new Types.ObjectId(normalizedShopId)];
//       },
//     );

//     const validExcludedShopIds = (
//       Array.isArray(excludedShopIds) ? excludedShopIds : []
//     ).flatMap((id: unknown) => {
//       if (typeof id !== "string" || !Types.ObjectId.isValid(id)) {
//         return [];
//       }

//       return [new Types.ObjectId(id)];
//     });

//     const idsToExclude = [
//       new Types.ObjectId(session.user.id),
//       ...blockedShopIds,
//       ...validExcludedShopIds,
//     ];

//     // 1. Geocode Destination (OpenCage)
//     const newAddress = address.replace(/ /g, "+");
//     const newCity = city.replace(/ /g, "+");
//     const newState = state.replace(/ /g, "+");

//     const geoQuery = `${newAddress},+${newCity},+${newState},+${zip},+USA`;

//     const url = `https://api.opencagedata.com/geocode/v1/json?q=${geoQuery}&key=${process.env.OPENCAGE_API_KEY}&language=en&pretty=1`;
//     const geoRes = await fetch(url);
//     const geoData = await geoRes.json();
//     if (!geoData.results?.length)
//       return NextResponse.json({ error: "Address not found" }, { status: 400 });
//     const { lat, lng } = geoData.results[0].geometry;

//     const deliveryDate = moment(delDate).startOf("day");
//     const isToday = deliveryDate.isSame(moment(), "day");

//     // 2. Aggregation Pipeline
//     const shops: ShopResponse[] = await Shop.aggregate([
//       {
//         $geoNear: {
//           near: { type: "Point", coordinates: [lng, lat] },
//           key: "address.geoLocation", // Fixes "unsure which index to use"
//           distanceField: "calculatedDistance",
//           spherical: true,
//           distanceMultiplier: 0.000621371, // Miles
//         },
//       },
//       {
//         $match: {
//           _id: { $nin: idsToExclude },

//           isSuspended: { $ne: true },
//           isArchived: { $ne: true },
//           isMarkedSpam: { $ne: true },
//           isPublic: true,

//           "verification.emailVerified": true,

//           businessName: {
//             $type: "string",
//             $ne: "",
//           },

//           email: {
//             $type: "string",
//             $ne: "",
//           },

//           "contact.phone": {
//             $type: "string",
//             $ne: "",
//           },

//           "address.street": {
//             $type: "string",
//             $ne: "",
//           },

//           "address.city": {
//             $type: "string",
//             $ne: "",
//           },

//           "address.state": {
//             $type: "string",
//             $ne: "",
//           },

//           "address.zip": {
//             $type: "string",
//             $ne: "",
//           },

//           $or: [
//             {
//               "paymentMethods.venmoHandle": {
//                 $type: "string",
//                 $ne: "",
//               },
//             },
//             {
//               "paymentMethods.cashAppTag": {
//                 $type: "string",
//                 $ne: "",
//               },
//             },
//             {
//               "paymentMethods.zellePhoneOrEmail": {
//                 $type: "string",
//                 $ne: "",
//               },
//             },
//             {
//               "paymentMethods.paypalEmail": {
//                 $type: "string",
//                 $ne: "",
//               },
//             },
//           ],
//           "delivery.blackoutDates": { $ne: deliveryDate.toDate() },
//           "delivery.noMoreOrdersForDate": { $ne: deliveryDate.toDate() },
//           ...(isToday
//             ? {
//                 "delivery.allowSameDay": true,

//                 $or: [
//                   { "delivery.noMoreOrdersTodayUntil": null },
//                   { "delivery.noMoreOrdersTodayUntil": { $exists: false } },
//                   { "delivery.noMoreOrdersTodayUntil": { $lte: new Date() } },
//                 ],
//               }
//             : {}),
//         },
//       },
//       {
//         $addFields: {
//           // Rule 6 Fix: Fallback to [] if zipZones is missing
//           isZipValid: {
//             $cond: [
//               { $eq: ["$delivery.method", "zip"] },
//               { $in: [zip, { $ifNull: ["$delivery.zipZones.zip", []] }] },
//               true,
//             ],
//           },
//           // Rule 7 & 8 Fix: Fallback for distance zones
//           isDistanceValid: {
//             $cond: [
//               { $eq: ["$delivery.method", "distance"] },
//               {
//                 $or: [
//                   { $lte: ["$calculatedDistance", "$delivery.maxRadius"] },
//                   {
//                     $reduce: {
//                       input: { $ifNull: ["$delivery.distanceZones", []] },
//                       initialValue: false,
//                       in: {
//                         $or: [
//                           "$$value",
//                           {
//                             $and: [
//                               { $gte: ["$calculatedDistance", "$$this.min"] },
//                               { $lte: ["$calculatedDistance", "$$this.max"] },
//                             ],
//                           },
//                         ],
//                       },
//                     },
//                   },
//                 ],
//               },
//               true,
//             ],
//           },
//           isHoliday: {
//             $in: [
//               deliveryDate.toDate(),
//               { $ifNull: ["$delivery.holidayDates.date", []] },
//             ],
//           },
//           baseFee: {
//             $cond: [
//               { $eq: ["$delivery.method", "zip"] },
//               {
//                 $getField: {
//                   field: "fee",
//                   input: {
//                     $first: {
//                       $filter: {
//                         input: { $ifNull: ["$delivery.zipZones", []] },
//                         as: "z",
//                         cond: { $eq: ["$$z.zip", zip] },
//                       },
//                     },
//                   },
//                 },
//               },
//               {
//                 $let: {
//                   vars: {
//                     zone: {
//                       $first: {
//                         $filter: {
//                           input: { $ifNull: ["$delivery.distanceZones", []] },
//                           as: "dz",
//                           cond: {
//                             $and: [
//                               { $gte: ["$calculatedDistance", "$$dz.min"] },
//                               { $lte: ["$calculatedDistance", "$$dz.max"] },
//                             ],
//                           },
//                         },
//                       },
//                     },
//                   },
//                   in: { $ifNull: ["$$zone.fee", "$delivery.fallbackFee"] },
//                 },
//               },
//             ],
//           },
//         },
//       },
//       { $match: { isZipValid: true, isDistanceValid: true } },
//       {
//         $lookup: {
//           from: "fulfillmentofferings",
//           let: { shopId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: { $eq: ["$shop", "$$shopId"] },
//                 isActive: true,
//                 isFeatured: true,
//                 type: "featured",
//               },
//             },
//             { $sort: { sortOrder: 1, createdAt: -1 } },
//             { $limit: 1 },
//             {
//               $project: {
//                 name: 1,
//                 description: 1,
//                 image: 1,
//                 pricingTiers: 1,
//               },
//             },
//           ],
//           as: "featuredArrangement",
//         },
//       },
//       {
//         $addFields: {
//           featuredArrangement: { $first: "$featuredArrangement" },
//         },
//       },
//       {
//         $project: {
//           businessName: 1,
//           slug: 1,
//           address: 1,
//           "contact.phone": 1,
//           verifiedFlorist: 1,
//           isPro: 1,
//           "stats.ordersCompleted": 1,
//           "stats.responseRate": 1,
//           avgRating: { $ifNull: [{ $avg: "$reviews.rating" }, 0] },
//           deliveryCharge: {
//             $add: [
//               { $ifNull: ["$baseFee", 0] },
//               { $cond: ["$isHoliday", "$delivery.holidaySurcharge", 0] },
//             ],
//           },
//           "delivery.sameDayCutoff": 1,
//           "delivery.blackoutTimes": 1,
//           featuredArrangement: 1,
//         },
//       },
//     ]);

//     // 3. JS Refinement & Sort (Treating zero-reviews as 0.0 rating)
//     const results = shops
//       .filter((shop) => {
//         if (delTimeOpt === "specific") {
//           if (
//             isToday &&
//             shop.delivery?.sameDayCutoff &&
//             shop.delivery.sameDayCutoff > delTimeFrom
//           )
//             return false;
//           return !shop.delivery?.blackoutTimes?.some(
//             (range: BlackoutTime) =>
//               (delTimeFrom >= range.start && delTimeFrom <= range.end) ||
//               (delTimeTo >= range.start && delTimeTo <= range.end),
//           );
//         }
//         return true;
//       })
//       .sort((a, b) => {
//         const aVerified = a.verifiedFlorist ? 1 : 0;
//         const bVerified = b.verifiedFlorist ? 1 : 0;

//         const aPro = a.isPro ? 1 : 0;
//         const bPro = b.isPro ? 1 : 0;

//         const aPriority = aVerified * 2 + aPro;
//         const bPriority = bVerified * 2 + bPro;

//         return (
//           bPriority - aPriority ||
//           a.deliveryCharge - b.deliveryCharge ||
//           b.avgRating - a.avgRating ||
//           a.businessName.localeCompare(b.businessName)
//         );
//       });

//     return NextResponse.json(results);
//   } catch (error) {
//     console.error("API Error:", error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 },
//     );
//   }
// }
