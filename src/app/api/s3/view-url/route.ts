import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    // Generate signed URL valid for 1 hour
    const viewUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return NextResponse.json({ viewUrl });
  } catch (error) {
    console.error("S3 View URL Error:", error);
    return NextResponse.json(
      { error: "Failed to generate view URL" },
      { status: 500 }
    );
  }
}
