import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { isBloomWebsiteRequestHostMatch } from "@/lib/bloom-websites/storefront-hostname";

type WebsiteAccessShape = {
  shop: unknown;
  status?: "preview" | "live" | "paused";
  customDomain?: string;
  domainVerified?: boolean;
};

export type BloomWebsiteStorefrontAccessMode = "owner_preview" | "public_live";

export async function authorizeBloomWebsiteStorefrontAccess(
  request: Request,
  website: WebsiteAccessShape,
): Promise<
  | { allowed: true; mode: BloomWebsiteStorefrontAccessMode }
  | { allowed: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  const ownerId = String(website.shop);

  if (session?.user?.id && session.user.id === ownerId) {
    return { allowed: true, mode: "owner_preview" };
  }

  const publicLive = Boolean(
    website.status === "live" &&
      website.domainVerified === true &&
      isBloomWebsiteRequestHostMatch(
        request.headers,
        website.customDomain,
      ),
  );

  if (publicLive) {
    return { allowed: true, mode: "public_live" };
  }

  return {
    allowed: false,
    response: NextResponse.json(
      { error: "Storefront could not be found." },
      { status: 404 },
    ),
  };
}
