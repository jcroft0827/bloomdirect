import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { checkBloomWebsiteRateLimit } from "@/lib/bloom-websites/checkBloomWebsiteRateLimit";
import { generateViewUrl } from "@/lib/s3";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkBloomWebsiteRateLimit({
      request: req,
      scope: "authenticated-s3-view",
      subject: session.user.id,
      limit: 60,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many file-view requests. Please wait and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const body = await req.json().catch(() => null);
    const key = body && typeof body.key === "string" ? body.key.trim() : "";

    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    const ownPrefix = `shops/${session.user.id}/`;
    const isAdmin = session.user.role === "admin";

    if (!isAdmin && !key.startsWith(ownPrefix)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const viewUrl = await generateViewUrl(key);

    return NextResponse.json({ viewUrl });
  } catch (error) {
    console.error("S3 View URL Error:", error);
    return NextResponse.json(
      { error: "Failed to generate view URL" },
      { status: 500 },
    );
  }
}
