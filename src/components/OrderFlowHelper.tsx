"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp, X, HelpCircle } from "lucide-react";

const STORAGE_KEY = "hideOrderFlowHelper";
const STORAGE_EVENT = "order-flow-helper-storage-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSnapshot() {
  return false;
}

function notifyStorageChanged() {
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export default function OrderFlowHelper() {
  const [isOpen, setIsOpen] = useState(false);

  const isHidden = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    notifyStorageChanged();
  };

  const restore = () => {
    localStorage.removeItem(STORAGE_KEY);
    notifyStorageChanged();
    setIsOpen(true);
  };

  if (isHidden) {
    return (
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={restore}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
        >
          <HelpCircle className="h-4 w-4" />
          Order flow
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-3 text-left"
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="text-lg font-black">📦 How orders work</span>

          {isOpen ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </button>

        <button
          type="button"
          onClick={dismiss}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Dismiss order flow helper"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-4 text-gray-700">
          <div className="flex flex-wrap items-center gap-2 text-base font-bold">
            <span className="rounded-lg bg-white px-3 py-2 shadow-sm">
              Sent
            </span>
            <span>→</span>
            <span className="rounded-lg bg-white px-3 py-2 shadow-sm">
              Accepted
            </span>
            <span>→</span>
            <span className="rounded-lg bg-white px-3 py-2 shadow-sm">
              Paid
            </span>
            <span>→</span>
            <span className="rounded-lg bg-white px-3 py-2 shadow-sm">
              Delivered
            </span>
          </div>

          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>The fulfilling shop accepts or declines the order</li>
            <li>The originating shop marks the order as paid</li>
            <li>The fulfilling shop marks it as delivered</li>
          </ul>
        </div>
      )}
    </div>
  );
}