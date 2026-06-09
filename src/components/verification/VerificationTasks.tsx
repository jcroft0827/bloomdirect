import type { ReactNode } from "react";

type VerificationStep = {
  label: string;
  completed: boolean;
  actionLabel?: string;
  onActionClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;

  description?: ReactNode;
  customAction?: ReactNode;
};

type VerificationTasksProps = {
  steps: VerificationStep[];
  isVerified: boolean;
};

export default function VerificationTasks({
  steps,
  isVerified,
}: VerificationTasksProps) {
  return (
    <div className="w-full bg-white rounded-xl p-4 shadow-md">
      <h2 className="text-2xl font-medium text-gray-700 mb-4">
        Your Verification Tasks
      </h2>

      <ul className="space-y-3">
        {steps.map((step) => (
          <li
            key={step.label}
            className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 p-3"
          >
            <div className="flex items-start gap-3">
              <div
                className={
                  "mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 " +
                  (step.completed
                    ? "border-green-500 bg-green-500"
                    : "border-gray-400")
                }
              />

              <div>
                <span
                  className={
                    step.completed
                      ? "line-through text-gray-500"
                      : "text-gray-700"
                  }
                >
                  {step.label}
                </span>

                {step.description && (
                  <div className="mt-1 text-xs text-gray-500">
                    {step.description}
                  </div>
                )}

                {!step.completed && step.disabledReason && (
                  <p className="mt-1 text-xs text-gray-500">
                    {step.disabledReason}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0">
              {step.completed ? (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  Verified
                </span>
              ) : step.customAction ? (
                step.customAction
              ) : step.onActionClick ? (
                <button
                  type="button"
                  disabled={step.disabled}
                  onClick={step.onActionClick}
                  className={
                    "rounded-lg px-4 py-2 text-sm font-semibold transition " +
                    (step.disabled
                      ? "cursor-not-allowed bg-gray-100 text-gray-400"
                      : "bg-purple-600 text-white hover:bg-purple-700")
                  }
                >
                  {step.actionLabel || "Verify"}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {!isVerified && (
        <p className="mt-4 text-sm text-gray-600">
          Complete all tasks to become a verified florist and earn trust from
          other shops.
        </p>
      )}
    </div>
  );
}
