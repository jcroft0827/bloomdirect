"use client";

import { ExternalLink, Monitor, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type PreviewMode = "desktop" | "mobile";

type Props = {
  previewSlug: string;
  siteName: string;
  logo: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  heroImage: string;
};

const VIEWPORTS: Record<
  PreviewMode,
  {
    width: number;
    height: number;
  }
> = {
  desktop: {
    width: 1280,
    height: 900,
  },
  mobile: {
    width: 390,
    height: 844,
  },
};

function buildPreviewUrl({
  previewSlug,
  siteName,
  logo,
  tagline,
  primaryColor,
  accentColor,
  heroImage,
}: Props) {
  const params = new URLSearchParams();

  params.set("builder", "1");
  params.set("embedded", "1");
  params.set("siteName", siteName);
  params.set("logo", logo);
  params.set("tagline", tagline);
  params.set("primaryColor", primaryColor);
  params.set("accentColor", accentColor);
  params.set("heroImage", heroImage);

  return `/websites/preview/${encodeURIComponent(previewSlug)}?${params.toString()}`;
}

export default function BloomWebsiteLiveStorefrontViewer(props: Props) {
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const [previewUrl, setPreviewUrl] = useState(() => buildPreviewUrl(props));
  const [availableWidth, setAvailableWidth] = useState(0);
  const measureRef = useRef<HTMLDivElement | null>(null);

  const nextPreviewUrl = useMemo(
    () => buildPreviewUrl(props),
    [
      props.previewSlug,
      props.siteName,
      props.logo,
      props.tagline,
      props.primaryColor,
      props.accentColor,
      props.heroImage,
    ],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreviewUrl(nextPreviewUrl);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [nextPreviewUrl]);

  useEffect(() => {
    const node = measureRef.current;

    if (!node) {
      return;
    }

    function measure() {
      const currentNode = measureRef.current;

      if (!currentNode) {
        return;
      }

      setAvailableWidth(currentNode.clientWidth);
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const viewport = VIEWPORTS[mode];
  const scale = availableWidth
    ? Math.min(1, availableWidth / viewport.width)
    : mode === "desktop"
      ? 0.45
      : 1;

  const displayedWidth = viewport.width * scale;
  const displayedHeight = viewport.height * scale;

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg">
      <div className="border-b border-gray-200 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-gray-950">Live Storefront</p>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              This is your real storefront. Unsaved branding changes appear here
              automatically.
            </p>
          </div>

          <Link
            href={`/websites/preview/${encodeURIComponent(props.previewSlug)}`}
            target="_blank"
            className="inline-flex w-fit items-center gap-2 text-xs font-black text-purple-700 transition hover:text-purple-900"
          >
            Open full preview
            <ExternalLink size={14} />
          </Link>
        </div>

        <div className="mt-4 inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setMode("desktop")}
            aria-pressed={mode === "desktop"}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black transition ${
              mode === "desktop"
                ? "bg-white text-gray-950 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Monitor size={15} />
            Desktop
          </button>

          <button
            type="button"
            onClick={() => setMode("mobile")}
            aria-pressed={mode === "mobile"}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black transition ${
              mode === "mobile"
                ? "bg-white text-gray-950 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Smartphone size={15} />
            Mobile
          </button>
        </div>
      </div>

      <div className="bg-gray-100 p-3 sm:p-4">
        <div ref={measureRef} className="w-full overflow-hidden">
          <div
            className="relative mx-auto overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm"
            style={{
              width: displayedWidth || "100%",
              height: displayedHeight,
            }}
          >
            <iframe
              title={`${mode === "desktop" ? "Desktop" : "Mobile"} storefront preview`}
              src={previewUrl}
              className="absolute left-0 top-0 border-0 bg-white"
              style={{
                width: viewport.width,
                height: viewport.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] leading-5 text-gray-500">
          Preview viewport: {viewport.width} × {viewport.height}. Use the full
          preview for checkout and navigation testing.
        </p>
      </div>
    </section>
  );
}
