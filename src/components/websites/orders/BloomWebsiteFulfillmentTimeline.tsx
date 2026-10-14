import { Check, Circle, Truck, TriangleAlert } from "lucide-react";

import {
  getBloomWebsiteOrderStatusLabel,
  type BloomWebsiteOrderStatus,
} from "@/lib/bloom-websites/orders/fulfillment-status";

const DELIVERY_STEPS: BloomWebsiteOrderStatus[] = [
  "placed",
  "in_preparation",
  "preparation_complete",
  "out_for_delivery",
  "fulfilled",
];

const PICKUP_STEPS: BloomWebsiteOrderStatus[] = [
  "placed",
  "in_preparation",
  "ready_for_pickup",
  "fulfilled",
];

export default function BloomWebsiteFulfillmentTimeline({
  status,
  fulfillmentType,
}: {
  status: BloomWebsiteOrderStatus;
  fulfillmentType: "delivery" | "pickup";
}) {
  if (status === "canceled") {
    return (
      <section className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3 text-red-900">
          <TriangleAlert size={20} />
          <div>
            <p className="font-black">Order canceled</p>
            <p className="mt-1 text-sm text-red-700">
              This order is no longer active in the fulfillment workflow.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const steps = fulfillmentType === "pickup" ? PICKUP_STEPS : DELIVERY_STEPS;
  const currentStatus = status === "confirmed" ? "placed" : status;
  const currentIndex = steps.indexOf(currentStatus);
  const attempted = status === "delivery_attempted";

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-700">
            Fulfillment
          </p>
          <h2 className="mt-1 text-lg font-black text-gray-950">
            {getBloomWebsiteOrderStatusLabel(status, fulfillmentType)}
          </h2>
        </div>
        {attempted && (
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-black text-orange-800">
            <Truck size={14} />
            Delivery needs attention
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, index) => {
          const complete = status === "fulfilled" || (!attempted && currentIndex >= index);
          const current = !attempted && currentIndex === index;
          return (
            <div
              key={step}
              className={`rounded-2xl border p-3 ${
                current
                  ? "border-purple-300 bg-purple-50"
                  : complete
                    ? "border-emerald-200 bg-emerald-50/70"
                    : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    complete
                      ? "bg-emerald-600 text-white"
                      : current
                        ? "bg-purple-700 text-white"
                        : "bg-white text-gray-400"
                  }`}
                >
                  {complete ? <Check size={15} /> : <Circle size={13} />}
                </span>
                <span className="text-sm font-black text-gray-900">
                  {getBloomWebsiteOrderStatusLabel(step, fulfillmentType)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {attempted && (
        <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-900">
          Delivery was attempted but not completed. You can retry delivery, mark the order delivered later, or cancel it if necessary.
        </div>
      )}
    </section>
  );
}
