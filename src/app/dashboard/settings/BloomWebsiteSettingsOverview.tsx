// app/dashboard/settings/BloomWebsiteSettingsOverview.tsx

import { Store } from "lucide-react";
import BloomWebsiteOrderSettings from "./BloomWebsiteOrderSettings";
import BloomWebsiteAnnouncementSettings from "./BloomWebsiteAnnouncementSettings";
import BloomWebsiteContactDisplaySettings from "./BloomWebsiteContactDisplaySettings";
import BloomWebsitePickupSettings from "./BloomWebsitePickupSettings";
import BloomWebsiteTaxSettings from "./BloomWebsiteTaxSettings";
import BloomWebsitePaymentSettings from "./BloomWebsitePaymentSettings";
import BloomWebsiteProductDisplaySettings from "./BloomWebsiteProductDisplaySettings";

type BloomWebsiteSettingsOverviewProps = {
  initialWebsite: any;
};

export default function BloomWebsiteSettingsOverview({
  initialWebsite,
}: BloomWebsiteSettingsOverviewProps) {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-600">
          BloomWebsites
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
          Website settings
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
          These settings affect your BloomWebsite only. GetBloomDirect network
          ordering rules remain independent.
        </p>
      </div>

      <BloomWebsiteOrderSettings initialWebsite={initialWebsite} />

      <div className="mt-5">
        <BloomWebsiteProductDisplaySettings initialWebsite={initialWebsite} />
      </div>

      <div className="mt-5">
        <BloomWebsitePaymentSettings initialWebsite={initialWebsite} />
      </div>

      <div className="mt-5">
        <BloomWebsiteTaxSettings initialWebsite={initialWebsite} />
      </div>

      <div className="mt-5">
        <BloomWebsiteAnnouncementSettings initialWebsite={initialWebsite} />
      </div>

      <div className="mt-5">
        <BloomWebsiteContactDisplaySettings initialWebsite={initialWebsite} />
      </div>

      <div className="mt-5">
        <BloomWebsitePickupSettings initialWebsite={initialWebsite} />
      </div>
    </div>
  );
}
