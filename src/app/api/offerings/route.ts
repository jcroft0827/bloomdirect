import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { getAuthenticatedShop } from "@/lib/shops/getAuthenticatedShop";
import FulfillmentOffering from "@/models/FulfillmentOffering";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
    try {
        await connectToDB();

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const shop = await getAuthenticatedShop(session.user.id);

        if (!shop) {
            return NextResponse.json({ error: "Shop not found" }, { status: 404 });
        }

        if (!shop.isPro) {
            return NextResponse.json(
                { error: "Adding additional offerings is a Bloom Pro feature." },
                { status: 403 },
            );
        }

        const totalOfferings = await FulfillmentOffering.countDocuments({
            shop: shop._id,
        });

        if (totalOfferings >= 10) {
            return NextResponse.json(
                { error: "Bloom Pro shops can have up to 10 offerings." },
                { status: 400 },
            );
        }

        const body = await req.json();

        const name = body.name?.trim() || "New Offering";
        const type = body.type || "everyday";

        const offering = await FulfillmentOffering.create({
            shop: shop._id,
            type,
            name,
            internalName: body.internalName?.trim() || "",
            slug: slugify(name),
            description: body.description?.trim() || "",
            image: body.image || "",
            occasions: Array.isArray(body.occasions)
                ? body.occasions
                : ["everyday"],
            pricingTiers: [
                {
                    label: "Standard",
                    price: 75,
                    description: "",
                },
            ],
            taxable: true,
            allowsSubstitutions: true,
            isActive: true,
            isDefault: false,
            isFeatured: false,
            isDesignerChoice: false,
            sortOrder: totalOfferings + 1,
            proOnly: true,
        });

        const updatedOfferings = await FulfillmentOffering.find({
            shop: shop._id,
        })
            .sort({ isDesignerChoice: -1, sortOrder: 1, createdAt: 1 })
            .select(
                "type name internalName slug description image occasions pricingTiers allowsSubstitutions isActive isDefault isFeatured isDesignerChoice sortOrder proOnly taxable",
            );

        return NextResponse.json({
            success: true,
            offering,
            offerings: updatedOfferings,
        });
    } catch (error) {
        console.error("CREATE OFFERING ERROR:", error);

        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}