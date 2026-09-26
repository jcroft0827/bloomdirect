"use client";

import { Building2, Globe2, MapPin, Phone, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  settingsValuesEqual,
  useSettingsSectionActions,
  useSettingsSectionDirty,
} from "./SettingsDirtyState";

type SharedBusinessInformationProps = {
  initialShop: any;
};

type BusinessForm = {
  businessName: string;
  slug: string;
  contact: {
    phone: string;
    website: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    timezone: string;
  };
};

const COUNTRIES = [
  {
    value: "US",
    label: "United States",
  },
  {
    value: "CA",
    label: "Canada",
  },
];

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length < 7) {
    return digits;
  }

  if (digits.length < 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function getInitialForm(shop: any): BusinessForm {
  return {
    businessName: shop?.businessName ?? "",

    slug: shop?.slug ?? "",

    contact: {
      phone: shop?.contact?.phone ?? "",

      website: shop?.contact?.website ?? "",
    },

    address: {
      street: shop?.address?.street ?? "",

      city: shop?.address?.city ?? "",

      state: shop?.address?.state ?? "",

      zip: shop?.address?.zip ?? "",

      country: shop?.address?.country || "US",

      timezone: shop?.address?.timezone || "America/New_York",
    },
  };
}

export default function SharedBusinessInformation({
  initialShop,
}: SharedBusinessInformationProps) {
  const router = useRouter();

  const [form, setForm] = useState<BusinessForm>(() =>
    getInitialForm(initialShop),
  );

  const [savedForm, setSavedForm] = useState<BusinessForm>(() =>
    getInitialForm(initialShop),
  );

  const [isSaving, setIsSaving] = useState(false);

  /*
   * Keep this form synchronized if the server component
   * refreshes after a successful save.
   */
  useEffect(() => {
    const nextForm = getInitialForm(initialShop);
    setForm(nextForm);
    setSavedForm(nextForm);
  }, [initialShop]);

  useSettingsSectionDirty(
    {
      id: "shared-business-information",
      label: "Business Information",
      anchorId: "shared-business-information",
    },
    !settingsValuesEqual(form, savedForm),
  );

  const hasRequiredFields = useMemo(() => {
    return Boolean(
      form.businessName.trim() &&
      form.contact.phone.trim() &&
      form.address.street.trim() &&
      form.address.city.trim() &&
      form.address.state.trim() &&
      form.address.zip.trim(),
    );
  }, [form]);

  function updateContact(field: keyof BusinessForm["contact"], value: string) {
    setForm((current) => ({
      ...current,

      contact: {
        ...current.contact,

        [field]: value,
      },
    }));
  }

  function updateAddress(field: keyof BusinessForm["address"], value: string) {
    setForm((current) => ({
      ...current,

      address: {
        ...current.address,

        [field]: value,
      },
    }));
  }

  async function handleSave() {
    if (isSaving) {
      return;
    }

    const missingFields: string[] = [];

    if (!form.businessName.trim()) {
      missingFields.push("shop name");
    }

    if (!form.contact.phone.trim()) {
      missingFields.push("phone number");
    }

    if (!form.address.street.trim()) {
      missingFields.push("street address");
    }

    if (!form.address.city.trim()) {
      missingFields.push("city");
    }

    if (!form.address.state.trim()) {
      missingFields.push("state");
    }

    if (!form.address.zip.trim()) {
      missingFields.push("ZIP code");
    }

    if (missingFields.length > 0) {
      toast.error(`Complete the required fields: ${missingFields.join(", ")}.`);

      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/shops/settings", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          section: "shopInfo",

          data: {
            businessName: form.businessName.trim(),

            slug: form.slug.trim() || createSlug(form.businessName),

            contact: {
              ...initialShop?.contact,

              phone: form.contact.phone.trim(),

              website: form.contact.website.trim().toLowerCase(),
            },

            address: {
              ...initialShop?.address,

              street: form.address.street.trim(),

              city: form.address.city.trim(),

              state: form.address.state.trim().toUpperCase(),

              zip: form.address.zip.trim(),

              country: form.address.country,

              timezone: form.address.timezone,
            },
          },
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Unable to save business information.");
      }

      const nextForm = getInitialForm(data.shop);
      setForm(nextForm);
      setSavedForm(nextForm);

      toast.success("Business information saved.");

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save business information.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  useSettingsSectionActions("shared-business-information", {
    save: handleSave,
    discard: () => setForm(savedForm),
    isSaving,
  });

  return (
    <section
      id="shared-business-information"
      className="scroll-mt-28 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-100 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
            <Building2 size={21} />
          </div>

          <div>
            <h3 className="text-xl font-black tracking-tight text-gray-950">
              Business Information
            </h3>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              These details identify your shop across GetBloomDirect and
              BloomWebsites.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Phone number and physical address are required for shop readiness and
          delivery functionality.
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          {/* SHOP NAME */}
          <label className="lg:col-span-2">
            <span className="text-sm font-black text-gray-800">
              Shop Name
              <span className="ml-1 text-red-600">*</span>
            </span>

            <input
              type="text"
              value={form.businessName}
              onChange={(event) => {
                const businessName = event.target.value;

                setForm((current) => ({
                  ...current,

                  businessName,

                  slug: createSlug(businessName),
                }));
              }}
              className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
            />
          </label>

          {/* PHONE */}
          <label>
            <span className="flex items-center gap-2 text-sm font-black text-gray-800">
              <Phone size={15} />
              Shop Phone
              <span className="text-red-600">*</span>
            </span>

            <input
              type="tel"
              value={form.contact.phone}
              onChange={(event) =>
                updateContact("phone", formatPhone(event.target.value))
              }
              placeholder="888-888-8888"
              maxLength={12}
              className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
            />

            <p className="mt-2 text-xs leading-5 text-gray-500">
              Used by Bloom products where your public shop phone is displayed.
            </p>
          </label>

          {/* WEBSITE */}
          <label>
            <span className="flex items-center gap-2 text-sm font-black text-gray-800">
              <Globe2 size={15} />
              Existing Website
            </span>

            <input
              type="text"
              value={form.contact.website}
              onChange={(event) => updateContact("website", event.target.value)}
              placeholder="yourflowershop.com"
              className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
            />

            <p className="mt-2 text-xs leading-5 text-gray-500">
              This can remain your current public website while BloomWebsites is
              being prepared.
            </p>
          </label>
        </div>

        {/* ADDRESS */}
        <div className="mt-8 border-t border-gray-100 pt-7">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-purple-700" />

            <h4 className="font-black text-gray-950">Shop Location</h4>
          </div>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            Your physical shop location is shared because it powers delivery
            calculations across Bloom products.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-black text-gray-800">
                Street Address
                <span className="ml-1 text-red-600">*</span>
              </span>

              <input
                type="text"
                value={form.address.street}
                onChange={(event) =>
                  updateAddress("street", event.target.value)
                }
                placeholder="123 Flower Lane"
                className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
              />
            </label>

            <label>
              <span className="text-sm font-black text-gray-800">
                City
                <span className="ml-1 text-red-600">*</span>
              </span>

              <input
                type="text"
                value={form.address.city}
                onChange={(event) => updateAddress("city", event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
              />
            </label>

            <div className="grid grid-cols-[0.8fr_1.2fr] gap-4">
              <label>
                <span className="text-sm font-black text-gray-800">
                  State
                  <span className="ml-1 text-red-600">*</span>
                </span>

                <input
                  type="text"
                  value={form.address.state}
                  onChange={(event) =>
                    updateAddress(
                      "state",
                      event.target.value.slice(0, 2).toUpperCase(),
                    )
                  }
                  maxLength={2}
                  placeholder="NY"
                  className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold uppercase text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
                />
              </label>

              <label>
                <span className="text-sm font-black text-gray-800">
                  ZIP Code
                  <span className="ml-1 text-red-600">*</span>
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={form.address.zip}
                  onChange={(event) =>
                    updateAddress(
                      "zip",
                      event.target.value.replace(/\D/g, "").slice(0, 5),
                    )
                  }
                  maxLength={5}
                  placeholder="14036"
                  className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
                />
              </label>
            </div>

            <label className="sm:col-span-2">
              <span className="text-sm font-black text-gray-800">Country</span>

              <select
                value={form.address.country}
                onChange={(event) =>
                  updateAddress("country", event.target.value)
                }
                className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
              >
                {COUNTRIES.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-gray-500">
            Updating your address will also refresh the stored location used for
            delivery calculations.
          </p>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasRequiredFields}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
          >
            <Save size={17} />

            {isSaving ? "Saving..." : "Save Business Information"}
          </button>
        </div>
      </div>
    </section>
  );
}
