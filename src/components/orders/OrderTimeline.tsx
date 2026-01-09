import { OrderStatus } from "@/lib/order-status";

type Props = {
  status: OrderStatus;
};

const steps = [
  {
    key: OrderStatus.PENDING_ACCEPTANCE,
    label: "Pending",
  },
  {
    key: OrderStatus.ACCEPTED_AWAITING_PAYMENT,
    label: "Accepted",
  },
  {
    key: OrderStatus.PAID_AWAITING_FULFILLMENT,
    label: "Paid",
  },
  {
    key: OrderStatus.COMPLETED,
    label: "Delivered",
  },
];

export default function OrderTimeline({ status }: Props) {
  const activeIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-0">
        {steps.map((step, index) => {
          const isComplete = index <= activeIndex;

          return (
            <div
              key={step.key}
              className="flex md:flex-1 items-center md:flex-col gap-4 md:gap-2"
            >
              {/* Dot */}
              <div
                className={`w-6 h-6 rounded-full border-4 transition ${
                  isComplete
                    ? "bg-emerald-500 border-emerald-500"
                    : "bg-white border-gray-300"
                }`}
              />

              {/* Label */}
              <span
                className={`text-sm font-semibold text-center ${
                  isComplete ? "text-emerald-700" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>

              {/* Connector */}
              {index < steps.length - 1 && (
                <div className="hidden md:block h-1 w-full bg-gray-200 mt-4">
                  <div
                    className={`h-full transition-all ${
                      isComplete ? "bg-emerald-500 w-full" : "w-0"
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
