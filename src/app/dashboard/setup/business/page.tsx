"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BloomSpinner from "@/components/BloomSpinner";

interface AddressState {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  timezone: string;
}

interface ContactState {
  phone: string;
  website: string;
}

const COUNTRIES = ["US", "CA"];

export default function BusinessSetup() {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  const [addrForm, setAddrForm] = useState<AddressState>({
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    timezone: "",
  });
  const [contactForm, setContactForm] = useState<ContactState>({
    phone: "",
    website: "",
  });
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);

  const [timezones, setTimezones] = useState<
    { value: string; label: string }[]
  >([]);

  // Load shop info
  useEffect(() => {
    async function loadShop() {
      try {
        const res = await fetch("/api/shops/me");
        const data = await res.json();

        setBusinessName(data.shop.businessName);

        if (data.shop?.contact) {
          const contact = data.shop.contact;
          setContactForm({
            phone: contact.phone || "",
            website: contact.website || "",
          });
        }

        if (data.shop?.address) {
          const addr = data.shop.address;
          setAddrForm({
            street: addr.street || "",
            city: addr.city || "",
            state: addr.state || "",
            zip: addr.zip || "",
            country: addr.country || "US",
            timezone: addr.timezone || "",
          });

          if (addr.zip) autoFillZip(addr.zip, addr.country || "US");
        }
      } catch (err) {
        console.error("Failed to load shop data", err);
      }
    }

    loadShop();
  }, []);

  // Load timezone list on client only
  useEffect(() => {
    const zones = Intl.supportedValuesOf("timeZone")
      .filter((tz) => tz.startsWith("America/") || tz.startsWith("Canada/"))
      .map((tz) => ({
        value: tz,
        label: tz.replace(/(America\/|Canada\/)/, "").replaceAll("_", " "),
      }));
    setTimezones(zones);
  }, []);

  // Autofill city/state/country from ZIP
  async function autoFillZip(zip: string, currentCountry: string) {
    try {
      let country = currentCountry;
      let res = await fetch(
        `https://api.zippopotam.us/${country.toLowerCase()}/${zip}`,
      );

      if (!res.ok) {
        // Try US if Canada fails
        country = country === "CA" ? "US" : "CA";
        res = await fetch(
          `https://api.zippopotam.us/${country.toLowerCase()}/${zip}`,
        );
      }

      if (!res.ok) return;

      const data = await res.json();
      const place = data.places?.[0];
      if (!place) return;

      setAddrForm((prev) => ({
        ...prev,
        city: place["place name"] || prev.city,
        state: place["state abbreviation"] || prev.state,
        country: country,
      }));
    } catch (err) {
      console.error("ZIP lookup failed", err);
    }
  }

  const handleAddrChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setAddrForm((prev) => ({ ...prev, [name]: value }));

    if (name === "zip" && value.length >= 5) {
      autoFillZip(value, addrForm.country);
    }
  };

  const handleContactChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/setup/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addrForm,
          ...contactForm,
        }),
      });

      if (res.ok) {
        router.push("/dashboard/setup/payments");
      } else {
        const data = await res.json();

        setError(data.error || "An unexpected error occurred.");
        setLoading(false);
        console.error("Failed to save business info", data);
      }
    } catch (err) {
      setLoading(false);
      setError("Failed to connect to the server.");
      console.error("API request failed", err);
    } finally {
      setLoading(false);
    }
  };

  // Phone Formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "").slice(0, 10);
    setContactForm({ ...contactForm, phone: rawValue });
  };

  const handlePhoneBlur = () => {
    const digits = contactForm.phone;
    let formatted = digits;

    if (digits.length === 7) {
      formatted = digits.replace(/(\d{3})(\d{4})/, "$1-$2");
    } else if (digits.length === 10) {
      formatted = digits.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    }

    setContactForm({ ...contactForm, phone: formatted });
  };

  const handlePhoneFocus = () => {
    // Strip dashes back out for clean editing
    setContactForm({
      ...contactForm,
      phone: contactForm.phone.replace(/\D/g, ""),
    });
  };

  // Zip Formatting
  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Strip non-digits and limit to 9 characters (max for ZIP+4 digits)
    const rawValue = e.target.value.replace(/\D/g, "").slice(0, 9);
    setAddrForm({ ...addrForm, zip: rawValue });
  };

  const handleZipBlur = () => {
    const digits = addrForm.zip;
    // 2. Format to 12345-6789 if they entered all 9 digits
    if (digits.length === 9) {
      setAddrForm({
        ...addrForm,
        zip: digits.replace(/(\d{5})(\d{4})/, "$1-$2"),
      });
    }
  };

  const handleZipFocus = () => {
    // 3. Strip the dash back out for clean editing
    setAddrForm({ ...addrForm, zip: addrForm.zip.replace(/\D/g, "") });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <h2 className="text-xl font-semibold">
        <span className="text-emerald-700">{businessName}</span> Information
      </h2>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="text-xs uppercase text-gray-500 ml-1">
          Phone Number
        </label>
        <input
          type="text"
          name="phone"
          id="phone"
          required
          autoFocus
          value={contactForm.phone}
          onChange={handlePhoneChange}
          onBlur={handlePhoneBlur}
          onFocus={handlePhoneFocus}
          placeholder="000-000-0000"
          className="w-full px-3 py-2 border rounded-lg capitalize focus:ring-2 ring-purple-600 focus:outline-none"
        />
      </div>
      {/* Street Address */}
      <div>
        <label
          htmlFor="street"
          className="text-xs uppercase text-gray-500 ml-1"
        >
          Street Address
        </label>
        <input
          type="text"
          name="street"
          id="street"
          placeholder="Street Address"
          required
          value={addrForm.street}
          onChange={handleAddrChange}
          className="w-full px-3 py-2 border rounded-lg capitalize focus:ring-2 ring-purple-600 focus:outline-none"
        />
      </div>
      {/* City + State + Zip */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* City */}
        <div>
          <label
            htmlFor="city"
            className="text-xs uppercase text-gray-500 ml-1"
          >
            City
          </label>
          <input
            type="text"
            name="city"
            id="city"
            placeholder="City"
            required
            value={addrForm.city}
            onChange={handleAddrChange}
            className="w-full px-3 py-2 border rounded-lg capitalize focus:ring-2 ring-purple-600 focus:outline-none"
          />
        </div>
        {/* State */}
        <div>
          <label
            htmlFor="state"
            className="text-xs uppercase text-gray-500 ml-1"
          >
            State
          </label>
          <input
            type="text"
            id="state"
            name="state"
            placeholder="State / Province"
            required
            value={addrForm.state}
            onChange={handleAddrChange}
            className="w-full px-3 py-2 border rounded-lg uppercase focus:ring-2 ring-purple-600 focus:outline-none"
          />
        </div>
        {/* Zip */}
        <div>
          <label htmlFor="zip" className="text-xs uppercase text-gray-500 ml-1">
            Zip Code
          </label>
          <input
            id="zip"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            required
            value={addrForm.zip}
            onChange={handleZipChange}
            onBlur={handleZipBlur}
            onFocus={handleZipFocus}
            placeholder="12345"
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 ring-purple-600 focus:outline-none"
          />
        </div>
      </div>
      {/* Country + Timezone */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Country */}
        <div>
          <label htmlFor="country" className="order-input-label">
            Country
          </label>
          <select
            id="country"
            name="country"
            required
            value={addrForm.country}
            onChange={handleAddrChange}
            className="order-input"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c === "US" ? "United States" : "Canada"}
              </option>
            ))}
          </select>
        </div>
        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className="order-input-label">
            Timezone
          </label>
          <select
            id="timezone"
            name="timezone"
            required
            value={addrForm.timezone}
            onChange={handleAddrChange}
            className="order-input"
            disabled={timezones.length === 0} // wait until timezones loaded
          >
            <option value="">Select Timezone</option>
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Website */}
      <div>
        <label
          htmlFor="website"
          className="text-xs uppercase text-gray-500 ml-1"
        >
          Website (optional)
        </label>
        <input
          id="website"
          name="website"
          placeholder="Website (optional)"
          value={contactForm.website}
          onChange={handleContactChange}
          className="w-full px-4 py-3 border lowercase rounded-lg focus:ring-2 ring-purple-600 focus:outline-none mb-2"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}

      <button className="bg-emerald-600 text-white px-4 py-4 rounded-xl transition-all flex justify-center items-center gap-2 hover:bg-emerald-700 w-full">
        Save & Continue
        <span className={loading ? "block" : "hidden"}>
          <BloomSpinner size={30} />
        </span>
      </button>
    </form>
  );
}
