import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import ShopClient from "./ShopClient";
import FulfillmentOffering from "@/models/FulfillmentOffering";

interface Props {
    params: { slug: string };
}

export default async function ShopPage({
    params
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    await connectToDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) notFound();

    const shop = await Shop.findOne({ slug });
    if (!shop) notFound();

    const offerings = await FulfillmentOffering.find({
        shop: shop._id,
        isActive: true,
    })
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean();

    const serializedShop = JSON.parse(JSON.stringify(shop));
    const serializedOfferings = JSON.parse(JSON.stringify(offerings));

    return(
        <main className="min-h-screen bg-gray-50">
            <ShopClient shop={serializedShop} offerings={serializedOfferings} />
        </main>
    )
}