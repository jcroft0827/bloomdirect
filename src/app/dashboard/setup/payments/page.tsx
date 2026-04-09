"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BloomSpinner from "@/components/BloomSpinner";

interface PaymentState {
  venmoHandle: string;
  cashAppTag: string;
  zellePhoneOrEmail: string;
  paypalEmail: string;
  defaultPaymentMethod: string;
}

export default function PaymentsSetup() {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<PaymentState>({
    venmoHandle: "",
    cashAppTag: "",
    zellePhoneOrEmail: "",
    paypalEmail: "",
    defaultPaymentMethod: "",
  });
  const [businessName, setBusinessName] = useState("");
  const [emailError, setEmailError] = useState("");
  const [zelleError, setZelleError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load shop info
  useEffect(() => {
    async function loadShop() {
      try {
        const res = await fetch("/api/shops/me");
        const data = await res.json();

        setBusinessName(data.shop.businessName);
        setForm({
          ...form,
          venmoHandle: data.shop.paymentMethods?.venmoHandle || "",
          cashAppTag: data.shop.paymentMethods?.cashAppTag || "",
          zellePhoneOrEmail: data.shop.paymentMethods?.zellePhoneOrEmail || "",
          paypalEmail: data.shop.paymentMethods?.paypalEmail || "",
          defaultPaymentMethod:
            data.shop.paymentMethods?.defaultPaymentMethod || "",
        });
      } catch (err) {
        console.error("Failed to load shop data", err);
      }
    }
    loadShop();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // PayPal Email Verification
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // 1. Always update the form state so they can type
    setForm({ ...form, [name]: value });

    // 2. Clear error if they start typing again
    if (emailError) setEmailError("");
  };
  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Validate only when they click away from the input
    if (e.target.value && !isValidEmail(e.target.value)) {
      setEmailError("Please enter a valid email address.");
    }
  };

  // Zelle Verification
  const isValidZelle = (value: string) => {
    // Removes all non-numeric characters for phone checking (e.g., dashes, spaces, parens)
    const cleanPhone = value.replace(/\D/g, "");

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isPhone = cleanPhone.length === 10; // Standard U.S. Mobile length

    return isEmail || isPhone;
  };
  const handleZelleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && !isValidZelle(value)) {
      setZelleError("Please enter a valid 10-digit phone or email.");
    } else {
      setZelleError("");
    }
  };

  type PaymentMethod = "venmo" | "cashapp" | "zelle" | "paypal";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const defaultMethod = form.defaultPaymentMethod as PaymentMethod;

    // 1. Ensure a default is chosen
    if (!defaultMethod) {
      setLoading(false);
      return alert("Please select a default payment method.");
    }

    // 2. Map state values to keys (Ensuring names match your State interface exactly)
    const fieldMapping: Record<PaymentMethod, string> = {
      venmo: form.venmoHandle,
      cashapp: form.cashAppTag,
      zelle: form.zellePhoneOrEmail,
      paypal: form.paypalEmail, // Note the capital 'P'
    };

    const selectedValue = fieldMapping[defaultMethod];

    // 3. Ensure the chosen default field isn't empty
    if (!selectedValue || selectedValue.trim() === "") {
      setLoading(false);
      return alert(
        `You must provide your ${defaultMethod} details to set it as default.`,
      );
    }

    // 4. Specific Format Validations
    if (defaultMethod === "paypal" && !isValidEmail(form.paypalEmail)) {
      setLoading(false);
      return alert("The PayPal email address is invalid.");
    }

    if (defaultMethod === "zelle" && !isValidZelle(form.zellePhoneOrEmail)) {
      setLoading(false);
      return alert(
        "The Zelle field must be a valid 10-digit phone number or email.",
      );
    }

    // 5. Success - Proceed to API
    // console.log("Form is valid:", form);

    try {
      const res = await fetch("/api/setup/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push("/dashboard/setup/delivery");
      } else {
        const data = await res.json();

        setError(data.error || "An unexpected error occurred.");
        setLoading(false);
        console.error("Failed to save payment info", data);
      }
    } catch (err) {
      setLoading(false);
      setError("Failed to connect to the server.");
      console.error("API request failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">
        <span className="text-emerald-700">{businessName}</span> Payment Methods
      </h2>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Venmo Handle */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="venmoHandle"
              className="text-xs uppercase text-gray-500 ml-1"
            >
              Venmo Handle
            </label>
            <label className="text-[10px] uppercase text-purple-600 font-bold flex items-center gap-1 mr-2">
              <input
                type="radio"
                name="defaultPaymentMethod"
                value="venmo"
                tabIndex={-1}
                checked={form.defaultPaymentMethod === "venmo"}
                onChange={handleChange}
              />{" "}
              Set Default
            </label>
          </div>
          <input
            type="text"
            id="venmoHandle"
            name="venmoHandle"
            placeholder="@username"
            value={form.venmoHandle}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-purple-600 focus:outline-none"
          />
        </div>
        {/* CashApp Tag */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="cashapp"
              className="text-xs uppercase text-gray-500 ml-1"
            >
              CashApp Tag
            </label>
            <label className="text-[10px] uppercase text-purple-600 font-bold flex items-center gap-1 mr-2">
              <input
                type="radio"
                name="defaultPaymentMethod"
                value="cashapp"
                tabIndex={-1}
                checked={form.defaultPaymentMethod === "cashapp"}
                onChange={handleChange}
              />{" "}
              Set Default
            </label>
          </div>
          <input
            type="text"
            id="cashApp"
            name="cashAppTag"
            placeholder="$cashtag"
            value={form.cashAppTag}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 ring-purple-600 focus:outline-none"
          />
        </div>
        {/* PayPal */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="paypal"
              className="text-xs uppercase text-gray-500 ml-1"
            >
              PayPal Email
            </label>
            <label className="text-[10px] uppercase text-purple-600 font-bold flex items-center gap-1 mr-2">
              <input
                type="radio"
                name="defaultPaymentMethod"
                value="paypal"
                tabIndex={-1}
                checked={form.defaultPaymentMethod === "paypal"}
                onChange={handleChange}
              />{" "}
              Set Default
            </label>
          </div>
          <input
            type="email"
            id="paypal"
            name="paypalEmail"
            value={form.paypalEmail}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            placeholder="name@email.com"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
              emailError
                ? "border-red-500 ring-red-200"
                : "focus:ring-2 ring-purple-600"
            }`}
          />
          {emailError && (
            <p className="text-red-500 text-xs mt-1">{emailError}</p>
          )}
        </div>
        {/* Zelle */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="zelle"
              className="text-xs uppercase text-gray-500 ml-1"
            >
              Zelle Phone or Email
            </label>
            <label className="text-[10px] uppercase text-purple-600 font-bold flex items-center gap-1 mr-2">
              <input
                type="radio"
                name="defaultPaymentMethod"
                value="zelle"
                tabIndex={-1}
                checked={form.defaultPaymentMethod === "zelle"}
                onChange={handleChange}
              />{" "}
              Set Default
            </label>
          </div>
          <input
            type="text"
            id="zelle"
            name="zellePhoneOrEmail"
            value={form.zellePhoneOrEmail}
            onChange={handleChange}
            onBlur={handleZelleBlur}
            placeholder="(555)555-5555 or name@email.com"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none ${
              emailError
                ? "border-red-500 ring-red-200"
                : "focus:ring-2 ring-purple-600"
            }`}
          />
          {zelleError && (
            <p className="text-red-500 text-xs mt-1">{zelleError}</p>
          )}
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
            router.push("/dashboard/setup/business");
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
