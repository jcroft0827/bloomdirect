// app/dashboard/setup/featured-arrangement/page.tsx

"use client";

import BloomSpinner from "@/components/BloomSpinner";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type FeaturedArrangementForm = {
  name: string;
  price: string;
  description: string;
  image: string;
};

export default function FeaturedArrangementSetup() {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [form, setForm] = useState<FeaturedArrangementForm>({
    name: "",
    price: "",
    description: "",
    image: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadShop() {
      try {
        const res = await fetch("/api/shops/me");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load shop.");
        }

        setBusinessName(data.shop?.businessName || "");
      } catch (err) {
        console.error("Failed to load shop data:", err);
      }
    }

    loadShop();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  function roundToHundredth(num: number) {
    return (Math.round((num + Number.EPSILON) * 100) / 100).toFixed(2);
  }

  function handlePriceBlur(e: React.FocusEvent<HTMLInputElement>) {
    const numValue = parseFloat(e.target.value);

    if (isNaN(numValue)) return;

    setForm((prev) => ({
      ...prev,
      price: roundToHundredth(numValue),
    }));
  }

  async function handleImageUpload(file: File) {
    try {
      setUploading(true);
      setError(null);

      const uploadRes = await fetch("/api/s3/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to get upload URL.");
      }

      const { uploadUrl, fileKey } = await uploadRes.json();

      const s3Upload = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!s3Upload.ok) {
        throw new Error("Failed to upload image.");
      }

      const cfBase = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
      const imageUrl = `${cfBase}/${fileKey}`;

      setForm((prev) => ({
        ...prev,
        image: imageUrl,
      }));
    } catch (err: any) {
      console.error("Featured arrangement image upload error:", err);
      setError(err.message || "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();

    setForm((prev) => ({
      ...prev,
      image: "",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/setup/featured-arrangement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save featured arrangement.");
      }

      router.refresh();
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Featured arrangement save error:", err);
      setError(err.message || "Failed to save featured arrangement.");
    } finally {
      setLoading(false);
    }
  }

  const hasImage =
    form.image && !form.image.includes("/undefined") && form.image !== "undefined";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          <span className="text-emerald-700">{businessName}</span> Featured
          Arrangement
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Add one arrangement you would like other florists to see first. This
          can be Designer&apos;s Choice, a seasonal arrangement, sympathy piece,
          or another common fulfillment option.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="ml-1 text-xs uppercase text-gray-500"
          >
            Arrangement Name
          </label>

          <input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Designer's Choice, Seasonal Mix, Sympathy Arrangement, etc."
            className="w-full rounded-lg border px-3 py-2 capitalize focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>

        <div>
          <label
            htmlFor="price"
            className="ml-1 text-xs uppercase text-gray-500"
          >
            Starting Price ($)
          </label>

          <input
            id="price"
            name="price"
            type="number"
            value={form.price}
            onChange={handleChange}
            onBlur={handlePriceBlur}
            placeholder="75.00"
            step="0.01"
            min="0"
            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="description"
          className="ml-1 text-xs uppercase text-gray-500"
        >
          Arrangement Description
        </label>

        <textarea
          id="description"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Describe what another florist can expect when selecting this arrangement."
          className="min-h-28 w-full rounded-lg border px-3 py-2 capitalize focus:outline-none focus:ring-2 focus:ring-purple-600"
        />
      </div>

      <div className="flex w-52 flex-col items-center gap-1">
        <label className="ml-1 text-xs uppercase text-gray-500">
          Featured Arrangement Photo
        </label>

        <div
          onClick={() => imageInputRef.current?.click()}
          className="relative flex h-52 w-52 cursor-pointer flex-col items-center justify-center rounded-3xl border-4 border-dashed border-purple-300 bg-white transition hover:border-purple-500"
        >
          {hasImage ? (
            <>
              <img
                src={form.image}
                alt="Featured arrangement"
                className="max-h-full rounded-2xl"
              />

              <button
                type="button"
                onClick={removeImage}
                className="absolute right-2 top-2 rounded-full bg-white px-2 py-1 text-xs font-bold text-red-600 shadow"
              >
                Remove
              </button>
            </>
          ) : (
            <>
              {uploading ? (
                <BloomSpinner />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-20 text-purple-700"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                  />
                </svg>
              )}

              <p className="px-3 text-center text-2xl font-bold text-purple-600">
                {uploading
                  ? "Uploading image"
                  : "Click to upload arrangement"}
              </p>
            </>
          )}
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (file) {
              handleImageUpload(file);
            }
          }}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          className="flex w-full items-center justify-center rounded-xl bg-purple-600 px-4 py-4 text-lg text-white transition-all hover:bg-purple-700"
          onClick={() => router.push("/dashboard/setup/financials")}
        >
          Previous Step
        </button>

        <button
          type="submit"
          disabled={loading || uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 text-lg text-white transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Finish Setup

          {loading && <BloomSpinner size={30} />}
        </button>
      </div>
    </form>
  );
}