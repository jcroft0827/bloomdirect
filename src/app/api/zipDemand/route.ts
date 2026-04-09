import { connectToDB } from "@/lib/mongoose";
import ZipDemand from "@/models/ZipDemand";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        await connectToDB();
        const body = await req.json();
        console.log("Received ZIP demand:", body);

        const existing = await ZipDemand.findOne({ zip: body.zip });
        console.log("Existing ZIP demand:", existing);
        if (existing) {
            console.log("ZIP already exists:", body.zip);
            console.log(existing);
            // Increment demand score
            existing.demandScore += 1;
            await existing.save();
        } else {
            // Create new ZIP demand
            const newZipDemand = await ZipDemand.create({
                zip: body.zip,
                demandScore: 1,
            });
            return NextResponse.json({ success: true, newZipDemand });
        }
    } catch (error) {
        console.error("Error handling ZIP demand:", error);
        return new Response("Error handling ZIP demand", { status: 500 });
    }
};