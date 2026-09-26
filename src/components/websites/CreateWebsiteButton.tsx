"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateWebsiteButton() {
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreateWebsite() {
    if (isCreating) {
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const response = await fetch("/api/websites", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to create your BloomWebsite.",
        );
      }

      /*
       * Refresh the current server component.
       *
       * /dashboard/websites will now find the newly
       * created BloomWebsite and automatically switch
       * from the discovery screen to the website
       * management state.
       */
      router.refresh();
    } catch (error) {
      console.error(
        "Failed to create BloomWebsite:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to create your BloomWebsite.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCreateWebsite}
        disabled={isCreating}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-6 py-4 text-base font-black text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCreating ? (
          <>
            <Loader2
              size={19}
              className="animate-spin"
            />
            Creating Your Website...
          </>
        ) : (
          <>
            Create My Website
            <ArrowRight size={19} />
          </>
        )}
      </button>

      <p className="mt-3 text-sm text-gray-500">
        No subscription required to create your preview.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 max-w-xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {error}
        </div>
      )}
    </div>
  );
}