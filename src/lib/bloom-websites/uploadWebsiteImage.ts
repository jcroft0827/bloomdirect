// src/lib/bloom-websites/uploadWebsiteImage.ts

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type BloomWebsiteAssetType = "product" | "addon" | "branding";

type UploadWebsiteImageOptions = {
  file: File;
  assetType: BloomWebsiteAssetType;
};

export async function uploadWebsiteImage({
  file,
  assetType,
}: UploadWebsiteImageOptions): Promise<string> {
  if (
    !ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
    )
  ) {
    throw new Error("Images must be JPG, PNG, or WebP.");
  }

  if (file.size <= 0) {
    throw new Error("The selected image is empty.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Images must be smaller than 8 MB.");
  }

  /*
   * Ask the authenticated BloomWebsites API
   * for a short-lived S3 PUT URL.
   */
  const response = await fetch("/api/websites/images/upload-url", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      fileType: file.type,
      fileSize: file.size,
      assetType,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Unable to prepare image upload.");
  }

  if (
    typeof data?.uploadUrl !== "string" ||
    typeof data?.publicUrl !== "string"
  ) {
    throw new Error("The image upload response was invalid.");
  }

  /*
   * Upload directly from the browser to S3.
   *
   * GetBloomDirect/BloomWebsites never needs
   * to proxy the image bytes through Next.js.
   */
  const uploadResponse = await fetch(data.uploadUrl, {
    method: "PUT",

    headers: {
      "Content-Type": file.type,
    },

    body: file,
  });

  if (!uploadResponse.ok) {
    const uploadError = await uploadResponse.text();

    console.error("BloomWebsite image upload failed:", {
      status: uploadResponse.status,

      statusText: uploadResponse.statusText,

      body: uploadError,
    });

    throw new Error(
      `Unable to upload image. Storage returned ${uploadResponse.status}.`,
    );
  }

  return data.publicUrl;
}
