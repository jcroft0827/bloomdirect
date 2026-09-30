"use client";

import { Facebook, Instagram, MapPin, Music2, type LucideIcon } from "lucide-react";

export type SharedSocialLinksValue = {
  facebook: string;
  instagram: string;
  pinterest: string;
  tiktok: string;
};

type Props = {
  value: SharedSocialLinksValue;
  disabled?: boolean;
  onChange: (field: keyof SharedSocialLinksValue, value: string) => void;
};

const SOCIAL_FIELDS: Array<{
  key: keyof SharedSocialLinksValue;
  label: string;
  placeholder: string;
  Icon: LucideIcon;
}> = [
  {
    key: "facebook",
    label: "Facebook",
    placeholder: "https://facebook.com/yourshop",
    Icon: Facebook,
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/yourshop",
    Icon: Instagram,
  },
  {
    key: "pinterest",
    label: "Pinterest",
    placeholder: "https://pinterest.com/yourshop",
    Icon: MapPin,
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/@yourshop",
    Icon: Music2,
  },
];

export default function SharedSocialLinksEditor({
  value,
  disabled = false,
  onChange,
}: Props) {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2">
      {SOCIAL_FIELDS.map(({ key, label, placeholder, Icon }) => (
        <label key={key} className="block text-left">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-800">
            <Icon size={17} />
            {label}
          </span>

          <input
            type="url"
            value={value[key] || ""}
            disabled={disabled}
            onChange={(event) => onChange(key, event.target.value)}
            placeholder={placeholder}
            className="mt-2 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-gray-100"
          />
        </label>
      ))}
    </div>
  );
}
