"use client";

import { Clock3, Loader2 } from "lucide-react";

import { useEffect, useState } from "react";

type BloomWebsiteSameDayCountdownProps = {
  previewSlug: string;
};

type SameDayResponse = {
  available: boolean;

  reason: string | null;

  showMessage: boolean;

  message?: string;

  timezone: string;

  cutoffLabel: string | null;

  remainingSeconds: number;
};

function formatRemainingTime(seconds: number) {
  if (seconds <= 60) {
    return "less than 1 minute";
  }

  const totalMinutes = Math.ceil(seconds / 60);

  const hours = Math.floor(totalMinutes / 60);

  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }

  if (minutes === 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return `${hours} ${hours === 1 ? "hour" : "hours"} ${minutes} ${
    minutes === 1 ? "minute" : "minutes"
  }`;
}

export default function BloomWebsiteSameDayCountdown({
  previewSlug,
}: BloomWebsiteSameDayCountdownProps) {
  const [status, setStatus] = useState<SameDayResponse | null>(null);

  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const response = await fetch(
          `/api/websites/storefront/${encodeURIComponent(
            previewSlug,
          )}/same-day`,
          {
            method: "GET",

            cache: "no-store",
          },
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as SameDayResponse;

        if (cancelled) {
          return;
        }

        setStatus(data);

        setRemainingSeconds(Math.max(0, Number(data.remainingSeconds) || 0));
      } catch (error) {
        console.error("Unable to load BloomWebsite same-day status:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [previewSlug]);

  /*
   * The server supplies the authoritative remaining duration.
   * The browser only counts that duration down.
   *
   * We update every second internally so the cutoff transition
   * is accurate, while the visible copy remains pleasantly
   * minute-based instead of showing a noisy stopwatch.
   */
  useEffect(() => {
    if (!status?.available || remainingSeconds <= 0) {
      return;
    }

    const startedAt = Date.now();

    const startedWith = remainingSeconds;

    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);

      const next = Math.max(0, startedWith - elapsedSeconds);

      setRemainingSeconds(next);

      if (next <= 0) {
        window.clearInterval(timer);

        setStatus((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,

            available: false,

            reason: "SAME_DAY_CUTOFF_PASSED",

            showMessage: true,

            message:
              "Same-day ordering has closed for today. Please choose a future delivery date.",

            remainingSeconds: 0,
          };
        });
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [status?.available]);

  /*
   * A failed convenience-status request should never block
   * checkout. The actual Delivery POST remains authoritative.
   */
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3 text-xs font-semibold text-gray-400 shadow-sm">
        <Loader2 size={15} className="animate-spin" />
        Checking same-day availability...
      </div>
    );
  }

  if (!status || !status.showMessage) {
    return null;
  }

  if (status.available && remainingSeconds > 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
            <Clock3 size={19} />
          </div>

          <div className="min-w-0">
            <p className="font-black text-emerald-950">
              Same-day delivery is available
            </p>

            <p className="mt-1 text-sm leading-6 text-emerald-800">
              Order within{" "}
              <span className="font-black">
                {formatRemainingTime(remainingSeconds)}
              </span>{" "}
              for delivery today.
            </p>

            {status.cutoffLabel && (
              <p className="mt-1 text-xs font-semibold text-emerald-700/80">
                Same-day cutoff: {status.cutoffLabel}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-amber-700 shadow-sm">
          <Clock3 size={19} />
        </div>

        <div>
          <p className="font-black text-amber-950">Same-day delivery</p>

          <p className="mt-1 text-sm leading-6 text-amber-800">
            {status.message ||
              "Same-day delivery is unavailable today. Please choose a future delivery date."}
          </p>
        </div>
      </div>
    </div>
  );
}
