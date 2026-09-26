"use client";

import { CalendarClock, Megaphone, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import {
  settingsValuesEqual,
  useSettingsSectionActions,
  useSettingsSectionDirty,
} from "./SettingsDirtyState";

type AnnouncementForm = {
  enabled: boolean;
  message: string;
  scheduleEnabled: boolean;
  startsAtDate: string;
  startsAtTime: string;
  endsAtDate: string;
  endsAtTime: string;
};

type Props = {
  initialWebsite: any;
};

function getInitialForm(website: any): AnnouncementForm {
  return {
    enabled: website?.announcement?.enabled === true,

    message: website?.announcement?.message || "",

    scheduleEnabled: website?.announcement?.scheduleEnabled === true,

    startsAtDate: website?.announcement?.startsAtDate || "",

    startsAtTime: website?.announcement?.startsAtTime || "",

    endsAtDate: website?.announcement?.endsAtDate || "",

    endsAtTime: website?.announcement?.endsAtTime || "",
  };
}

export default function BloomWebsiteAnnouncementSettings({
  initialWebsite,
}: Props) {
  const router = useRouter();

  const [form, setForm] = useState<AnnouncementForm>(() =>
    getInitialForm(initialWebsite),
  );

  const [savedForm, setSavedForm] = useState<AnnouncementForm>(() =>
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
      id: "website-announcement",
      label: "Announcement",
      anchorId: "website-announcement",
    },
    !settingsValuesEqual(form, savedForm),
  );

  async function handleSave() {
    if (isSaving) {
      return;
    }

    if (form.enabled && !form.message.trim()) {
      toast.error("Enter an announcement message.");

      return;
    }

    if (form.message.trim().length > 220) {
      toast.error("Announcement must be 220 characters or fewer.");

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
          section: "announcement",

          data: form,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Unable to save announcement settings.");
      }

      const nextForm = getInitialForm(data.website);
      setForm(nextForm);
      setSavedForm(nextForm);

      toast.success("Announcement settings saved.");

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save announcement settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  useSettingsSectionActions("website-announcement", {
    save: handleSave,
    discard: () => setForm(savedForm),
    isSaving,
  });

  return (
    <section
      id="website-announcement"
      className="scroll-mt-28 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-100 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
            <Megaphone size={21} />
          </div>

          <div>
            <h3 className="text-xl font-black tracking-tight text-gray-950">
              Announcement Bar
            </h3>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Show a short promotional or informational message above your
              storefront.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
          <div>
            <p className="font-black text-gray-950">Show Announcement Bar</p>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Display the announcement at the very top of your BloomWebsite.
            </p>
          </div>

          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                enabled: event.target.checked,
              }))
            }
            className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
        </label>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-black text-gray-800">Message</label>

            <span className="text-xs font-bold text-gray-400">
              {form.message.length}/220
            </span>
          </div>

          <textarea
            value={form.message}
            maxLength={220}
            rows={3}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                message: event.target.value,
              }))
            }
            placeholder="Fresh peonies have arrived — available while supplies last!"
            className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold leading-6 text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
          />
        </div>

        {/* PREVIEW */}
        <div className="mt-6">
          <p className="text-sm font-black text-gray-800">Preview</p>

          <div
            className="mt-2 rounded-2xl px-4 py-3 text-center text-xs font-bold sm:text-sm"
            style={{
              backgroundColor:
                initialWebsite?.branding?.primaryColor || "#654783",

              color: "#ffffff",
            }}
          >
            {form.message.trim() || "Your announcement will appear here."}
          </div>

          <p className="mt-2 text-xs leading-5 text-gray-500">
            The live storefront uses your normalized brand color and accessible
            text contrast.
          </p>
        </div>

        {/* SCHEDULE */}
        <div className="mt-8 border-t border-gray-100 pt-7">
          <label className="flex cursor-pointer items-start justify-between gap-5">
            <div className="flex gap-3">
              <CalendarClock
                size={19}
                className="mt-0.5 shrink-0 text-purple-700"
              />

              <div>
                <p className="font-black text-gray-950">
                  Schedule Announcement
                </p>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Automatically show or hide this message at specific times.
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={form.scheduleEnabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,

                  scheduleEnabled: event.target.checked,
                }))
              }
              className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
          </label>

          {form.scheduleEnabled && (
            <>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                  <p className="text-sm font-black text-gray-950">Starts</p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Leave blank if the announcement should begin immediately.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input
                      type="date"
                      value={form.startsAtDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,

                          startsAtDate: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-950 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
                    />

                    <input
                      type="time"
                      value={form.startsAtTime}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,

                          startsAtTime: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-950 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                  <p className="text-sm font-black text-gray-950">Ends</p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Leave blank if it should remain active until you turn it
                    off.
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input
                      type="date"
                      value={form.endsAtDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,

                          endsAtDate: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-950 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
                    />

                    <input
                      type="time"
                      value={form.endsAtTime}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,

                          endsAtTime: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-950 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
                    />
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-gray-500">
                Times are interpreted in your florist&apos;s configured
                timezone.
              </p>
            </>
          )}
        </div>

        <div className="mt-8 flex justify-end border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 sm:w-auto"
          >
            <Save size={17} />

            {isSaving ? "Saving..." : "Save Announcement"}
          </button>
        </div>
      </div>
    </section>
  );
}
