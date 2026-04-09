"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BloomSpinner from "@/components/BloomSpinner";

export default function FeaturedBouquetSetup() {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    image: "",
  });
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load shop info
  useEffect(() => {
    async function loadShop() {
      try {
        const res = await fetch("/api/shops/me");
        const data = await res.json();

        setBusinessName(data.shop.businessName);

        const cfBase = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
        const bouquetImageUrl = `${cfBase}/${data.shop.featuredBouquet?.image}`;

        console.log(bouquetImageUrl);

        setForm({
          ...form,
          name: data.shop.featuredBouquet?.name || "",
          price: data.shop.featuredBouquet?.price || "",
          description: data.shop.featuredBouquet?.description || "",
          image: bouquetImageUrl || "",
        });
      } catch (err) {
        console.error("Failed to load shop data", err);
      }
    }
    loadShop();
  }, []);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Image Handling
  const bouquetInputRef = useRef<HTMLInputElement | null>(null);
  // This can be implemented later, if needed
  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setForm((prev) => ({ ...prev, image: "" }));
  };
  // Upload Featured Bouquet
  const handleBouquetUpload = async (file: File) => {
    try {
      setUploading(true);

      // 1️⃣ Request signed upload URL from backend
      const uploadRes = await fetch("/api/s3/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, fileKey } = await uploadRes.json();

      // 2️⃣ Upload the file directly to S3
      const s3Upload = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!s3Upload.ok) {
        throw new Error("Failed to upload file to S3");
      }

      // 3️⃣ Extract fileKey from fileUrl
      // const fileKey = fileUrl.split(".amazonaws.com/")[1];

      // 4️⃣ Save fileKey to database
      await fetch("/api/shops/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: fileKey }),
      });

      // if (!saveRes.ok) {throw new Error("Failed to save logo to database");}

      const cfBase = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
      const cloudFrontUrl = `${cfBase}/${fileKey}`;

      setForm((prev) => (prev ? { ...prev, image: cloudFrontUrl } : prev));

      console.log("Upload Complete. CloudFront URL: ", cloudFrontUrl);
    } catch (err) {
      setUploading(false);
      console.error("Logo upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  // Format Fees
  const roundToHundredth = (num: number) => {
    // 1. Perform the rounding math first
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;

    // 2. Convert to string with exactly two decimal places
    return rounded.toFixed(2);
  };

  const handleFeeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);

    // If it's not a number (empty string), don't do anything
    if (isNaN(numValue)) return;

    const roundedValue = roundToHundredth(numValue);

    setForm((prev) => ({
      ...prev,
      [name]: roundedValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/setup/featured-bouquet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        router.refresh();
        router.push("/dashboard");
      } else {
        const data = await res.json();

        setError(data.error || "An unexpected error occurred.");
        setLoading(false);
        console.error("Failed to save business info", data);
      }
    } catch (error) {
      setLoading(false);
      setError("Failed to connect to the server.");
      console.error("Save error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header */}
      <h2 className="text-xl font-semibold">
        <span className="text-emerald-700">{businessName}</span> Featured
        Bouquet
      </h2>
      {/* Bouquet Name + Price */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="name"
            className="text-xs uppercase text-gray-500 ml-1"
          >
            Bouquet Name
          </label>
          <input
            id="name"
            name="name"
            placeholder="Roses, Lillie, etc."
            value={form.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg capitalize focus:ring-2 ring-purple-600 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="price"
            className="text-xs uppercase text-gray-500 ml-1"
          >
            Bouquet Price ($)
          </label>
          <input
            type="number"
            id="price"
            name="price"
            value={form.price}
            placeholder="$10.50"
            onChange={handleChange}
            onBlur={handleFeeBlur}
            step="0.01"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-purple-600 focus:outline-none"
          />
        </div>
      </div>
      {/* Bouquet Description */}
      <div>
        <label
          htmlFor="description"
          className="text-xs uppercase text-gray-500 ml-1"
        >
          Bouquet Description
        </label>
        <textarea
          id="description"
          name="description"
          placeholder="12 Roses..."
          value={form.description}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-lg capitalize focus:ring-2 ring-purple-600 focus:outline-none"
        />
      </div>
      {/* Bouquet Image */}
      <div className="flex flex-col w-52 items-center gap-1">
        <label className="text-xs uppercase text-gray-500 ml-1">
          Featured Bouquet Photo
        </label>
        <div
          onClick={() => bouquetInputRef.current?.click()}
          className="border-4 border-dashed border-purple-300 rounded-3xl h-52 w-52 flex flex-col items-center justify-center bg-white cursor-pointer hover:border-purple-500 transition"
        >
          {form.image &&
          form.image != "https://d8vlymdwili9i.cloudfront.net/undefined" ? (
            <img
              src={form.image}
              alt="Bouquet"
              className="max-h-full rounded-2xl"
            />
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
              <p className="text-2xl font-bold text-center text-purple-600">
                {uploading ? "Uploading bouquet" : "Click to upload bouquet"}
              </p>
            </>
          )}
        </div>
        <input
          ref={bouquetInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleBouquetUpload(file);
            }
          }}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          className="bg-purple-600 text-white text-lg px-4 py-4 rounded-xl transition-all flex justify-center items-center hover:bg-purple-700 w-full"
          onClick={() => {
            router.push("/dashboard/setup/financials");
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Previous Step
        </button>

        <button className="bg-emerald-600 text-white text-lg px-4 py-4 rounded-xl transition-all flex justify-center items-center gap-2 hover:bg-emerald-700 w-full">
          Finish Setup
          <span className={loading ? "block" : "hidden"}>
            <BloomSpinner size={30} />
          </span>
        </button>
      </div>
    </form>
  );
}
