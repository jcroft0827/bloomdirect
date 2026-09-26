"use client";

import { CircleDollarSign, MapPinned, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  settingsValuesEqual,
  useSettingsSectionActions,
  useSettingsSectionDirty,
} from "./SettingsDirtyState";

type ZipZone = {
  name: string;
  zip: string;
  fee: number | string;
};

type DistanceZone = {
  min: number | string;
  max: number | string;
  fee: number | string;
};

type DeliveryAreaForm = {
  method: "zip" | "distance";
  zipZones: ZipZone[];
  distanceZones: DistanceZone[];
  fallbackFee: number | string;
  maxRadius: number | string;
};

type SharedDeliveryAreaProps = {
  initialShop: any;
};

function getInitialForm(shop: any): DeliveryAreaForm {
  return {
    method: shop?.delivery?.method === "distance" ? "distance" : "zip",

    zipZones: Array.isArray(shop?.delivery?.zipZones)
      ? shop.delivery.zipZones.map((zone: any) => ({
          name: zone?.name ?? "",
          zip: zone?.zip ?? "",
          fee: zone?.fee ?? "",
        }))
      : [],

    distanceZones: Array.isArray(shop?.delivery?.distanceZones)
      ? shop.delivery.distanceZones.map((zone: any) => ({
          min: zone?.min ?? 0,
          max: zone?.max ?? 0,
          fee: zone?.fee ?? "",
        }))
      : [],

    fallbackFee: shop?.delivery?.fallbackFee ?? 0,

    maxRadius: shop?.delivery?.maxRadius ?? 0,
  };
}

function parseMoney(value: number | string) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return null;
  }

  return Math.round(numberValue * 100) / 100;
}

function parseNumber(value: number | string) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return null;
  }

  return numberValue;
}

