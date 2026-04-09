import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        await connectToDB();
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
        }

        const data = await req.json();

        const { fulfillShopId } = data;

        if (!fulfillShopId) {
            return NextResponse.json({ error: "Missing Shop ID" }, { status: 400 });
        }

        const fulfillingShop = await Shop.findById(fulfillShopId).lean();
        
        return NextResponse.json(fulfillingShop);      
        
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}