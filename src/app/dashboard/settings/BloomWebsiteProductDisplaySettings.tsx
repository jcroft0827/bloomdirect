"use client";

import { MessageSquareText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  settingsValuesEqual,
  useSettingsSectionActions,
  useSettingsSectionDirty,
} from "./SettingsDirtyState";

type ProductDisplayForm = {
  arrangementContainerNote: string;
};

type Props = {
  initialWebsite: any;
};

function getInitialForm(website: any): ProductDisplayForm {
  return {
    arrangementContainerNote:
      website?.settings?.arrangementContainerNote || "",
  };
}

export default function BloomWebsiteProductDisplaySettings({
  initialWebsite,
}: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ProductDisplayForm>(() =>
    getInitialForm(initialWebsite),
  );
  const [savedForm, setSavedForm] = useState<ProductDisplayForm>(() =>
    getInitialForm(initialWebsite),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const next = getInitialForm(initialWebsite);
    setForm(next);
    setSavedForm(next);
  }, [initialWebsite]);

  useSettingsSectionDirty(
    {
      id: "website-product-display",
      label: "Product Display",
      anchorId: "website-product-display",
    },
    !settingsValuesEqual(form, savedForm),
  );

  async function handleSave() {
    if (isSaving) return;

    setIsSaving(true);

    try {
      const response = await fetch("/api/websites/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "productDisplay",
          data: form,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to save product display settings.");
      }

      const next = getInitialForm(data.website);
      setForm(next);
      setSavedForm(next);
      toast.success("Product display settings saved.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save product display settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  useSettingsSectionActions("website-product-display", {
    save: handleSave,
    discard: () => setForm(savedForm),
    isSaving,
  });

  return (
    <section
      id="website-product-display"
      className="scroll-mt-28 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-100 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
            <MessageSquareText size={21} />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-gray-950">
              Product Display
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Set wording that can appear on product pages when flower varieties or containers may reasonably vary.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <label
          htmlFor="arrangementContainerNote"
          className="text-sm font-black text-gray-900"
        >
          Arrangement &amp; container note
        </label>
        <textarea
          id="arrangementContainerNote"
          value={form.arrangementContainerNote}
          onChange={(event) =>
            setForm({ arrangementContainerNote: event.target.value })
          }
          maxLength={1000}
          rows={4}
          placeholder="Flower varieties and container may vary based on availability."
          className="mt-2 w-full resize-y rounded-2xl border border-gray-300 px-4 py-3 text-gray-950 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
        />
        <div className="mt-2 flex justify-between gap-4 text-xs leading-5 text-gray-500">
          <span>
            Optional shop-wide default. Each product can use this wording, replace it with custom wording, or suppress it entirely.
          </span>
          <span className="shrink-0 text-gray-400">
            {form.arrangementContainerNote.length}/1000
          </span>
        </div>

        <div className="mt-5 rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
          <p className="text-sm font-black text-purple-950">Keep it accurate and customer-friendly.</p>
          <p className="mt-1 text-sm leading-6 text-purple-800">
            This note explains reasonable design or container variation. It does not replace your responsibility to offer a product that reasonably matches the selected image and product description.
          </p>
        </div>
      </div>
    </section>
  );
}
