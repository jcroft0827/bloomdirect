"use client";

export default function BloomWebsiteOrderPrintButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 print:hidden">Print order</button>;
}
