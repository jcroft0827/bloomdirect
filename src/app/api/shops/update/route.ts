import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { ApiError } from "@/lib/api-error";

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









// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { connectToDB } from "@/lib/mongoose";
// import Shop from "@/models/Shop";
// import { redirect } from "next/navigation";
// import { ApiError } from "@/lib/api-error";

// export async function POST(req: Request) {
//   try {
//     await connectToDB();

//     const session = await getServerSession(authOptions);

//     // 🔥 New logic: shop ID = user ID
//     const shopId = session?.user?.id;

//     if (!shopId) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const body = await req.json();

//     const allowedUpdates = {
//       shopName: body.shopName,
//       phone: body.phone,
//       address: body.address,
//       city: body.city,
//       state: body.state,
//       zip: body.zip,
//       logo: body.logo,
//       featuredBouquet: body.featuredBouquet,
//       acceptsWalkIns: body.acceptsWalkIns,
//       weddingConsultations: body.weddingConsultations,
//       securityCode: body.securityCode,
//     };

//     console.log("UPDATE BODY: ", body);

//     const updatedShop = await Shop.findByIdAndUpdate(
//       shopId,
//       allowedUpdates,
//       { new: true }
//     );

//     if (!updatedShop) {
//       return NextResponse.json({ error: "Shop not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, shop: updatedShop });
//     redirect("/dashboard");
//   } catch (error: any) {
//     console.error("UPDATE SHOP ERROR:", error);

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
