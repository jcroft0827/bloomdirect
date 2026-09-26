"use client";

import { Save, Undo2 } from "lucide-react";
import { useEffect } from "react";

import { useSettingsDirtyState } from "./SettingsDirtyState";

export default function SettingsUnsavedChangesBar() {
  const {
    dirtySections,
    hasUnsavedChanges,
    isSavingAny,
    saveAllDirtySections,
    discardAllDirtySections,
  } = useSettingsDirtyState();

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (!hasUnsavedChanges) {
    return null;
  }

  const labels = dirtySections.map((section) => section.label);
  const summary =
    labels.length === 1
      ? `${labels[0]} has unsaved changes.`
      : `${labels.length} sections have unsaved changes.`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="text-sm font-black text-gray-950">Unsaved changes</p>
          <p className="mt-0.5 truncate text-xs font-semibold text-gray-500 sm:text-sm">
            {summary}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={discardAllDirtySections}
            disabled={isSavingAny}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            <Undo2 size={16} />
            Discard
          </button>

          <button
            type="button"
            onClick={() => void saveAllDirtySections()}
            disabled={isSavingAny}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300 sm:flex-none"
          >
            <Save size={16} />
            {isSavingAny ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
