import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsitePosIntegration from "@/models/BloomWebsitePosIntegration";
import Shop from "@/models/Shop";
import { encryptIntegrationSecret } from "@/lib/bloom-websites/pos/integrationSecrets";

export const runtime = "nodejs";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function protocolDefaultPort(protocol: string) {
  if (protocol === "sftp") return 22;
  if (protocol === "ftps") return 21;
  return 21;
}

async function getContext() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    } as const;
  }

  await connectToDB();

  const shop = await Shop.findById(session.user.id)
    .select("_id isSuspended")
    .lean<any>();

  if (!shop) {
    return {
      response: NextResponse.json({ error: "Shop not found." }, { status: 404 }),
    } as const;
  }

  if (shop.isSuspended) {
    return {
      response: NextResponse.json(
        { error: "Suspended shops cannot update integrations." },
        { status: 403 },
      ),
    } as const;
  }

  const website = await BloomWebsite.findOne({ shop: session.user.id })
    .select("_id siteName")
    .lean<any>();

  if (!website) {
    return {
      response: NextResponse.json(
        { error: "BloomWebsite not found." },
        { status: 404 },
      ),
    } as const;
  }

  return {
    shopId: session.user.id,
    website,
  } as const;
}

export async function GET() {
  try {
    const context = await getContext();
    if ("response" in context) return context.response;

    const integration = await BloomWebsitePosIntegration.findOne({
      shop: context.shopId,
      website: context.website._id,
      provider: "tfpos",
    })
      .select(
        "+transport.encryptedPassword +transport.passwordIv +transport.passwordAuthTag",
      )
      .lean<any>();

    return NextResponse.json({
      success: true,
      website: {
        id: String(context.website._id),
        siteName: context.website.siteName,
      },
      integration: integration
        ? {
            enabled: Boolean(integration.enabled),
            automaticExport: integration.automaticExport !== false,
            protocol: integration.transport?.protocol || "sftp",
            host: integration.transport?.host || "",
            port:
              integration.transport?.port ||
              protocolDefaultPort(integration.transport?.protocol || "sftp"),
            folder: integration.transport?.folder || "/",
            username: integration.transport?.username || "",
            hasPassword: Boolean(
              integration.transport?.encryptedPassword &&
                integration.transport?.passwordIv &&
                integration.transport?.passwordAuthTag,
            ),
            sourceVendor: integration.sourceVendor || "BloomWebsites",
            payloadEncryptionMode:
              integration.payloadEncryption?.mode || "none",
            lastConnectionTest: integration.lastConnectionTest || {
              status: "",
              testedAt: null,
              message: "",
            },
          }
        : {
            enabled: false,
            automaticExport: true,
            protocol: "sftp",
            host: "",
            port: 22,
            folder: "/",
            username: "",
            hasPassword: false,
            sourceVendor: "BloomWebsites",
            payloadEncryptionMode: "none",
            lastConnectionTest: {
              status: "",
              testedAt: null,
              message: "",
            },
          },
    });
  } catch (error) {
    console.error("TFPOS integration GET failed:", error);
    return NextResponse.json(
      { error: "Unable to load The Floral POS integration." },
      { status: 500 },
    );
  }
}

type UpdateBody = {
  enabled?: unknown;
  automaticExport?: unknown;
  protocol?: unknown;
  host?: unknown;
  port?: unknown;
  folder?: unknown;
  username?: unknown;
  password?: unknown;
  sourceVendor?: unknown;
};

export async function PATCH(request: Request) {
  try {
    const context = await getContext();
    if ("response" in context) return context.response;

    const body = (await request.json().catch(() => null)) as UpdateBody | null;

    if (!body) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const protocol = clean(body.protocol) || "sftp";
    if (!['ftp', 'ftps', 'sftp'].includes(protocol)) {
      return NextResponse.json({ error: "Invalid transfer protocol." }, { status: 400 });
    }

    const portValue = Number(body.port ?? protocolDefaultPort(protocol));
    if (!Number.isInteger(portValue) || portValue < 1 || portValue > 65535) {
      return NextResponse.json({ error: "Enter a valid port." }, { status: 400 });
    }

    const enabled = body.enabled === true;
    const automaticExport = body.automaticExport !== false;
    const host = clean(body.host);
    const username = clean(body.username);
    const folder = clean(body.folder) || "/";
    const sourceVendor = clean(body.sourceVendor) || "BloomWebsites";
    const password = typeof body.password === "string" ? body.password : "";

    if (enabled && (!host || !username)) {
      return NextResponse.json(
        { error: "Server address and username are required before enabling TFPOS." },
        { status: 400 },
      );
    }

    if (sourceVendor.length > 120) {
      return NextResponse.json({ error: "Source vendor is too long." }, { status: 400 });
    }

    let integration = await BloomWebsitePosIntegration.findOne({
      shop: context.shopId,
      website: context.website._id,
      provider: "tfpos",
    }).select(
      "+transport.encryptedPassword +transport.passwordIv +transport.passwordAuthTag",
    );

    if (!integration) {
      integration = new BloomWebsitePosIntegration({
        shop: context.shopId,
        website: context.website._id,
        provider: "tfpos",
      });
    }

    integration.enabled = enabled;
    integration.automaticExport = automaticExport;
    integration.transport.protocol = protocol;
    integration.transport.host = host;
    integration.transport.port = portValue;
    integration.transport.folder = folder;
    integration.transport.username = username;
    integration.sourceVendor = sourceVendor;
    integration.payloadEncryption.mode = "none";

    if (password) {
      const encrypted = encryptIntegrationSecret(password);
      integration.transport.encryptedPassword = encrypted.encryptedValue;
      integration.transport.passwordIv = encrypted.iv;
      integration.transport.passwordAuthTag = encrypted.authTag;
    }

    if (enabled && !integration.transport.encryptedPassword) {
      return NextResponse.json(
        { error: "A password is required before enabling TFPOS." },
        { status: 400 },
      );
    }

    await integration.save();

    return NextResponse.json({
      success: true,
      integration: {
        enabled: Boolean(integration.enabled),
        automaticExport: integration.automaticExport !== false,
        protocol: integration.transport.protocol,
        host: integration.transport.host,
        port: integration.transport.port,
        folder: integration.transport.folder,
        username: integration.transport.username,
        hasPassword: Boolean(integration.transport.encryptedPassword),
        sourceVendor: integration.sourceVendor,
        payloadEncryptionMode: integration.payloadEncryption.mode,
        lastConnectionTest: integration.lastConnectionTest,
      },
    });
  } catch (error) {
    console.error("TFPOS integration PATCH failed:", error);
    const message = error instanceof Error ? error.message : "Unable to save integration.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
