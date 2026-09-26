"use client";

import { Check } from "lucide-react";

type CheckoutStep = "delivery" | "message" | "payment";

type BloomWebsiteCheckoutStepsProps = {
  currentStep: CheckoutStep;
};

const STEPS: Array<{
  id: CheckoutStep;
  number: number;
  label: string;
}> = [
  {
    id: "delivery",
    number: 1,
    label: "Fulfillment",
  },
  {
    id: "message",
    number: 2,
    label: "Card Message",
  },
  {
    id: "payment",
    number: 3,
    label: "Payment",
  },
];

export default function BloomWebsiteCheckoutSteps({
  currentStep,
}: BloomWebsiteCheckoutStepsProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);

  return (
    <div className="mb-7 sm:mb-8">
      <div className="grid grid-cols-3 items-start">
        {STEPS.map((step, index) => {
          const isComplete = index < currentIndex;

          const isCurrent = step.id === currentStep;

          return (
            <div
              key={step.id}
              className="relative flex flex-col items-center text-center"
            >
              {index < STEPS.length - 1 && (
                <div
                  className="absolute left-1/2 top-4 h-px w-full"
                  style={{
                    backgroundColor: isComplete
                      ? "var(--bloom-accent)"
                      : "#e5e7eb",

                    opacity: isComplete ? 0.35 : 1,
                  }}
                />
              )}

              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                  !isComplete && !isCurrent
                    ? "border border-gray-200 bg-white text-gray-400"
                    : ""
                }`}
                style={
                  isCurrent
                    ? {
                        backgroundColor: "var(--bloom-primary)",

                        color: "var(--bloom-primary-foreground)",
                      }
                    : isComplete
                      ? {
                          backgroundColor: "var(--bloom-accent)",

                          color: "var(--bloom-accent-foreground)",
                        }
                      : undefined
                }
              >
                {isComplete ? <Check size={16} strokeWidth={3} /> : step.number}
              </div>

              <span
                className={`mt-2 text-[11px] font-black sm:text-xs ${
                  !isComplete && !isCurrent ? "text-gray-400" : ""
                }`}
                style={
                  isCurrent
                    ? {
                        color: "var(--bloom-primary)",
                      }
                    : isComplete
                      ? {
                          color: "var(--bloom-accent)",
                        }
                      : undefined
                }
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
