"use client";

import { Building2, Globe2, Network } from "lucide-react";

export type SettingsArea = "shared" | "getbloomdirect" | "bloomwebsites";

type SettingsAreaNavigationProps = {
  activeArea: SettingsArea;
  onChange: (area: SettingsArea) => void;
};

const areas: {
  id: SettingsArea;
  label: string;
  description: string;
  icon: typeof Building2;
}[] = [
  {
    id: "shared",
    label: "Shared",
    description: "Settings used across your Bloom products.",
    icon: Building2,
  },
  {
    id: "getbloomdirect",
    label: "GetBloomDirect",
    description: "Florist-to-florist network settings.",
    icon: Network,
  },
  {
    id: "bloomwebsites",
    label: "BloomWebsites",
    description: "Your customer-facing website settings.",
    icon: Globe2,
  },
];

export default function SettingsAreaNavigation({
  activeArea,
  onChange,
}: SettingsAreaNavigationProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {areas.map((area) => {
        const Icon = area.icon;

        const isActive = activeArea === area.id;

        return (
          <button
            key={area.id}
            type="button"
            onClick={() => onChange(area.id)}
            className={`group rounded-2xl border p-4 text-left transition sm:p-5 ${
              isActive
                ? "border-purple-300 bg-purple-50 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                  isActive
                    ? "bg-purple-600 text-white"
                    : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                }`}
              >
                <Icon size={20} />
              </div>

              <div className="min-w-0">
                <p
                  className={`font-black ${
                    isActive ? "text-purple-950" : "text-gray-950"
                  }`}
                >
                  {area.label}
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                  {area.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
