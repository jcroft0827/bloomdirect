// src/lib/bloom-websites/uploadBloomCatalogueImage.ts

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_OPTIMIZED_DIMENSION = 1600;
const WEBP_QUALITY = 0.84;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type UploadTarget = {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
};

export type BloomCatalogueImageUpload = {
  originalKey: string;
  originalUrl: string;
  originalMimeType: string;
  originalFileSize: number;
  optimizedKey: string;
  optimizedUrl: string;
  optimizedFileSize: number;
  width: number;
  height: number;
};

async function requestUploadTarget(
  fileType: string,
  fileSize: number,
  variant: "original" | "optimized",
): Promise<UploadTarget> {
  const response = await fetch("/api/admin/bloom-catalogue/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileType, fileSize, variant }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || "Unable to prepare catalogue image upload.");
  }

  if (
    typeof data?.uploadUrl !== "string" ||
    typeof data?.fileKey !== "string" ||
    typeof data?.publicUrl !== "string"
  ) {
    throw new Error("The catalogue upload response was invalid.");
  }

  return data as UploadTarget;
}

async function putToS3(target: UploadTarget, body: Blob, contentType: string) {
  const response = await fetch(target.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });

  if (!response.ok) {
    throw new Error(`Unable to upload catalogue image. Storage returned ${response.status}.`);
  }
}

async function makeOptimizedWebp(file: File) {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(
      1,
      MAX_OPTIMIZED_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("This browser could not prepare the optimized catalogue image.");
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Unable to create the optimized catalogue image."));
        },
        "image/webp",
        WEBP_QUALITY,
      );
    });

    if (blob.type !== "image/webp") {
      throw new Error(
        "This browser cannot create the optimized WebP catalogue image. Try a current version of Chrome, Edge, Firefox, or Safari.",
      );
    }

    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}

export async function uploadBloomCatalogueImage(
  file: File,
): Promise<BloomCatalogueImageUpload> {
  if (
    !ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
    )
  ) {
    throw new Error("Catalogue images must be JPG, PNG, or WebP.");
  }

  if (file.size <= 0) {
    throw new Error("The selected catalogue image is empty.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Catalogue images must be smaller than 8 MB.");
  }

  const optimized = await makeOptimizedWebp(file);
  const [originalTarget, optimizedTarget] = await Promise.all([
    requestUploadTarget(file.type, file.size, "original"),
    requestUploadTarget("image/webp", optimized.blob.size, "optimized"),
  ]);

  await Promise.all([
    putToS3(originalTarget, file, file.type),
    putToS3(optimizedTarget, optimized.blob, "image/webp"),
  ]);

  return {
    originalKey: originalTarget.fileKey,
    originalUrl: originalTarget.publicUrl,
    originalMimeType: file.type,
    originalFileSize: file.size,
    optimizedKey: optimizedTarget.fileKey,
    optimizedUrl: optimizedTarget.publicUrl,
    optimizedFileSize: optimized.blob.size,
    width: optimized.width,
    height: optimized.height,
  };
}
