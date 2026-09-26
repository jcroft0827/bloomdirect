"use client";

import {
  ExternalLink,
  Loader2,
  PauseCircle,
  PlayCircle,
  Rocket,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

type WebsiteStatus = "preview" | "live" | "paused";

type BloomWebsiteLaunchActionsProps = {
  websiteId: string;
  status: WebsiteStatus;
  readyToPublish: boolean;
  customDomain?: string;
};

type LaunchAction = "publish" | "pause" | "resume";

export default function BloomWebsiteLaunchActions({
  websiteId,
  status,
  readyToPublish,
  customDomain = "",
}: BloomWebsiteLaunchActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<LaunchAction | null>(null);

  async function runAction(action: LaunchAction) {
    if (pendingAction) {
      return;
    }

    if (
      action === "pause" &&
      !window.confirm(
        "Pause this BloomWebsite? Customers will no longer be able to access the live storefront until you resume it.",
      )
    ) {
      return;
    }

    setPendingAction(action);

    try {
      const response = await fetch("/api/websites/launch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websiteId,
          action,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error || "Unable to update the website launch status.",
        );
      }

      toast.success(
        action === "publish"
          ? "BloomWebsite published."
          : action === "pause"
            ? "BloomWebsite paused."
            : "BloomWebsite resumed.",
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update the website launch status.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  if (status === "live") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        {customDomain && (
          <a
            href={`https://${customDomain}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800"
          >
            View Live Website
            <ExternalLink size={17} />
          </a>
        )}

        <button
          type="button"
          onClick={() => void runAction("pause")}
          disabled={pendingAction !== null}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-black text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingAction === "pause" ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Pausing...
            </>
          ) : (
            <>
              <PauseCircle size={17} />
              Pause Website
            </>
          )}
        </button>
      </div>
    );
  }

  if (status === "paused") {
    return (
      <button
        type="button"
        onClick={() => void runAction("resume")}
        disabled={!readyToPublish || pendingAction !== null}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {pendingAction === "resume" ? (
          <>
            <Loader2 size={17} className="animate-spin" />
            Resuming...
          </>
        ) : (
          <>
            <PlayCircle size={17} />
            Resume Website
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void runAction("publish")}
      disabled={!readyToPublish || pendingAction !== null}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:bg-gray-300"
    >
      {pendingAction === "publish" ? (
        <>
          <Loader2 size={17} className="animate-spin" />
          Publishing...
        </>
      ) : (
        <>
          <Rocket size={17} />
          Publish Website
        </>
      )}
    </button>
  );
}
