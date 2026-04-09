"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const steps = [
  { label: "Business Information", path: "/dashboard/setup/business" },
  { label: "Payment Methods", path: "/dashboard/setup/payments" },
  { label: "Delivery Settings", path: "/dashboard/setup/delivery" },
  { label: "Taxes & Fees", path: "/dashboard/setup/financials" },
  { label: "Featured Bouquet", path: "/dashboard/setup/featured-bouquet" },
];

export default function SetupLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const currentIndex = steps.findIndex((step) =>
    pathname.startsWith(step.path),
  );

  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Header */}
      <div className="w-full border-b bg-white p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold text-purple-600">
            GetBloomDirect Account Setup
          </h1>
          <p className="text-gray-600 mt-1">
            Complete your shop profile so other florists can confidently send
            you orders.
          </p>
        </div>
        {/* Progress Bar */}
        <div className="w-full mt-4 bg-gray-200 h-2 rounded">
          <div
            className="h-2 bg-purple-600 rounded transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Progress Steps */}
      <div className="w-full max-w-3xl mt-6 px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Setup Progress</h2>

          <div className="space-y-2">
            {steps.map((step, index) => (
              <Step
                key={step.label}
                label={step.label}
                status={
                  index < currentIndex
                    ? "complete"
                    : index === currentIndex
                      ? "current"
                      : "upcoming"
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="w-full max-w-3xl mt-6 px-4 pb-16">
        <div className="bg-white rounded-lg shadow p-6">{children}</div>
      </div>
    </div>
  );
}

function Step({
  label,
  status,
}: {
  label: string;
  status: "complete" | "current" | "upcoming";
}) {
  return (
    <div className="flex items-center gap-3">
      {status === "complete" && (
        <div className="w-4 h-4 rounded-full bg-green-500" />
      )}

      {status === "current" && (
        <div className="w-4 h-4 rounded-full bg-purple-600" />
      )}

      {status === "upcoming" && (
        <div className="w-4 h-4 rounded-full bg-gray-300" />
      )}

      <span
        className={
          status === "current"
            ? "font-semibold text-purple-600"
            : "text-gray-700"
        }
      >
        {label}
      </span>
    </div>
  );
}
