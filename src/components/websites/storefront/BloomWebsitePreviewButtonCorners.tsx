"use client";

import { useEffect } from "react";
import type { BloomWebsiteButtonCorners } from "@/types/bloom-website";

/**
 * Apply editor-only button corner overrides after the preview document has
 * hydrated. Never mutate React-owned DOM from the parent iframe on load:
 * doing so races hydration and produces a server/client attribute mismatch.
 */
export default function BloomWebsitePreviewButtonCorners() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("builder") !== "1") return;

    const corners = params.get("buttonCorners");
    if (corners !== "subtle" && corners !== "rounded" && corners !== "pill") {
      return;
    }

    const root = document.querySelector<HTMLElement>("[data-bloom-button-corners]");
    if (root) {
      root.dataset.bloomButtonCorners = corners satisfies BloomWebsiteButtonCorners;
    }
  }, []);

  return null;
}
