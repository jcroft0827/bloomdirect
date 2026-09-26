import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import TfposIntegrationSettings from "@/components/websites/pos/TfposIntegrationSettings";

export default function TfposIntegrationPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/dashboard/websites"
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-purple-700"
      >
        <ArrowLeft size={16} />
        BloomWebsites
      </Link>

      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-purple-600">
          BloomWebsites Integration
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
          The Floral POS
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Configure the secure order handoff used to place paid BloomWebsite orders into The Floral POS.
        </p>
      </div>

      <TfposIntegrationSettings />
    </div>
  );
}
