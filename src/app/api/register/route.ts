import { connectToDB } from "@/lib/mongoose";
import { NextResponse } from "next/server";
import Shop from "@/models/Shop";
import { ApiError } from "@/lib/api-error";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const body = await req.json();

    const { businessName, email, password } = body;

    const shopSlug = businessName
      .normalize("NFD") // 1. Decompose combined characters (like 'é' to 'e' + '´')
      .replace(/[\u0300-\u036f]/g, "") // 2. Remove the now-separated accent marks
      .toLowerCase() // 3. Lowercase everything
      .trim() // 4. Remove leading/trailing whitespace
      .replace(/[^a-z0-9\s-]/g, "") // 5. Remove any remaining non-alphanumeric chars
      .replace(/[\s_-]+/g, "-") // 6. Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, ""); // 7. Trim hyphens from ends

    // Basic validation
    if (!businessName || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    //Check for existing account
    const existing = await Shop.findOne({ email: normalizedEmail });

    if (existing) {
      return NextResponse.json(
        { error: "Email already used" },
        { status: 400 },
      );
    }

    // Create new shop
    const shop = await Shop.create({
      // Core Identity
      businessName: businessName.trim(),
      email: normalizedEmail,
      password,

      // Account state
      onboardingComplete: false,
      networkJoinDate: new Date(),

      slug: shopSlug,

      // Setup progress tracker
      setupProgress: {
        businessInfo: false,
        paymentMethods: false,
        deliverySettings: false,
        financialSettings: false,
        featuredBouquet: false,
      },

      // Stats defaults
      stats: {
        ordersSent: 0,
        ordersRecieved: 0,
        ordersCompleted: 0,
        ordersDeclined: 0,
      },
    });

    return NextResponse.json({
      success: true,
      shopId: shop._id,
    });
  } catch (error: any) {
    console.log("REGISTRATION SHOP ERROR: ", error);

    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error:
          "Something went wrong. Please try again. If the issue persists, contact BloomDirect support.",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}

// export async function POST(req: Request) {
//   try {
//     await connectToDB();
//     const body = await req.json();

//     const existing = await Shop.findOne({ email: body.email });
//     if (existing) {
//       return NextResponse.json(
//         { error: "Email already used" },
//         { status: 400 },
//       );
//     }

//     // Check for P.O. Box in address (not supported by geocoding)
//     function isPOBox(address: string) {
//       if (!address) return false;
//       const lower = address.toLowerCase().replace(/\s+/g, ""); // remove spaces to catch tricky formatting
//       const patterns = [
//         "pobox",
//         "p.o.box",
//         "po.box",
//         "p.o.b",
//         "p.o",
//         "box", // catches "Box 123"
//         "mailingaddress",
//       ];

//       // Return true if any pattern matches at the start of the address
//       return patterns.some((pattern) => lower.startsWith(pattern));
//     }

//     if (isPOBox(body.address)) {
//       return NextResponse.json(
//         {
//           error:
//             "P.O. Box addresses are not supported. Please provide a physical address.",
//         },
//         { status: 400 },
//       );
//     }

//     // Generate geoLocation if address provided
//     let geoLocation = null;
//     if (body.address && body.city && body.state && body.zip) {
//       const fullAddress = `${body.address}, ${body.city}, ${body.state} ${body.zip}`;
//       geoLocation = await geoCodeAddress(fullAddress);
//     }

//     // const shop = await Shop.create(body);
//     const shop = await Shop.create({
//       ...body,
//       securityCode: "0829",
//       geoLocation, // << save geoLocation
//     });

//     return NextResponse.json({ success: true, shop }); // << add 'shop' to response, if broken, remove
//   } catch (error: any) {
//     console.error("REGISTER SHOP ERROR:", error);

//     if (error instanceof ApiError) {
//       return NextResponse.json(
//         { error: error.message, code: error.code },
//         { status: error.status },
//       );
//     }

//     return NextResponse.json(
//       {
//         error:
//           "Something went wrong. Please try again. If the issue persists, Contact GetBloomDirect Support.",
//         code: "SERVER_ERROR",
//       },
//       { status: 500 },
//     );
//   }
// }
