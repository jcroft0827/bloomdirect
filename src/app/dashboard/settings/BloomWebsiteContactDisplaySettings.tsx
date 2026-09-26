"use client";

import { Eye, MapPin, Phone, Save, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  settingsValuesEqual,
  useSettingsSectionActions,
  useSettingsSectionDirty,
} from "./SettingsDirtyState";

type ContactDisplayForm = {
  showPhone: boolean;
  showAddress: boolean;
  showSocialLinks: boolean;
};

type BloomWebsiteContactDisplaySettingsProps = {
  initialWebsite: any;
};

function getInitialForm(website: any): ContactDisplayForm {
  return {
    showPhone: website?.settings?.showPhone ?? true,

    showAddress: website?.settings?.showAddress ?? true,

    showSocialLinks: website?.settings?.showSocialLinks ?? true,
  };
}

export default function BloomWebsiteContactDisplaySettings({
  initialWebsite,
}: BloomWebsiteContactDisplaySettingsProps) {
  const router = useRouter();

  const [form, setForm] = useState<ContactDisplayForm>(() =>
    getInitialForm(initialWebsite),
  );

  const [savedForm, setSavedForm] = useState<ContactDisplayForm>(() =>
    getInitialForm(initialWebsite),
  );

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const nextForm = getInitialForm(initialWebsite);
    setForm(nextForm);
    setSavedForm(nextForm);
  }, [initialWebsite]);

  useSettingsSectionDirty(
    {
      id: "website-contact-display",
      label: "Contact & Display",
      anchorId: "website-contact-display",
    },
    !settingsValuesEqual(form, savedForm),
  );

  function updateSetting(key: keyof ContactDisplayForm, value: boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSave() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/websites/settings", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          section: "contactDisplay",

          data: form,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to save contact and display settings.",
        );
      }

      const nextForm = getInitialForm(data.website);
      setForm(nextForm);
      setSavedForm(nextForm);

      toast.success("Contact and display settings saved.");

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save contact and display settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  useSettingsSectionActions("website-contact-display", {
    save: handleSave,
    discard: () => setForm(savedForm),
    isSaving,
  });

  const settings = [
    {
      key: "showPhone" as const,

      title: "Show Phone Number",

      description:
        "Let customers see and call your shop phone number throughout your BloomWebsite.",

      icon: Phone,
    },

    {
      key: "showAddress" as const,

      title: "Show Shop Location",

      description:
        "Display your shop address and location details on your BloomWebsite.",

      icon: MapPin,
    },

    {
      key: "showSocialLinks" as const,

      title: "Show Social Links",

      description:
        "Display available social media links such as Facebook and Instagram.",

      icon: Share2,
    },
  ];

  return (
    <section
      id="website-contact-display"
      className="scroll-mt-28 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-100 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
            <Eye size={21} />
          </div>

          <div>
            <h3 className="text-xl font-black tracking-tight text-gray-950">
              Contact & Display
            </h3>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Choose which shared shop details customers can see on your
              BloomWebsite.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
          <p className="text-sm font-black text-purple-950">
            These settings only control visibility.
          </p>

          <p className="mt-1 text-sm leading-6 text-purple-800">
            Turning something off here does not delete it from your shop account
            or change GetBloomDirect. It only hides that information from your
            BloomWebsite.
          </p>
        </div>

        <div className="mt-6 divide-y divide-gray-100 rounded-2xl border border-gray-200">
          {settings.map((setting) => {
            const Icon = setting.icon;

            return (
              <label
                key={setting.key}
                className="flex cursor-pointer items-start justify-between gap-5 p-4 first:rounded-t-2xl last:rounded-b-2xl sm:p-5"
              >
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-purple-700">
                    <Icon size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="font-black text-gray-950">{setting.title}</p>

                    <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                      {setting.description}
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={form[setting.key]}
                  onChange={(event) =>
                    updateSetting(setting.key, event.target.checked)
                  }
                  className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              </label>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
            Current storefront visibility
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <VisibilityBadge label="Phone" visible={form.showPhone} />

            <VisibilityBadge label="Location" visible={form.showAddress} />

            <VisibilityBadge
              label="Social Links"
              visible={form.showSocialLinks}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 sm:w-auto"
          >
            <Save size={17} />

            {isSaving ? "Saving..." : "Save Contact & Display"}
          </button>
        </div>
      </div>
    </section>
  );
}

function VisibilityBadge({
  label,
  visible,
}: {
  label: string;
  visible: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-black ${
        visible
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-gray-200 bg-white text-gray-500"
      }`}
    >
      {label}: {visible ? "Visible" : "Hidden"}
    </span>
  );
}
