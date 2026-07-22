"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type VerificationStep = {
  label: string;
  completed: boolean;
};

type VerificationProgressBarProps = {
  steps: VerificationStep[];
  isVerified: boolean;
};

export default function VerificationProgressBar({
  steps,
  isVerified,
}: VerificationProgressBarProps) {
  const pathname = usePathname();

  const completedSteps = steps.filter((step) => step.completed).length;
  const totalSteps = steps.length;

  const isOnVerificationPage = pathname === "/dashboard/verification";

  return (
    <div className="w-full bg-purple-300 rounded-xl p-4 mb-4">
      <div className="mb-2">
        <p className="text-2xl font-medium text-gray-700">
          Verification Progress: {completedSteps} of {totalSteps} steps
          completed
        </p>

        <p className="text-gray-700">
          Earn trust and let others know you&apos;re a verified florist.
        </p>
      </div>

      <div className="flex gap-[0.1rem] w-full items-center">
        <div className="flex gap-[0.1rem] flex-1">
          {steps.map((step) => {
            const index = steps.indexOf(step);
            const isFilled = index < completedSteps;

            return (
              <div
                key={step.label}
                title={step.label}
                className={
                  "h-5 w-full rounded-md border border-purple-600 transition-colors " +
                  (isFilled ? "bg-purple-600" : "bg-transparent")
                }
              />
            );
          })}
        </div>

        <div
          className={
            "flex items-center justify-center h-8 w-8 rounded-full " +
            (isVerified ? "text-emerald-500" : "text-gray-400")
          }
        >
          {/* svg stays the same */}
        </div>
      </div>

      {!isVerified && !isOnVerificationPage && (
        <Link
          href="/dashboard/verification"
          className="mt-4 inline-block px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
        >
          Get Verified
        </Link>
      )}
    </div>
  );
}