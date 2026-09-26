import { runBloomWebsiteCommerceRecovery } from "@/lib/bloom-websites/payments/runBloomWebsiteCommerceRecovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const secret =
    process.env.CRON_SECRET ||
    process.env.INTERNAL_CRON_SECRET ||
    "";

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json(
      { error: "Unauthorized." },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    const result = await runBloomWebsiteCommerceRecovery({
      passes: 3,
      batchSize: 25,
    });

    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("BloomWebsite commerce recovery failed:", error);

    return Response.json(
      {
        success: false,
        error: "BloomWebsite commerce recovery failed.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
