"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BloomSpinner from "@/components/BloomSpinner";

interface ZipZone {
  name: string;
  zip: string;
  fee: number | string;
}

interface DistanceZone {
  min: number;
  max: number;
  fee: number | string;
}

interface DeliveryState {
  method: "zip" | "distance" | "";
  fallbackFee: number;
  maxRadius: number;
  sameDayCutoff: string;
  allowSameDay: boolean;
  zipZones: ZipZone[];
  distanceZones: DistanceZone[];
}

export default function DeliverySetup() {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  type ZoneError = {
    name?: string; // For Zip
    zip?: string; // For Zip
    min?: string; // For Distance
    max?: string; // For Distance
    overlap?: string; // For Distance
    fields?: string; // For Both
    gap?: string;
  };

  const [deliveryForm, setDeliveryForm] = useState<DeliveryState>({
    method: "zip",
    fallbackFee: 0,
    maxRadius: 0,
    sameDayCutoff: "14:00",
    allowSameDay: true,
    zipZones: [],
    distanceZones: [],
  });
  const [businessName, setBusinessName] = useState("");
  const [zoneErrors, setZoneErrors] = useState<Record<number, ZoneError>>({});
  const [loading, setLoading] = useState(false);

  // Load shop info
  useEffect(() => {
    async function loadShop() {
      try {
        const res = await fetch("/api/shops/me");
        const data = await res.json();

        setBusinessName(data.shop.businessName);

        if (data.shop?.delivery) {
          const delivery = data.shop.delivery;
          setDeliveryForm({
            method: delivery.method || "zip",
            fallbackFee: delivery.fallbackFee || 0,
            maxRadius: delivery.maxRadius || 0,
            sameDayCutoff: delivery.sameDayCutoff || "",
            allowSameDay: delivery.allowSameDay || true,
            zipZones: delivery.zipZones || [],
            distanceZones: delivery.distanceZones || [],
          });
        }
      } catch (err) {
        console.error("Failed to load shop data", err);
      }
    }
    loadShop();
  }, []);

  const addZone = () => {
    if (deliveryForm.method === "zip") {
      const newZip: ZipZone = { name: "", zip: "", fee: "" };
      setDeliveryForm((prev) => ({
        ...prev,
        zipZones: [...prev.zipZones, newZip],
      }));
    } else {
      // Logic for Distance: Find the last zone's max to use as the new min
      const lastZone =
        deliveryForm.distanceZones[deliveryForm.distanceZones.length - 1];
      const nextMin = lastZone ? lastZone.max : 0; // Default to 0 if first zone

      const newDist: DistanceZone = { min: nextMin, max: 0, fee: "" };

      setDeliveryForm((prev) => ({
        ...prev,
        distanceZones: [...prev.distanceZones, newDist],
      }));
    }
  };

  const updateZone = (index: number, field: string, value: any) => {
    const isZip = deliveryForm.method === "zip";
    const listKey = isZip ? "zipZones" : "distanceZones";

    setDeliveryForm((prev) => {
      const newList = [...(prev[listKey] as any[])];
      newList[index] = { ...newList[index], [field]: value };

      // --- GAP PREVENTION LOGIC ---
      if (!isZip && field === "max") {
        // If we update a Max, and there's a zone after this in the array,
        // automatically update that zone's Min to match
        if (index < newList.length - 1) {
          newList[index + 1] = { ...newList[index + 1], min: value };
        }
      }
      // -----------------------------

      // Trigger the correct validation
      if (isZip) validateZipZones(newList);
      else validateDistanceZones(newList);
      return { ...prev, [listKey]: newList };
    });
  };

  const removeZone = (index: number) => {
    if (window.confirm("Are you sure you want to remove this zone?")) {
      const isZip = deliveryForm.method === "zip";
      const listKey = isZip ? "zipZones" : "distanceZones";

      setDeliveryForm((prev) => {
        // 1. Create the new filtered list
        const updatedList = (prev[listKey] as any[]).filter(
          (_, i) => i !== index,
        );

        // 2. Re-run the specific validator for the remaining items
        if (isZip) {
          validateZipZones(updatedList as ZipZone[]);
        } else {
          validateDistanceZones(updatedList as DistanceZone[]);
        }

        // 3. Return the updated state
        return {
          ...prev,
          [listKey]: updatedList,
        };
      });
    }
  };

  // 4. Validate Distance Zones
  const validateDistanceZones = (zones: DistanceZone[]) => {
    const newErrors: Record<number, ZoneError> = {};

    // 1. Create a sorted map of indices based on 'min' values
    // This allows us to check for gaps and overlaps sequentially
    const sortedIndices = zones
      .map((_, i) => i)
      .sort((a, b) => Number(zones[a].min) - Number(zones[b].min));

    sortedIndices.forEach((currentIndex, i) => {
      const zone = zones[currentIndex];
      const errors: ZoneError = {};

      const zMin = Number(zone.min);
      const zMax = Number(zone.max);
      const zFee = zone.fee;

      // --- BASIC FIELD VALIDATION ---
      // Check for empty/zero fields
      if (zMin === undefined || zMax === undefined || !zFee || zFee === 0) {
        errors.fields = "All distance fields are required.";
      }

      // Logic Check: Min cannot be greater than or equal to Max
      if (zMin >= zMax && zMax !== 0) {
        errors.max = "Max distance must be greater than Min.";
      }

      // --- OVERLAP & GAP LOGIC (SEQUENTIAL) ---
      // If there is a "next" zone in the sorted list, check the boundary
      if (i < sortedIndices.length - 1) {
        const nextIndex = sortedIndices[i + 1];
        const nextZone = zones[nextIndex];
        const nextMin = Number(nextZone.min);

        // Check for Gaps: e.g., Zone A ends at 5, Zone B starts at 6
        if (zMax < nextMin) {
          errors.gap = `Gap between ${zMax} and ${nextMin} miles (Fallback fee applies).`;
        }

        // Check for Overlaps: e.g., Zone A ends at 7, Zone B starts at 5
        if (zMax > nextMin) {
          errors.overlap = `This range overlaps with the next zone starting at ${nextMin} miles.`;
        }
      }

      // Save errors for this specific index if any were found
      if (Object.keys(errors).length > 0) {
        newErrors[currentIndex] = errors;
      }
    });

    setZoneErrors(newErrors);

    // Return true only if the errors object is completely empty
    return Object.keys(newErrors).length === 0;
  };

  const validateZipZones = (updatedZones: ZipZone[]) => {
    const newErrors: Record<number, ZoneError> = {};

    updatedZones.forEach((zone, index) => {
      const errors: ZoneError = {};

      // 1. Check for Empty Fields
      if (!zone.name.trim() || !zone.zip.trim() || zone.fee === "") {
        errors.fields = "All fields are required for this zone.";
      }

      // 2. Check for Duplicate Names
      const isDuplicateName = updatedZones.some(
        (other, i) =>
          i !== index &&
          other.name.trim().toLowerCase() === zone.name.trim().toLowerCase() &&
          zone.name !== "",
      );
      if (isDuplicateName) errors.name = "This zone name is already in use.";

      // 3. Check for Duplicate ZIPs
      const isDuplicateZip = updatedZones.some(
        (other, i) =>
          i !== index &&
          other.zip.trim() === zone.zip.trim() &&
          zone.zip !== "",
      );
      if (isDuplicateZip)
        errors.zip = "This ZIP code is already assigned to another zone.";

      if (Object.keys(errors).length > 0) {
        newErrors[index] = errors;
      }
    });

    setZoneErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Returns true if valid
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "method") {
      const hasExistingZones =
        deliveryForm.zipZones.length > 0 ||
        deliveryForm.distanceZones.length > 0;

      if (hasExistingZones) {
        // Show confirmation box
        const confirmed = window.confirm(
          "Switching methods will clear all your currently added zones. Are you sure?",
        );

        // If user clicks 'Cancel' (false), stop and do nothing
        if (!confirmed) return;
      }

      // If 'OK' or no zones, reset arrays and switch method
      setDeliveryForm((prev) => ({
        ...prev,
        method: value as "zip" | "distance",
        zipZones: [],
        distanceZones: [],
      }));
      return;
    }

    // Standard update for other fields
    setDeliveryForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setDeliveryForm((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const isZip = deliveryForm.method === "zip";
    let isValid = false;

    // 1. Run the specific validator based on the active method
    if (isZip) {
      isValid = validateZipZones(deliveryForm.zipZones);
    } else {
      isValid = validateDistanceZones(deliveryForm.distanceZones);
    }

    // 2. Validate top-level fields (like Fallback Fee)
    if (!deliveryForm.fallbackFee && deliveryForm.fallbackFee !== 0) {
      setLoading(false);
      return alert(
        "Please provide a Fallback Fee for orders outside your zones.",
      );
    }

    // 3. Stop if any validation (duplicates, overlaps, or empty fields) failed
    if (!isValid) {
      setLoading(false);
      return alert(
        `Please fix the errors in your ${isZip ? "ZIP" : "Distance"} zones before continuing.`,
      );
    }

    // 4. Success - Send to API
    try {
      const res = await fetch("/api/setup/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryForm),
      });

      if (res.ok) {
        router.push("/dashboard/setup/financials");
      } else {
        const data = await res.json();

        setError(data.error || "An unexpected error occurred.");
        setLoading(false);
        console.error("Failed to save delivery info", data);
      }
    } catch (err) {
      setLoading(false);
      setError("Failed to connect to the server.");
      console.error("API request failed", err);
    }
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
    const numValue = parseFloat(value);

    // If it's not a number (empty string), don't do anything
    if (isNaN(numValue)) return;

    const roundedValue = roundToHundredth(numValue);

    setDeliveryForm((prev) => ({
      ...prev,
      [name]: roundedValue,
    }));
  };

  const handleZoneFeeBlur = (index: number) => {
    const listKey =
      deliveryForm.method === "zip" ? "zipZones" : "distanceZones";

    setDeliveryForm((prev) => {
      const newList = [...prev[listKey]] as any[];
      const currentFee = newList[index].fee;

      newList[index] = {
        ...newList[index],
        fee: roundToHundredth(currentFee),
      };

      return { ...prev, [listKey]: newList };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold">
        <span className="text-emerald-700">{businessName}</span> Delivery
        Settings
      </h2>

      {/* Delivery Methods */}
      <div>
        <h3 className="mb-2">
          Choose Delivery Method (
          <span className="text-emerald-700 font-semibold">Zip</span> or
          <span className="text-emerald-700 font-semibold"> Distance</span>)
        </h3>
        <div className="px-2 flex items-center gap-8 text-xl">
          {/* Zip */}
          <label>
            <input
              type="radio"
              name="method"
              value="zip"
              tabIndex={-1}
              checked={deliveryForm.method === "zip"}
              onChange={handleChange}
            />{" "}
            Zip
          </label>
          {/* Distance */}
          <label>
            <input
              type="radio"
              name="method"
              value="distance"
              tabIndex={-1}
              checked={deliveryForm.method === "distance"}
              onChange={handleChange}
            />{" "}
            Distance
          </label>
        </div>
      </div>

      {/* Dynamic Zone Section */}
      <div className="border p-4 rounded-lg bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium capitalize">
            {deliveryForm.method} Zones
          </h3>
          <button
            type="button"
            onClick={addZone}
            className="text-xs bg-emerald-600 text-white px-2 py-1 rounded"
          >
            + Add {deliveryForm.method === "zip" ? "Zip" : "Distance"} Option
          </button>
        </div>

        {deliveryForm.method === "zip" ? (
          // Zip
          <div className="space-y-2">
            {deliveryForm.zipZones.map((zone, index) => (
              <div key={index} className="space-y-1 border-b pb-4 mb-4">
                <div className="flex items-start gap-2">
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {/* Name Input */}
                    <div>
                      <input
                        className={`w-full p-2 border rounded ${zoneErrors[index]?.name ? "border-red-500" : "border-gray-300"}`}
                        value={zone.name}
                        onChange={(e) =>
                          updateZone(index, "name", e.target.value)
                        }
                        placeholder="Zone Name"
                      />
                      {zoneErrors[index]?.name && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {zoneErrors[index].name}
                        </p>
                      )}
                    </div>

                    {/* ZIP Input */}
                    <div>
                      <input
                        className={`w-full p-2 border rounded ${zoneErrors[index]?.zip ? "border-red-500" : "border-gray-300"}`}
                        value={zone.zip}
                        onChange={(e) =>
                          updateZone(index, "zip", e.target.value)
                        }
                        placeholder="ZIP Code"
                      />
                      {zoneErrors[index]?.zip && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {zoneErrors[index].zip}
                        </p>
                      )}
                    </div>

                    {/* Fee Input */}
                    <input
                      type="number"
                      className="w-full p-2 border rounded border-gray-300"
                      value={zone.fee}
                      onChange={(e) => updateZone(index, "fee", e.target.value)}
                      onBlur={() =>
                        updateZone(
                          index,
                          "fee",
                          parseFloat(zone.fee.toString()).toFixed(2),
                        )
                      }
                      placeholder="Fee ($)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeZone(index)}
                    className="p-2 text-red-500"
                  >
                    X
                  </button>
                </div>
                {zoneErrors[index]?.fields && (
                  <p className="text-[10px] text-red-600 font-bold">
                    {zoneErrors[index].fields}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Distance
          <div className="space-y-2">
            {deliveryForm.distanceZones.map((zone, index) => (
              <React.Fragment key={index}>
                <div
                  className={`p-3 rounded-lg border ${zoneErrors[index]?.gap ? "bg-amber-50 border-amber-200" : "bg-white"}`}
                >
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400">
                        Min Miles
                      </label>
                      <input
                        type="number"
                        step={0.1}
                        className="w-full p-2 border rounded border-gray-300"
                        value={zone.min}
                        onChange={(e) =>
                          updateZone(index, "min", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">
                        Max Miles
                      </label>
                      <input
                        type="number"
                        step={0.1}
                        className={`w-full p-2 border rounded ${zoneErrors[index]?.max ? "border-red-500" : "border-gray-300"}`}
                        value={zone.max}
                        onChange={(e) =>
                          updateZone(index, "max", e.target.value)
                        }
                      />
                      {zoneErrors[index]?.max && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {zoneErrors[index].max}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">
                        Fee ($)
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded border-gray-300"
                        value={zone.fee}
                        onChange={(e) =>
                          updateZone(index, "fee", e.target.value)
                        }
                        onBlur={() =>
                          updateZone(
                            index,
                            "fee",
                            parseFloat(zone.fee.toString()).toFixed(2),
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeZone(index)}
                      className="mt-6 text-red-500 max-w-8 rounded-lg transition-all hover:border hover:shadow-inner hover:shadow-red-500"
                    >
                      X
                    </button>
                  </div>
                  {/* Visual Gap Warning */}
                  {zoneErrors[index]?.gap && (
                    <div className="mt-2 flex items-center gap-1 text-amber-600 text-[10px] font-bold">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {zoneErrors[index].gap} (Fallback fee will apply here)
                    </div>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Helper message if list is empty */}
        {(deliveryForm.method === "zip"
          ? deliveryForm.zipZones
          : deliveryForm.distanceZones
        ).length === 0 && (
          <p className="text-gray-400 text-sm italic text-center">
            No zones added yet.
          </p>
        )}
      </div>

      {/* Fallback Fee + Max Delivery Radius */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Fallback Fee */}
        <div>
          <label
            htmlFor="fallbackFee"
            className="text-xs uppercase text-gray-500 ml-1"
          >
            Fallback Fee ($)
          </label>
          <input
            type="number"
            id="fallbackFee"
            name="fallbackFee"
            value={deliveryForm.fallbackFee}
            onChange={handleChange}
            onBlur={handleFeeBlur}
            step="0.01"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-purple-600 focus:outline-none"
          />
        </div>
        {/* Max Delivery Radius */}
        <div>
          <label
            htmlFor="maxRadius"
            className="text-xs uppercase text-gray-500 ml-1"
          >
            Max Delivery Radius (miles)
          </label>
          <input
            type="number"
            id="maxRadius"
            name="maxRadius"
            value={deliveryForm.maxRadius}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-purple-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Checkbox Container */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          name="allowSameDay"
          id="allowSameDay"
          className="w-4 h-4 accent-emerald-600"
          checked={deliveryForm.allowSameDay}
          onChange={handleToggle}
        />
        <label
          htmlFor="allowSameDay"
          className="text-sm font-medium text-gray-700"
        >
          Allow Same Day Delivery?
        </label>
      </div>

      {/* Conditional Time Picker */}
      {deliveryForm.allowSameDay && (
        <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
          <label
            htmlFor="sameDayCutoff"
            className="text-xs uppercase text-gray-500 ml-1"
          >
            Same Day Order Cutoff Time
          </label>
          <input
            type="time" // Native browser time picker
            id="sameDayCutoff"
            name="sameDayCutoff"
            value={deliveryForm.sameDayCutoff}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-emerald-600 focus:outline-none"
          />
          <p className="text-[10px] text-gray-400 ml-1">
            Orders placed after this time will default to the next available
            day.
          </p>
        </div>
      )}

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
