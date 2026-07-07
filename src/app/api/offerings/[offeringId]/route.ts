import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import FulfillmentOffering from "@/models/FulfillmentOffering";
import { getAuthenticatedShop } from "@/lib/shops/getAuthenticatedShop";

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ offeringId: string }> },
) {
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

    const { offeringId } = await params;
    const body = await req.json();

    const offering = await FulfillmentOffering.findOne({
      _id: offeringId,
      shop: shop._id,
    });

    if (!offering) {
      return NextResponse.json(
        { error: "Offering not found." },
        { status: 404 },
      );
    }

    const pricingTiers = Array.isArray(body.pricingTiers)
      ? body.pricingTiers
      : [];

    if (pricingTiers.length < 1 || pricingTiers.length > 3) {
      return NextResponse.json(
        { error: "Offerings must have between 1 and 3 pricing tiers." },
        { status: 400 },
      );
    }

    for (const tier of pricingTiers) {
      if (!tier.label?.trim()) {
        return NextResponse.json(
          { error: "Each pricing tier needs a label." },
          { status: 400 },
        );
      }

      if (Number(tier.price) < 0 || Number.isNaN(Number(tier.price))) {
        return NextResponse.json(
          { error: "Each pricing tier needs a valid price." },
          { status: 400 },
        );
      }
    }

    const isDesignerChoice = offering.isDesignerChoice === true;

    if (isDesignerChoice && body.isActive === false) {
      return NextResponse.json(
        { error: "Designer's Choice must remain active." },
        { status: 400 },
      );
    }

    if (!shop.isPro && body.isActive === false) {
      return NextResponse.json(
        { error: "Free shops cannot deactivate offerings." },
        { status: 403 },
      );
    }

    if (!shop.isPro && body.isFeatured !== offering.isFeatured) {
      return NextResponse.json(
        { error: "Featured controls are a Bloom Pro feature." },
        { status: 403 },
      );
    }

    if (body.isDefault === false && offering.isDefault) {
      const otherDefault = await FulfillmentOffering.findOne({
        shop: shop._id,
        _id: { $ne: offering._id },
        isDefault: true,
      });

      if (!otherDefault) {
        return NextResponse.json(
          { error: "At least one offering must be marked as default." },
          { status: 400 },
        );
      }
    }

    if (body.isFeatured === true && shop.isPro) {
      const featuredCount = await FulfillmentOffering.countDocuments({
        shop: shop._id,
        _id: { $ne: offering._id },
        isFeatured: true,
        isActive: true,
      });

      if (featuredCount >= 3) {
        return NextResponse.json(
          { error: "Bloom Pro shops can feature up to 3 offerings." },
          { status: 400 },
        );
      }
    }

    if (body.isDefault === true) {
      await FulfillmentOffering.updateMany(
        { shop: shop._id, _id: { $ne: offering._id } },
        { $set: { isDefault: false } },
      );
    }

    offering.name = body.name?.trim() || offering.name;
    offering.slug = slugify(offering.name);
    offering.description = body.description?.trim() || "";
    offering.image = body.image || "";
    offering.pricingTiers = pricingTiers.map((tier: any) => ({
      label: tier.label.trim(),
      price: Number(tier.price),
      description: tier.description?.trim() || "",
    }));
    offering.isDefault = !!body.isDefault;

    if (shop.isPro && !isDesignerChoice) {
      offering.isActive = body.isActive !== false;
      offering.isFeatured = !!body.isFeatured;
      offering.internalName = body.internalName?.trim() || "";
      offering.occasions = Array.isArray(body.occasions)
        ? body.occasions
        : offering.occasions;
      offering.type = body.type || offering.type;
    }

    if (isDesignerChoice) {
      offering.isActive = true;
      offering.isDesignerChoice = true;
      offering.type = "designers_choice";
    }

    await offering.save();

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
    console.error("PATCH OFFERING ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ offeringId: string }> },
) {
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
        { error: "Deleting offerings is a Bloom Pro feature." },
        { status: 403 },
      );
    }

    const { offeringId } = await params;

    const offering = await FulfillmentOffering.findOne({
      _id: offeringId,
      shop: shop._id,
    });

    if (!offering) {
      return NextResponse.json(
        { error: "Offering not found." },
        { status: 404 },
      );
    }

    if (offering.isDesignerChoice) {
      return NextResponse.json(
        { error: "Designer's Choice cannot be deleted." },
        { status: 400 },
      );
    }

    const totalOfferings = await FulfillmentOffering.countDocuments({
      shop: shop._id,
    });

    if (totalOfferings <= 2) {
      return NextResponse.json(
        { error: "A shop must keep at least Designer's Choice and one Featured Arrangement." },
        { status: 400 },
      );
    }

    const wasDefault = offering.isDefault;

    await FulfillmentOffering.deleteOne({
      _id: offering._id,
      shop: shop._id,
    });

    if (wasDefault) {
      await FulfillmentOffering.findOneAndUpdate(
        {
          shop: shop._id,
          isDesignerChoice: true,
        },
        {
          $set: { isDefault: true, isActive: true },
        },
      );
    }

    const updatedOfferings = await FulfillmentOffering.find({
      shop: shop._id,
    })
      .sort({ isDesignerChoice: -1, sortOrder: 1, createdAt: 1 })
      .select(
        "type name internalName slug description image occasions pricingTiers allowsSubstitutions isActive isDefault isFeatured isDesignerChoice sortOrder proOnly taxable",
      );

    return NextResponse.json({
      success: true,
      offerings: updatedOfferings,
    });
  } catch (error) {
    console.error("DELETE OFFERING ERROR:", error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 },
    );
  }
}
