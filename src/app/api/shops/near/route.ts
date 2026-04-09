// /api/shops/near/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

export async function POST(request: Request) {
  try {
    await connectToDB();
    const { street, city, state, zip } = await request.json();

    // 1. Get Coordinates for the Search Address (OpenCage)
    const query = encodeURIComponent(`${street}, ${city}, ${state}, ${zip}, USA`);
    const geoRes = await fetch(`https://api.opencagedata.com{query}&key=${process.env.OPENCAGE_API_KEY}`);
    const geoData = await geoRes.json();
    
    if (!geoData.results?.length) return NextResponse.json({ error: "Location not found" }, { status: 400 });
    const { lat, lng } = geoData.results[0].geometry;

    // 2. The Smart Aggregation Pipeline
    const shops = await Shop.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "calculatedDistance", // Adds this field to the output (in meters)
          spherical: true,
          query: { onboardingComplete: true } // Filter non-finished shops early
        }
      },
      {
        $addFields: {
          // Convert calculatedDistance from meters to miles
          distanceInMiles: { $divide: ["$calculatedDistance", 1609.34] }
        }
      },
      {
        $match: {
          $and: [
            // UNIVERSAL RULE: Must be within shop's maxRadius
            { $expr: { $lte: ["$distanceInMiles", "$delivery.maxRadius"] } },
            // METHOD SPECIFIC RULES:
            {
              $or: [
                { "delivery.method": "distance" }, // If distance method, maxRadius check above is enough
                { 
                  "delivery.method": "zip", 
                  "delivery.zipZones.zip": zip // If zip method, must also match the zip
                }
              ]
            }
          ]
        }
      },
      {
        $project: {
          businessName: 1,
          address: 1,
          isSuspended: 1,
          verifiedFlorist: 1,
          delivery: 1,
          distanceInMiles: 1 // Send this to the frontend for the "X miles away" text
        }
      }
    ]);

    return NextResponse.json({ shops });
  } catch (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}


// Updated to do exact Zip match for v1, will add real geo + radius search in v2
// import { NextResponse } from "next/server";
// import { connectToDB } from "@/lib/mongoose";
// import Shop from "@/models/Shop";
// import { ApiError } from "@/lib/api-error";

// export async function GET(request: Request) {
//   try {
//     await connectToDB();

//     const { searchParams } = new URL(request.url);
//     const zip = searchParams.get("zip");

//     if (!zip || zip.length !== 5) {
//       return NextResponse.json(
//         { error: "Please provide a valid 5-digit ZIP code" },
//         { status: 400 }
//       );
//     }

//     // Exact ZIP match
//     const shops = await Shop.find({ zip }).select(
//       "shopName address city state phone"
//     );

//     if (!shops.length) {
//       return NextResponse.json({
//         shops: [],
//         message: "No florists in this ZIP yet."
//       });
//     }

//     return NextResponse.json({ shops });
//   } catch (error: any) {
//     console.error("FIND NEARBY SHOPS ERROR:", error);

//     if (error instanceof ApiError) {
//       return NextResponse.json(
//         { error: error.message, code: error.code },
//         { status: error.status }
//       );
//     }

//     return NextResponse.json(
//       {
//         error:
//           "Something went wrong. Please try again. If the issue persists, Contact GetBloomDirect Support.",
//         code: "SERVER_ERROR",
//       },
//       { status: 500 }
//     );
//   }
// }
