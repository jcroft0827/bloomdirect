"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BloomSpinner from "@/components/BloomSpinner";

export default function FinancialsSetup() {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    taxPercentage: "",
    deliveryTaxed: false,
    feeTaxed: false,
    feeType: "flat",
    feeValue: "",
  });
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  // Load shop info
  useEffect(() => {
    async function loadShop() {
      try {
        const res = await fetch("/api/shops/me");
        const data = await res.json();

        setState(data.shop.address.state);
        setCity(data.shop.address.city);
        setBusinessName(data.shop.businessName);

        setForm({
          ...form,
          taxPercentage: data.shop.financials?.taxPercentage || "",
          deliveryTaxed: data.shop.financials?.deliveryTaxed || false,
          feeTaxed: data.shop.financials?.feeTaxed || false,
          feeType: data.shop.financials?.feeType || "flat",
          feeValue: data.shop.financials?.feeValue || "",
        });
      } catch (err) {
        console.error("Failed to load shop data", err);
      }
    }
    loadShop();
  }, []);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Format Fees
  const roundToHundredth = (num: number) => {
    // 1. Perform the rounding math first
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;

    // 2. Convert to string with exactly two decimal places
    return rounded.toFixed(2);
  };
  const handleFeeBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (form.feeType === "%") {
      return;
    }

    const numValue = parseFloat(value);

    console.log(numValue);

    // If it's not a number (empty string), don't do anything
    if (isNaN(numValue)) return;

    const roundedValue = roundToHundredth(numValue);

    console.log(roundedValue);

    setForm((prev) => ({
      ...prev,
      [name]: roundedValue,
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/setup/financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        router.push("/dashboard/setup/featured-bouquet");
      } else {
        const data = await res.json();

        setError(data.error || "An unexpected error occurred.");
        setLoading(false);
        console.error("Failed to save taxes & fees info", data);
      }
    } catch (err) {
      setLoading(false);
      setError("Failed to connect to the server.");
      console.error("API request failed", err);
    } finally {
      setLoading(false);
    }
  };

  // Tax Search
  const handleTaxSearch = () => {
    if (!city || !state) {
      console.error("City or State is missing!");
      return;
    }
    const query = `https://www.google.com/search?q=what+is+the+sales+tax+in+${city}+${state}`;
    window.open(query, "_blank");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header */}
      <h2 className="text-xl font-semibold">
        <span className="text-emerald-700">{businessName}</span> Taxes & Fees
      </h2>
      {/* Taxes */}
      <div>
        <div className="flex justify-between items-end">
          <h3 className="text-xl font-semibold ml-2">Taxes</h3>
          {/* Search for tax percentage  */}
          <button
            className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer mr-6"
            onClick={handleTaxSearch}
          >
            What is my tax rate?
          </button>
        </div>
        <div className="border rounded-3xl p-6 shadow-lg grid sm:grid-cols-2 gap-4">
          {/* Tax % */}
          <div>
            <label
              htmlFor="taxPercentage"
              className="text-xs uppercase text-gray-500 ml-1"
            >
              Tax Percentage (%)
            </label>
            <input
              type="number"
              id="taxPercentage"
              name="taxPercentage"
              autoFocus
              required
              value={form.taxPercentage}
              onChange={handleChange}
              step="0.001"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-purple-600 focus:outline-none"
            />
          </div>
          {/* Checkboxes - Delivery Tax + Fee Tax */}
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="deliveryTaxed"
                id="deliveryTaxed"
                className="w-4 h-4 accent-purple-600"
                checked={form.deliveryTaxed}
                onChange={handleChange}
              />
              <label
                htmlFor="deliveryTaxed"
                className="text-sm font-medium text-gray-700"
              >
                Tax Deliveries
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="feeTaxed"
                id="feeTaxed"
                className="w-4 h-4 accent-purple-600"
                checked={form.feeTaxed}
                onChange={handleChange}
              />
              <label
                htmlFor="feeTaxed"
                className="text-sm font-medium text-gray-700"
              >
                Tax Fees
              </label>
            </div>
          </div>
        </div>
      </div>
      {/* Fees */}
      <div>
        <div className="flex gap-2 items-end">
          <h3 className="text-xl font-semibold ml-2">Fees</h3>
          <p className="text-sm text-emerald-700">
            This is the fee you'll charge for taking an order.
          </p>
        </div>
        <div className="border rounded-3xl p-6 shadow-lg grid sm:grid-cols-2 gap-4">
          {/* Fee Type */}
          <div>
            <label
              htmlFor="feeType"
              className="text-xs uppercase text-gray-500 ml-1"
            >
              Fee Type
            </label>
            <select
              id="feeType"
              name="feeType"
              required
              value={form.feeType}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-purple-600 focus:outline-none"
            >
              <option value="flat">Flat Fee</option>
              <option value="%">Percentage (%)</option>
            </select>
          </div>
          {/* Fee Value */}
          <div>
            <label
              htmlFor="feeValue"
              className="text-xs uppercase text-gray-500 ml-1"
            >
              Fee Value
            </label>
            <input
              type="number"
              id="feeValue"
              name="feeValue"
              value={form.feeValue}
              step="0.01"
              required
              placeholder="Fee Value"
              onChange={handleChange}
              onBlur={handleFeeBlur}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-purple-600 focus:outline-none"
            />
          </div>
        </div>
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

      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          className="bg-purple-600 text-white px-4 py-4 rounded-xl transition-all flex justify-center items-center gap-2 hover:bg-purple-700 w-full"
          onClick={() => {
            router.push("/dashboard/setup/payments");
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Previous Step
        </button>
      <button className="bg-emerald-600 text-white px-4 py-4 rounded-xl transition-all flex justify-center items-center gap-2 hover:bg-emerald-700 w-full">
        Save & Continue
        <span className={loading ? "block" : "hidden"}>
          <BloomSpinner size={30} />
        </span>
      </button>
      </div>
    </form>
  );
}