export default function SharedDeliveryArea({
  initialShop,
}: SharedDeliveryAreaProps) {
  const router = useRouter();

  const [form, setForm] = useState<DeliveryAreaForm>(() =>
    getInitialForm(initialShop),
  );

  const [savedForm, setSavedForm] = useState<DeliveryAreaForm>(() =>
    getInitialForm(initialShop),
  );

  const [isSaving, setIsSaving] = useState(false);

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const nextForm = getInitialForm(initialShop);
    setForm(nextForm);
    setSavedForm(nextForm);
  }, [initialShop]);

  useSettingsSectionDirty(
    {
      id: "shared-delivery-area",
      label: "Delivery Area",
      anchorId: "shared-delivery-area",
    },
    !settingsValuesEqual(form, savedForm),
  );

  const activeZones =
    form.method === "zip" ? form.zipZones : form.distanceZones;

  const canSave = useMemo(
    () => activeZones.length > 0 && !isSaving,
    [activeZones.length, isSaving],
  );

  function updateZipZone(index: number, field: keyof ZipZone, value: string) {
    setForm((current) => {
      const zipZones = current.zipZones.map((zone, zoneIndex) =>
        zoneIndex === index
          ? {
              ...zone,
              [field]: value,
            }
          : zone,
      );

      return {
        ...current,
        zipZones,
      };
    });
  }

  function updateDistanceZone(
    index: number,
    field: keyof DistanceZone,
    value: string,
  ) {
    setForm((current) => {
      const distanceZones = current.distanceZones.map((zone, zoneIndex) =>
        zoneIndex === index
          ? {
              ...zone,
              [field]: value,
            }
          : zone,
      );

      /*
       * Keep adjacent distance ranges connected.
       * If one zone ends at 10 miles, the next
       * begins at 10 miles.
       */
      if (field === "max" && index < distanceZones.length - 1) {
        distanceZones[index + 1] = {
          ...distanceZones[index + 1],
          min: value,
        };
      }

      return {
        ...current,
        distanceZones,
      };
    });
  }

  function addZone() {
    setForm((current) => {
      if (current.method === "zip") {
        return {
          ...current,

          zipZones: [
            ...current.zipZones,
            {
              name: "",
              zip: "",
              fee: "",
            },
          ],
        };
      }

      const lastZone = current.distanceZones[current.distanceZones.length - 1];

      return {
        ...current,

        distanceZones: [
          ...current.distanceZones,
          {
            min: lastZone?.max ?? 0,
            max: "",
            fee: "",
          },
        ],
      };
    });
  }

  function removeZone(index: number) {
    setForm((current) => {
      if (current.method === "zip") {
        return {
          ...current,

          zipZones: current.zipZones.filter(
            (_, zoneIndex) => zoneIndex !== index,
          ),
        };
      }

      const distanceZones = current.distanceZones.filter(
        (_, zoneIndex) => zoneIndex !== index,
      );

      /*
       * Heal the starting point of the
       * next range after deletion.
       */
      if (distanceZones.length > 0 && index < distanceZones.length) {
        distanceZones[index] = {
          ...distanceZones[index],

          min: index === 0 ? 0 : distanceZones[index - 1].max,
        };
      }

      return {
        ...current,
        distanceZones,
      };
    });

    toast.success(
      "Delivery zone removed. Save your changes to make it permanent.",
    );
  }

  function validate() {
    const nextErrors: string[] = [];

    if (form.method === "zip") {
      if (form.zipZones.length === 0) {
        nextErrors.push("Add at least one ZIP delivery zone.");
      }

      const names = new Set<string>();

      const zips = new Set<string>();

      form.zipZones.forEach((zone, index) => {
        const label = `ZIP zone ${index + 1}`;

        const name = zone.name.trim();

        const zip = zone.zip.trim();

        const fee = parseMoney(zone.fee);

        if (!name) {
          nextErrors.push(`${label} needs a name.`);
        }

        if (!/^\d{5}$/.test(zip)) {
          nextErrors.push(`${label} needs a valid 5-digit ZIP code.`);
        }

        if (fee === null) {
          nextErrors.push(`${label} needs a valid delivery fee.`);
        }

        const normalizedName = name.toLowerCase();

        if (name && names.has(normalizedName)) {
          nextErrors.push(`Delivery zone names must be unique.`);
        }

        if (name) {
          names.add(normalizedName);
        }

        if (zip && zips.has(zip)) {
          nextErrors.push(`Each ZIP code can only appear once.`);
        }

        if (zip) {
          zips.add(zip);
        }
      });
    } else {
      if (form.distanceZones.length === 0) {
        nextErrors.push("Add at least one distance delivery zone.");
      }

      form.distanceZones.forEach((zone, index) => {
        const label = `Distance zone ${index + 1}`;

        const min = parseNumber(zone.min);

        const max = parseNumber(zone.max);

        const fee = parseMoney(zone.fee);

        if (min === null || max === null) {
          nextErrors.push(
            `${label} needs valid minimum and maximum distances.`,
          );

          return;
        }

        if (max <= min) {
          nextErrors.push(
            `${label} maximum distance must be greater than its minimum distance.`,
          );
        }

        if (fee === null) {
          nextErrors.push(`${label} needs a valid delivery fee.`);
        }

        if (index > 0) {
          const previousMax = parseNumber(form.distanceZones[index - 1].max);

          if (previousMax !== null && min !== previousMax) {
            nextErrors.push(
              `Distance zones ${index} and ${index + 1} must connect without overlapping.`,
            );
          }
        }
      });

      const maxRadius = parseNumber(form.maxRadius);

      if (maxRadius === null || maxRadius <= 0) {
        nextErrors.push(
          "Maximum delivery radius must be greater than 0 miles.",
        );
      } else {
        const finalZone = form.distanceZones[form.distanceZones.length - 1];

        const finalMax = finalZone ? parseNumber(finalZone.max) : null;

        if (finalMax !== null && finalMax > maxRadius) {
          nextErrors.push(
            "Maximum delivery radius cannot be smaller than your farthest distance zone.",
          );
        }
      }
    }

    if (parseMoney(form.fallbackFee) === null) {
      nextErrors.push("Fallback delivery fee must be 0 or greater.");
    }

    setErrors(nextErrors);

    return nextErrors.length === 0;
  }

  async function handleSave() {
    if (isSaving || !validate()) {
      return;
    }

    setIsSaving(true);

    try {
      const zipZones = form.zipZones.map((zone) => ({
        name: zone.name.trim(),
        zip: zone.zip.trim(),
        fee: parseMoney(zone.fee) ?? 0,
      }));

      const distanceZones = form.distanceZones.map((zone) => ({
        min: parseNumber(zone.min) ?? 0,

        max: parseNumber(zone.max) ?? 0,

        fee: parseMoney(zone.fee) ?? 0,
      }));

      const res = await fetch("/api/shops/settings", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          section: "delivery",

          data: {
            method: form.method,

            zipZones,

            distanceZones,

            fallbackFee: parseMoney(form.fallbackFee) ?? 0,

            maxRadius: parseNumber(form.maxRadius) ?? 0,
          },
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Unable to save delivery area.");
      }

      const nextForm = getInitialForm(data.shop);
      setForm(nextForm);
      setSavedForm(nextForm);

      setErrors([]);

      toast.success("Delivery area saved.");

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save delivery area.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  useSettingsSectionActions("shared-delivery-area", {
    save: handleSave,
    discard: () => {
      setForm(savedForm);
      setErrors([]);
    },
    isSaving,
  });

  return (
    <section
      id="shared-delivery-area"
      className="scroll-mt-28 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-100 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
            <MapPinned size={21} />
          </div>

          <div>
            <h3 className="text-xl font-black tracking-tight text-gray-950">
              Delivery Area
            </h3>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Define where your shop can physically deliver. GetBloomDirect and
              BloomWebsites can apply their own ordering rules on top of this
              shared service area.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="rounded-2xl border border-purple-100 bg-purple-50/60 px-4 py-3 text-sm leading-6 text-purple-950">
          Changing this section affects delivery coverage for every Bloom
          product connected to your shop. Same-day rules and order minimums
          remain product-specific.
        </div>

        {/* DELIVERY METHOD */}
        <div className="mt-7">
          <p className="text-sm font-black text-gray-800">
            How do you define your delivery area?
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  method: "zip",
                }))
              }
              className={`rounded-2xl border p-4 text-left transition ${
                form.method === "zip"
                  ? "border-purple-300 bg-purple-50 ring-2 ring-purple-100"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="font-black text-gray-950">ZIP Codes</p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Set a delivery fee for each ZIP code your shop serves.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  method: "distance",
                }))
              }
              className={`rounded-2xl border p-4 text-left transition ${
                form.method === "distance"
                  ? "border-purple-300 bg-purple-50 ring-2 ring-purple-100"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="font-black text-gray-950">Distance</p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Charge based on how far the delivery is from your shop.
              </p>
            </button>
          </div>
        </div>

        {/* ZONES */}
        <div className="mt-8 rounded-3xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="font-black text-gray-950">
                {form.method === "zip"
                  ? "ZIP Delivery Zones"
                  : "Distance Delivery Zones"}
              </h4>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                {form.method === "zip"
                  ? "Add each ZIP code your shop is willing to deliver to."
                  : "Build consecutive mileage ranges from your shop location."}
              </p>
            </div>

            <button
              type="button"
              onClick={addZone}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm font-black text-purple-700 transition hover:bg-purple-50"
            >
              <Plus size={16} />
              Add Zone
            </button>
          </div>

          {activeZones.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center">
              <p className="font-black text-gray-800">No delivery zones yet.</p>

              <p className="mt-1 text-sm text-gray-500">
                Add at least one zone before saving.
              </p>
            </div>
          ) : null}

          {form.method === "zip" ? (
            <div className="mt-5 space-y-4">
              {form.zipZones.map((zone, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-black text-gray-950">
                      ZIP Zone {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeZone(index)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove ZIP zone ${index + 1}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[1.3fr_1fr_0.8fr]">
                    <label>
                      <span className="text-xs font-black uppercase tracking-[0.1em] text-gray-500">
                        Zone Name
                      </span>

                      <input
                        type="text"
                        value={zone.name}
                        onChange={(event) =>
                          updateZipZone(index, "name", event.target.value)
                        }
                        placeholder="Local Delivery"
                        className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
                      />
                    </label>

                    <label>
                      <span className="text-xs font-black uppercase tracking-[0.1em] text-gray-500">
                        ZIP Code
                      </span>

                      <input
                        type="text"
                        inputMode="numeric"
                        value={zone.zip}
                        onChange={(event) =>
                          updateZipZone(
                            index,
                            "zip",
                            event.target.value.replace(/\D/g, "").slice(0, 5),
                          )
                        }
                        maxLength={5}
                        placeholder="14036"
                        className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
                      />
                    </label>

                    <label>
                      <span className="text-xs font-black uppercase tracking-[0.1em] text-gray-500">
                        Fee
                      </span>

                      <div className="relative mt-2">
                        <CircleDollarSign
                          size={16}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={zone.fee}
                          onChange={(event) =>
                            updateZipZone(index, "fee", event.target.value)
                          }
                          className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
                        />
                      </div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {form.distanceZones.map((zone, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-black text-gray-950">
                      Distance Zone {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeZone(index)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove distance zone ${index + 1}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <label>
                      <span className="text-xs font-black uppercase tracking-[0.1em] text-gray-500">
                        From Miles
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={zone.min}
                        disabled={index > 0}
                        onChange={(event) =>
                          updateDistanceZone(index, "min", event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-950 outline-none transition disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
                      />
                    </label>

                    <label>
                      <span className="text-xs font-black uppercase tracking-[0.1em] text-gray-500">
                        To Miles
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={zone.max}
                        onChange={(event) =>
                          updateDistanceZone(index, "max", event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
                      />
                    </label>

                    <label>
                      <span className="text-xs font-black uppercase tracking-[0.1em] text-gray-500">
                        Fee
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={zone.fee}
                        onChange={(event) =>
                          updateDistanceZone(index, "fee", event.target.value)
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DELIVERY BOUNDARIES */}
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label>
            <span className="text-sm font-black text-gray-800">
              Fallback Delivery Fee
            </span>

            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">
                $
              </span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.fallbackFee}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    fallbackFee: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-8 pr-4 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
              />
            </div>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              Used to price an eligible delivery that falls between configured
              delivery ranges. It does not extend your service area.
            </p>
          </label>

          <label>
            <span className="text-sm font-black text-gray-800">
              Maximum Delivery Radius
            </span>

            <div className="relative mt-2">
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.maxRadius}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    maxRadius: event.target.value,
                  }))
                }
                className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 pr-14 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-[0.08em] text-gray-400">
                miles
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              This remains the hard outer boundary for distance-based delivery.
            </p>
          </label>
        </div>

        {errors.length > 0 ? (
          <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
            <p className="text-sm font-black text-red-900">
              Check your delivery area:
            </p>

            <ul className="mt-2 space-y-1 text-sm leading-5 text-red-800">
              {errors.map((error) => (
                <li key={error}>• {error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-gray-500">
            Product-specific settings such as same-day cutoff, minimum order,
            and temporary order pauses are configured separately.
          </p>

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
          >
            <Save size={17} />

            {isSaving ? "Saving..." : "Save Delivery Area"}
          </button>
        </div>
      </div>
    </section>
  );
}
