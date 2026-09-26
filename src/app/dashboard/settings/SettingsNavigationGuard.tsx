"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useSettingsDirtyState } from "./SettingsDirtyState";

export default function SettingsNavigationGuard() {
  const router = useRouter();
  const { hasUnsavedChanges, discardAllDirtySections } =
    useSettingsDirtyState();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setPendingHref(null);
      return;
    }

    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");
      if (!anchor) {
        return;
      }

      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("rel")?.includes("external")
      ) {
        return;
      }

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) {
        return;
      }

      let destination: URL;

      try {
        destination = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (destination.origin !== window.location.origin) {
        return;
      }

      const current = new URL(window.location.href);

      // Allow in-page settings anchors and query/hash-only changes on the same route.
      if (
        destination.pathname === current.pathname &&
        destination.search === current.search
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      setPendingHref(
        `${destination.pathname}${destination.search}${destination.hash}`,
      );
    }

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [hasUnsavedChanges]);

  function discardAndContinue() {
    if (!pendingHref) {
      return;
    }

    const href = pendingHref;
    discardAllDirtySections();
    setPendingHref(null);
    router.push(href);
  }

  if (!pendingHref) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-950/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-navigation-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl sm:p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <AlertTriangle size={23} />
        </div>

        <h2
          id="unsaved-navigation-title"
          className="mt-5 text-xl font-black tracking-tight text-gray-950"
        >
          You have unsaved changes.
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Save your changes before leaving Settings, or discard them to
          continue to the page you selected.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setPendingHref(null)}
            className="min-h-11 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50"
          >
            Keep editing
          </button>

          <button
            type="button"
            onClick={discardAndContinue}
            className="min-h-11 rounded-full bg-gray-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-gray-800"
          >
            Discard & leave
          </button>
        </div>
      </div>
    </div>
  );
}
