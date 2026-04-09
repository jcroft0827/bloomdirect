"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const steps = [
  {
    label: "Business Info",
    path: "/dashboard/setup/business",
  },
  {
    label: "Payments",
    path: "/dashboard/setup/payments",
  },
  {
    label: "Delivery",
    path: "/dashboard/setup/delivery",
  },
  {
    label: "Financials",
    path: "/dashboard/setup/financials",
  },
  {
    label: "Featured Bouquet",
    path: "/dashboard/setup/featured-bouquet",
  },
];

export default function SetupProgress() {
  const pathname = usePathname();

  const currentIndex = steps.findIndex(step =>
    pathname.startsWith(step.path)
  );

  return (
    <div className="w-64 border rounded-lg p-4 bg-white">
      <h3 className="font-semibold mb-4">Setup Progress</h3>

      <ul className="space-y-3">
        {steps.map((step, index) => {
          let status = "upcoming";

          if (index < currentIndex) status = "complete";
          if (index === currentIndex) status = "current";

          return (
            <li key={step.path}>
              <Link
                href={step.path}
                className="flex items-center gap-2 text-sm"
              >
                {status === "complete" && (
                  <span className="text-green-600">✓</span>
                )}

                {status === "current" && (
                  <span className="text-blue-600">→</span>
                )}

                {status === "upcoming" && (
                  <span className="text-gray-400">○</span>
                )}

                <span
                  className={
                    status === "current"
                      ? "font-semibold"
                      : ""
                  }
                >
                  {step.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}