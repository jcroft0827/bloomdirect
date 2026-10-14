"use client";

import { Camera, CheckCircle2, ImagePlus, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

type ArrangementPhoto = {
  photoId: string;
  imageUrl: string;
  caption?: string;
  uploadedAt: string | Date;
  sentToCustomerAt?: string | Date | null;
};

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function BloomWebsiteArrangementPhotos({
  orderId,
  customerEmail,
  photos,
}: {
  orderId: string;
  customerEmail: string;
  photos: ArrangementPhoto[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState<"upload" | string | null>(null);

  function resetSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl("");
    setCaption("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function chooseFile(file: File | null) {
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Photos must be JPG, PNG, or WebP.");
      return;
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      toast.error("Photos must be smaller than 8 MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function uploadPhoto() {
    if (!selectedFile || busy) return;
    setBusy("upload");

    try {
      const prepareResponse = await fetch(
        `/api/websites/orders/${orderId}/photos/upload-url`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
          }),
        },
      );

      const prepared = await prepareResponse.json().catch(() => null);
      if (!prepareResponse.ok) {
        throw new Error(prepared?.error || "Unable to prepare the photo upload.");
      }

      const uploadResponse = await fetch(prepared.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("The photo could not be uploaded to storage.");
      }

      const saveResponse = await fetch(`/api/websites/orders/${orderId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey: prepared.fileKey, caption }),
      });

      const saved = await saveResponse.json().catch(() => null);
      if (!saveResponse.ok) {
        throw new Error(saved?.error || "Unable to attach the photo to this order.");
      }

      toast.success("Arrangement photo added to the order.");
      resetSelection();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to upload the photo.");
    } finally {
      setBusy(null);
    }
  }

  async function sendPhoto(photoId: string) {
    if (busy) return;
    setBusy(photoId);

    try {
      const response = await fetch(
        `/api/websites/orders/${orderId}/photos/${encodeURIComponent(photoId)}/send`,
        { method: "POST" },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to send the arrangement photo.");
      }

      toast.success(`Arrangement photo sent to ${customerEmail}.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send the arrangement photo.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Camera size={19} className="text-purple-700" />
            <h2 className="text-xl font-black text-gray-950">Arrangement Photos</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
            Take a photo from a phone or iPad, attach it to this order, and send the finished arrangement directly to the customer.
          </p>
        </div>

        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-purple-800">
          <ImagePlus size={17} />
          Add Photo
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="sr-only"
            onChange={(event) => chooseFile(event.target.files?.[0] || null)}
          />
        </label>
      </div>

      {selectedFile && previewUrl && (
        <div className="mt-5 grid gap-5 rounded-2xl border border-purple-100 bg-purple-50/50 p-4 sm:grid-cols-[180px_1fr]">
          <img
            src={previewUrl}
            alt="Selected arrangement preview"
            className="aspect-square w-full rounded-2xl object-cover"
          />
          <div>
            <p className="font-black text-gray-950">Ready to attach</p>
            <p className="mt-1 text-xs text-gray-500">{selectedFile.name}</p>
            <label className="mt-4 block">
              <span className="text-sm font-black text-gray-800">Customer caption <span className="font-semibold text-gray-400">Optional</span></span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Example: We loved creating this arrangement for your order!"
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={uploadPhoto}
                disabled={busy !== null}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-purple-700 px-4 text-sm font-black text-white disabled:opacity-50"
              >
                {busy === "upload" && <Loader2 size={15} className="mr-2 animate-spin" />}
                Attach to Order
              </button>
              <button
                type="button"
                onClick={resetSelection}
                disabled={busy !== null}
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-black text-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
          No arrangement photos have been added yet. On a phone or iPad, <strong>Add Photo</strong> can open the device camera.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => {
            const sent = Boolean(photo.sentToCustomerAt);
            return (
              <article key={photo.photoId} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <img src={photo.imageUrl} alt="Arrangement photo" className="aspect-square w-full object-cover" />
                <div className="p-4">
                  {photo.caption ? (
                    <p className="text-sm leading-6 text-gray-700">{photo.caption}</p>
                  ) : (
                    <p className="text-sm italic text-gray-400">No caption</p>
                  )}
                  <p className="mt-2 text-xs font-semibold text-gray-400">
                    Added {new Date(photo.uploadedAt).toLocaleString("en-US")}
                  </p>

                  {sent ? (
                    <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                      <CheckCircle2 size={15} />
                      Sent to customer
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sendPhoto(photo.photoId)}
                      disabled={busy !== null}
                      className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-purple-200 bg-purple-50 px-3 text-sm font-black text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
                    >
                      {busy === photo.photoId ? (
                        <Loader2 size={15} className="mr-2 animate-spin" />
                      ) : (
                        <Send size={15} className="mr-2" />
                      )}
                      Send to Customer
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
