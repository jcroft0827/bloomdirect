import { OrderStatus } from "@/lib/order-status";

type Props = {
  orderNumber: string;
  status: OrderStatus;
  role: "originating" | "fulfilling";
};

const statusStyles: Partial<Record<OrderStatus, string>> = {
  PENDING_ACCEPTANCE: "bg-yellow-100 text-yellow-800",
  ACCEPTED_AWAITING_PAYMENT: "bg-blue-100 text-blue-800",
  PAID_AWAITING_FULFILLMENT: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
};

const statusLabels: Partial<Record<OrderStatus, string>> = {
  PENDING_ACCEPTANCE: "Pending Acceptance",
  ACCEPTED_AWAITING_PAYMENT: "Accepted — Awaiting Payment",
  PAID_AWAITING_FULFILLMENT: "Paid — In Fulfillment",
  COMPLETED: "Completed",
};

export default function OrderHeader({ orderNumber, status, role }: Props) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900">
          Order #{orderNumber}
        </h1>

        <span
          className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
            statusStyles[status] ?? "bg-gray-100 text-gray-700"
          }`}
        >
          {statusLabels[status] ?? status.replaceAll("_", " ")}
        </span>
      </div>

      <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-600">
        <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
        You are viewing this order as the{" "}
        <span className="font-semibold text-gray-900">
          {role === "originating" ? "originating shop" : "fulfilling shop"}
        </span>
      </div>
    </header>
  );
}
