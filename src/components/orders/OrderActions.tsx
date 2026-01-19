"use client";

import { useState } from "react";
import { OrderStatus } from "@/lib/order-status";
import DeclineOrderModal from "./DeclineOrderModal";
import type { DeclineReason } from "@/lib/decline-reasons";

type Props = {
  role: "originating" | "fulfilling";
  status: OrderStatus;
  onAccept?: () => void;
  onDecline?: (data: {
    reason: DeclineReason;
    message?: string;
  }) => void;
  onMarkPaid?: (method: "venmo" | "cashapp" | "zelle" | "other") => void;
  onDelivered?: () => void;
};

export default function OrderActions({
  role,
  status,
  onAccept,
  onDecline,
  onMarkPaid,
  onDelivered,
}: Props) {
  const [showDecline, setShowDecline] = useState(false);

  return (
    <>
      <section className="bg-white rounded-2xl shadow-md p-6 space-y-4">
        {/* FULFILLING SHOP */}
        {role === "fulfilling" &&
          status === OrderStatus.PENDING_ACCEPTANCE && (
            <div className="space-y-4">
              <button
                onClick={onAccept}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl"
              >
                Accept Order
              </button>

              <button
                onClick={() => setShowDecline(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl"
              >
                Decline Order
              </button>
            </div>
          )}

        {role === "fulfilling" &&
          status === OrderStatus.PAID_AWAITING_FULFILLMENT && (
            <button
              onClick={onDelivered}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl"
            >
              Mark as Delivered
            </button>
          )}

        {/* ORIGINATING SHOP */}
        {role === "originating" &&
          status === OrderStatus.ACCEPTED_AWAITING_PAYMENT && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["venmo", "cashapp", "zelle", "other"].map((method) => (
                <button
                  key={method}
                  onClick={() =>
                    onMarkPaid?.(
                      method as "venmo" | "cashapp" | "zelle" | "other"
                    )
                  }
                  className="bg-gray-100 hover:bg-gray-200 font-semibold py-3 rounded-xl"
                >
                  {method.toUpperCase()}
                </button>
              ))}
            </div>
          )}

        {status === OrderStatus.COMPLETED && (
          <p className="text-center font-semibold text-green-700">
            Order completed 🎉
          </p>
        )}
      </section>

      <DeclineOrderModal
        open={showDecline}
        onClose={() => setShowDecline(false)}
        onConfirm={(data) => {
          setShowDecline(false);
          onDecline?.(data);
        }}
      />
    </>
  );
}





// "use client";

// import { OrderStatus } from "@/lib/order-status";

// type PaymentMethod = "venmo" | "cashapp" | "zelle" | "other";

// type Props = {
//   order: {
//     _id: string;
//     status: OrderStatus;
//   };
//   viewerRole: "originating" | "fulfilling";
// };

// export default function OrderActions({ order, viewerRole }: Props) {
//   const isPending = order.status === OrderStatus.PENDING_ACCEPTANCE;
//   const isAwaitingPayment =
//     order.status === OrderStatus.ACCEPTED_AWAITING_PAYMENT;
//   const isPaid =
//     order.status === OrderStatus.PAID_AWAITING_FULFILLMENT;

//   async function updateStatus(status: OrderStatus) {
//     await fetch("/api/orders/status", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ orderId: order._id, status }),
//     });

//     window.location.reload();
//   }

//   async function markPaid(method: PaymentMethod) {
//     await fetch("/api/orders/payment", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         orderId: order._id,
//         paymentMethod: method,
//       }),
//     });

//     window.location.reload();
//   }

//   // Hide entire section if no valid actions
//   if (
//     (viewerRole === "fulfilling" && !isPending && !isPaid) ||
//     (viewerRole === "originating" && !isAwaitingPayment)
//   ) {
//     return null;
//   }

//   return (
//     <section className="bg-white rounded-2xl shadow-md p-6 space-y-4">
//       {/* FULFILLING SHOP */}
//       {viewerRole === "fulfilling" && isPending && (
//         <div className="space-y-4">
//           <button
//             onClick={() =>
//               updateStatus(OrderStatus.ACCEPTED_AWAITING_PAYMENT)
//             }
//             className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl"
//           >
//             Accept Order
//           </button>

//           <button
//             onClick={() => updateStatus(OrderStatus.DECLINED)}
//             className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl"
//           >
//             Decline Order
//           </button>
//         </div>
//       )}

//       {viewerRole === "fulfilling" && isPaid && (
//         <button
//           onClick={() => updateStatus(OrderStatus.COMPLETED)}
//           className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl"
//         >
//           Mark as Delivered
//         </button>
//       )}

//       {/* ORIGINATING SHOP */}
//       {viewerRole === "originating" && isAwaitingPayment && (
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//           {["venmo", "cashapp", "zelle", "other"].map((method) => (
//             <button
//               key={method}
//               onClick={() => markPaid(method as PaymentMethod)}
//               className="bg-gray-100 hover:bg-gray-200 font-semibold py-3 rounded-xl"
//             >
//               {method.toUpperCase()}
//             </button>
//           ))}
//         </div>
//       )}

//       {order.status === OrderStatus.COMPLETED && (
//         <p className="text-center font-semibold text-green-700">
//           Order completed 🎉
//         </p>
//       )}
//     </section>
//   );
// }
