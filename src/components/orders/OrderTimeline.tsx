import { OrderStatus } from "@/lib/order-status";

type Props = {
  status: OrderStatus;
};

const steps = [
  {
    key: "pending",
    label: "Pending",
  },
  {
    key: "accepted",
    label: "Accepted",
  },
  {
    key: "completed",
    label: "Delivered",
  },
] as const;

function getActiveStepIndex(status: OrderStatus): number {
  switch (status) {
    case OrderStatus.PENDING_ACCEPTANCE:
      return 0;

    case OrderStatus.ACCEPTED:
    case OrderStatus.ACCEPTED_AWAITING_PAYMENT:
    case OrderStatus.PAID_AWAITING_FULFILLMENT:
      return 1;

    case OrderStatus.COMPLETED:
      return 2;

    case OrderStatus.DECLINED:
    case OrderStatus.OUTSIDE_NETWORK:
    default:
      return -1;
  }
}

export default function OrderTimeline({ status }: Props) {
  const activeIndex = getActiveStepIndex(status);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-0">
        {steps.map((step, index) => {
          const isComplete = activeIndex >= 0 && index <= activeIndex;
          const connectorComplete =
            activeIndex >= 0 && index < activeIndex;

          return (
            <div
              key={step.key}
              className="flex items-center gap-4 md:flex-1 md:flex-col md:gap-2"
            >
              <div
                className={`h-6 w-6 rounded-full border-4 transition ${
                  isComplete
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-gray-300 bg-white"
                }`}
              />

              <span
                className={`text-center text-sm font-semibold ${
                  isComplete ? "text-emerald-700" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>

              {index < steps.length - 1 && (
                <div className="mt-4 hidden h-1 w-full bg-gray-200 md:block">
                  <div
                    className={`h-full transition-all ${
                      connectorComplete
                        ? "w-full bg-emerald-500"
                        : "w-0"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}