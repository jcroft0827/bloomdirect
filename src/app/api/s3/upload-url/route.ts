import { NextResponse } from "next/server";
import { generateUploadUrl } from "@/lib/s3";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileName, fileType } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "Missing fileName or fileType" },
        { status: 400 }
      );
    }

    const uniqueName = `${Date.now()}-${fileName}`;

    const { uploadUrl, fileUrl } = await generateUploadUrl(
      uniqueName,
      fileType
    );

    return NextResponse.json({ uploadUrl, fileUrl });
  } catch (error) {
    console.error("S3 Upload URL Error:", error);

    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
