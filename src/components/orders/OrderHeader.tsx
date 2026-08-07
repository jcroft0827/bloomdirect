import {
  getOrderStatusBadgeClass,
  getOrderStatusLabel,
  OrderStatus,
} from "@/lib/order-status";

type Props = {
  orderNumber: string;
  status: OrderStatus;
  role: "originating" | "fulfilling";
};

export default function OrderHeader({ orderNumber, status, role }: Props) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-black text-gray-900 md:text-4xl">
          Order #{orderNumber}
        </h1>

        <span
          className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-bold ${getOrderStatusBadgeClass(
            status,
          )}`}
        >
          {getOrderStatusLabel(status)}
        </span>
      </div>

      <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-600">
        <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />

        You are viewing this order as the{" "}

        <span className="font-semibold text-gray-900">
          {role === "originating"
            ? "originating shop"
            : "fulfilling shop"}
        </span>
      </div>
    </header>
  );
}