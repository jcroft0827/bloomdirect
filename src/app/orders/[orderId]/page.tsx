// app/orders/[orderId]/page.tsx
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import type { OrderLean } from "@/types/order";
import { OrderStatus } from "@/lib/order-status";

import Image from "next/image";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderPage({ params }: PageProps) {
  const { orderId } = await params;

  await connectToDB();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) notFound();

  const order = (await Order.findById(orderId).lean()) as OrderLean | null;
  if (!order) notFound();

  const userShopId = session.user.id;

  const role =
    order.originatingShop.toString() === userShopId
      ? "ORIGINATING"
      : order.fulfillingShop.toString() === userShopId
      ? "FULFILLING"
      : null;

  if (!role) notFound();

  const isFulfilling = role === "FULFILLING";
  const isOriginating = role === "ORIGINATING";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* HEADER */}
        <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col gap-4">
          <h1 className="text-5xl font-black text-purple-600">
            Order #{order.orderNumber}
          </h1>

          <h2 className="text-sm font-mono text-gray-500">
            Order ID: {order._id.toString()}
          </h2>

          <div className="flex flex-wrap items-center gap-4">
            <span className="px-4 py-2 rounded-full text-sm font-bold bg-purple-100 text-purple-700">
              Status: {order.status.replaceAll("_", " ")}
            </span>

            <span className="px-4 py-2 rounded-full text-sm font-bold bg-gray-100 text-gray-700">
              You are the {role.toLowerCase()} shop
            </span>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT – PRODUCT */}
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
            {order.productPhoto ? (
              <Image
                src={order.productPhoto}
                alt="Product"
                width={500}
                height={500}
                className="rounded-2xl object-cover"
              />
            ) : (
              <div className="h-64 bg-gray-200 rounded-2xl flex items-center justify-center">
                <span className="text-gray-500">No photo</span>
              </div>
            )}

            <div className="text-center">
              <p className="text-4xl font-black text-emerald-600">
                ${order.fulfillingShopGets?.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">You earn</p>
            </div>
          </div>

          {/* MIDDLE – DETAILS */}
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
            <div>
              <p className="font-bold text-purple-700">Delivery Date</p>
              <p className="text-2xl font-black">
                {new Date(order.deliveryDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <div>
              <p className="font-bold text-purple-700">Recipient</p>
              <p className="font-semibold">
                {order.recipient.firstName} {order.recipient.lastName}
              </p>
              <p>
                {order.recipient.address}
                <br />
                {order.recipient.city}, {order.recipient.state}{" "}
                {order.recipient.zip}
              </p>
              <p>Phone: {order.recipient.phone}</p>
            </div>

            <div>
              <p className="font-bold text-purple-700">Card Message</p>
              <p className="italic bg-gray-50 p-4 rounded-xl">
                “{order.recipient.message || "No message"}”
              </p>
            </div>

            {order.specialInstructions && (
              <div className="bg-yellow-50 border-4 border-yellow-400 rounded-2xl p-4">
                <p className="font-bold text-yellow-900">
                  Special Instructions
                </p>
                <p>{order.specialInstructions}</p>
              </div>
            )}
          </div>

          {/* RIGHT – ACTIONS */}
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4">
            {/* ACCEPT / DECLINE */}
            {isFulfilling &&
              order.status === OrderStatus.PENDING_ACCEPTANCE && (
                <>
                  <form action="/api/orders/status" method="POST">
                    <input type="hidden" name="orderId" value={order._id.toString()} />
                    <input
                      type="hidden"
                      name="status"
                      value={OrderStatus.ACCEPTED_AWAITING_PAYMENT}
                    />
                    <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl py-4 rounded-2xl">
                      Accept Order
                    </button>
                  </form>

                  <form action="/api/orders/status" method="POST">
                    <input type="hidden" name="orderId" value={order._id.toString()} />
                    <input
                      type="hidden"
                      name="status"
                      value={OrderStatus.DECLINED}
                    />
                    <button className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xl py-4 rounded-2xl">
                      Decline Order
                    </button>
                  </form>
                </>
              )}

            {/* MARK PAID */}
            {isOriginating &&
              order.status === OrderStatus.ACCEPTED_AWAITING_PAYMENT && (
                <div className="space-y-2">
                  <p className="font-bold text-gray-700">Mark as Paid</p>

                  {["venmo", "cashapp", "zelle", "other"].map((method) => (
                    <form
                      key={method}
                      action="/api/orders/payment"
                      method="POST"
                    >
                      <input
                        type="hidden"
                        name="orderId"
                        value={order._id.toString()}
                      />
                      <input
                        type="hidden"
                        name="paymentMethod"
                        value={method}
                      />
                      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl">
                        Paid via {method.toUpperCase()}
                      </button>
                    </form>
                  ))}
                </div>
              )}

            {/* MARK DELIVERED */}
            {isFulfilling &&
              order.status === OrderStatus.PAID_AWAITING_FULFILLMENT && (
                <form action="/api/orders/status" method="POST">
                  <input type="hidden" name="orderId" value={order._id.toString()} />
                  <input
                    type="hidden"
                    name="status"
                    value={OrderStatus.COMPLETED}
                  />
                  <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl py-4 rounded-2xl">
                    Mark as Delivered
                  </button>
                </form>
              )}

            {/* FALLBACK */}
            <div className="text-center text-gray-500 text-sm pt-4">
              No actions available for this status
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




// // app/orders/[orderId]/page.tsx
// import { notFound } from "next/navigation";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { connectToDB } from "@/lib/mongoose";
// import Order from "@/models/Order";
// import type { OrderLean } from "@/types/order";

// type PageProps = {
//   params: Promise<{
//     orderId: string;
//   }>;
// };

// export default async function OrderPage({ params }: PageProps) {
//   const { orderId } = await params;

//   await connectToDB();

//   const session = await getServerSession(authOptions);
//   if (!session?.user?.id) {
//     notFound();
//   }

//   const order = JSON.parse(
//     JSON.stringify(await Order.findById(orderId).lean())
//   ) as OrderLean | null;
//   // const order = (await Order.findById(orderId).lean()) as OrderLean | null;

//   if (!order) {
//     notFound();
//   }

//   const userShopId = session.user.id;

//   const role =
//     order.originatingShop.toString() === userShopId
//       ? "originating"
//       : order.fulfillingShop.toString() === userShopId
//       ? "fulfilling"
//       : null;

//   if (!role) {
//     notFound();
//   }

//   return (
//     <div className="max-w-6xl mx-auto py-12 px-4">
//       <h1 className="text-4xl font-black mb-4">Order #{order.orderNumber}</h1>

//       <p className="text-gray-600 mb-8">
//         You are viewing this order as the <strong>{role}</strong> shop
//       </p>

//       <h2>
//         Order ID: {order._id}
//       </h2>

//       {/* These will become components */}
//       <pre className="bg-gray-100 p-6 rounded-xl text-sm overflow-auto">
//         {JSON.stringify(order, null, 2)}
//       </pre>
//     </div>
//   );
// }
