// src/components/websites/WebsitePreviewBar.tsx

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
} from "lucide-react";

type WebsitePreviewBarProps = {
  websiteId: string;
};

export default function WebsitePreviewBar({
  websiteId,
}: WebsitePreviewBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 shadow-[0_-10px_35px_rgba(0,0,0,0.10)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
            <Eye size={20} />
          </div>

          <div>
            <p className="text-sm font-black text-gray-950">
              BloomWebsite Preview
            </p>

            <p className="text-xs text-gray-500">
              This website is not live yet.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/websites"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 sm:flex-none"
          >
            <ArrowLeft size={17} />
            Back
          </Link>

          <Link
            href={`/dashboard/websites/launch?website=${websiteId}`}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-purple-800 sm:flex-none"
          >
            Go Live
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </div>
  );
}