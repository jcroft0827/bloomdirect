"use client";

import { Printer } from "lucide-react";

export default function BloomWebsiteReportPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-purple-800 focus:outline-none focus:ring-4 focus:ring-purple-100"
    >
      <Printer size={17} />
      Print / Save PDF
    </button>
  );
}
