import { KeyRound } from "lucide-react";

import SharedBusinessInformation from "./SharedBusinessInformation";
import SharedDeliveryArea from "./SharedDeliveryArea";

type SharedSettingsOverviewProps = {
  initialShop: any;
};

export default function SharedSettingsOverview({
  initialShop,
}: SharedSettingsOverviewProps) {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-600">
          Shared settings
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
          Your shop
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
          These settings are shared by the Bloom products your shop uses. Change
          them once and the appropriate products stay in sync.
        </p>
      </div>

      <div className="space-y-5">
        <SharedBusinessInformation initialShop={initialShop} />

        <SharedDeliveryArea initialShop={initialShop} />

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
            <KeyRound size={21} />
          </div>

          <h3 className="mt-5 text-lg font-black text-gray-950">
            Account & Security
          </h3>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Manage account credentials and security settings for your shop.
          </p>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.12em] text-gray-400">
            Coming later
          </p>
        </div>
      </div>
    </div>
  );
}
