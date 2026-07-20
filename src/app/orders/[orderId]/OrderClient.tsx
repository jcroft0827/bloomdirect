// app/orders/[orderId]/OrderClient.tsx

"use client";

import toast, { Toaster } from "react-hot-toast";
import type { OrderLean } from "@/types/order";
import Link from "next/link";
import { OrderStatus } from "@/lib/order-status";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BloomSpinner from "@/components/BloomSpinner";
import Shop from "@/models/Shop";
import { formatCurrencyFromCents } from "@/lib/format-currency";
import StarRating from "@/components/ui/StarRating";
import { sendInvite } from "@/lib/client/sendInvite";
import DeclineOrderModal from "@/components/orders/DeclineOrderModal";
import type { DeclineReason } from "@/lib/decline-reasons";

interface OrderClientProps {
  order: OrderLean;
  isFulfilling: boolean;
  isOriginating: boolean;
}

interface Shop {
  _id: string;
  businessName: string;
}

export default function OrderClient({
  order,
  isFulfilling,
  isOriginating,
}: OrderClientProps) {
  const router = useRouter();
  const role = isOriginating ? "ORIGINATING" : "FULFILLING";
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [decliningOrder, setDecliningOrder] = useState(false);
  const [handlingStatus, setHandlingStatus] = useState(false);
  const [availableShops, setAvailableShops] = useState<Shop[]>([]);
  const [reassignShop, setReassignShop] = useState("");
  const [understand, setUnderstand] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState(
    "Order was fulfilled correctly and on time.",
  );
  const [reviewSet, setReviewSet] = useState(false);
  const [leavingReview, setLeavingReview] = useState(false);
  const [emailOrderOpen, setEmailOrderOpen] = useState(false);
  const [emailToUse, setEmailToUse] = useState(
    order.outsideFlorist?.email || "",
  );
  const [emailingOrder, setEmailingOrder] = useState(false);
  const [emailingInvite, setEmailingInvite] = useState(false);
  const [emailInviteOpen, setEmailInviteOpen] = useState(false);

  useEffect(() => {
    if (!order) return;
    if (order.status === "DECLINED") {
      searchShops();
    }
  }, [order.status]);

  const handleMarkPaid = async (
    orderId: string,
    method: "venmo" | "cashapp" | "zelle" | "paypal",
  ) => {
    if (actionOrderId === orderId) return;

    try {
      setActionOrderId(orderId);

      const res = await fetch("/api/orders/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentMethodUsed: method }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Order marked as paid via ${method.toUpperCase()}!`);
        router.refresh();
      } else {
        toast.error(data.error || "Failed to mark order as paid");
      }
    } catch (err) {
      console.error("Failed to mark order as paid", err);
      toast.error(
        "Failed to mark order as paid. Please try again. If the problem persists, contact GetBloomDirect support.",
      );
    } finally {
      setActionOrderId(null);
    }
  };

  const formatTimeString = (timeStr: any) => {
    if (!timeStr || typeof timeStr !== "string") return "";

    // Split the hours and minutes
    let [hours, minutes] = timeStr.split(":").map(Number);

    const ampm = hours >= 12 ? "PM" : "AM";

    // Convert 24h to 12h
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'

    // Ensure minutes always have two digits (e.g., :05 instead of :5)
    const strMinutes = minutes < 10 ? "0" + minutes : minutes;

    return `${hours}:${strMinutes} ${ampm}`;
  };

  const handleStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (actionOrderId === orderId) return; // Prevent duplicate actions

    try {
      setActionOrderId(orderId);
      setHandlingStatus(true);

      const res = await fetch("/api/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      setActionOrderId(null);

      if (res.ok) {
        toast.success(`Order updated: ${newStatus.replaceAll("_", " ")}`);
        router.refresh();
      } else {
        setHandlingStatus(false);
        const error = await res.json();
        toast.error(error.error || "Failed to update order");
      }
    } catch (error) {
      setHandlingStatus(false);
      console.error("Failed to update order", error);
      toast.error(
        "Failed to update order. Please try again. If the problem persists, contact GetBloomDirect support.",
      );
    } finally {
      setHandlingStatus(false);
    }
  };

  const handleDeclineOrder = async ({
    reason,
    message,
  }: {
    reason: DeclineReason;
    message?: string;
  }) => {
    if (decliningOrder || actionOrderId === order._id) return;

    try {
      setDecliningOrder(true);
      setActionOrderId(order._id);

      const res = await fetch("/api/orders/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order._id,
          status: OrderStatus.DECLINED,
          declineReason: reason,
          declineMessage: message,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to decline order.");
      }

      setShowDeclineModal(false);
      toast.success("Order declined.");
      router.refresh();
    } catch (error) {
      console.error("Failed to decline order:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to decline order. Please try again.",
      );
    } finally {
      setDecliningOrder(false);
      setActionOrderId(null);
    }
  };

  const searchShops = async () => {
    try {
      setHandlingStatus(true);

      const excludedIds = (order.activityLog ?? [])
        .map((log: any) => log.actorShop)
        .filter((id: string | null | undefined) => id != null);

      const res = await fetch("/api/shops/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: order.recipient.address,
          city: order.recipient.city,
          state: order.recipient.state,
          zip: order.recipient.zip,
          delDate: order.logistics.deliveryDate,
          delTimeOpt: order.logistics.deliveryTimeOption,
          delTimeFrom: order.logistics.deliveryTimeFrom,
          delTimeTo: order.logistics.deliveryTimeTo,
          currentShopId: order.originatingShop,
          excludedShopIds: excludedIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Search failed");

      const filteredShops = (data || []).filter(
        (shop: any) => shop.businessName != order.fulfillingShopName,
      );

      setAvailableShops(filteredShops);

      if (!filteredShops || filteredShops.length === 0) {
        toast.error("No GetBloomDirect shops in that area yet — invite them!");
      }
    } catch (error) {
      console.error("Error finding shops", error);
      toast.error(
        "Error finding shops. Please try again. If the problem persists, contact GetBloomDirect support.",
      );
    } finally {
      setHandlingStatus(false);
    }
  };

  const handleReassign = async (orderId: string, newShopId: string) => {
    try {
      setHandlingStatus(true);

      const res = await fetch("/api/orders/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, newFulfillingShopId: newShopId }),
      });

      if (res.ok) {
        toast.success("Order updated");
        router.refresh();
      } else {
        setHandlingStatus(false);
        const error = await res.json();
        toast.error(error.error || "Failed to update order");
      }
    } catch (error) {
      setHandlingStatus(false);
      console.error("Failed to update order", error);
      toast.error(
        "Failed to update order. Please try again. If the problem persists, contact GetBloomDirect support.",
      );
    }
  };

  async function handleSubmitReview() {
    if (!order?._id) return;

    try {
      const res = await fetch(`/api/orders/${order._id}/reviews/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          comment: reviewComment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      setReviewSet(true);
      setRating(0);
      setReviewComment("");
    } catch (error) {
      toast.error("Error submitting review!");
      console.error("Error submitting review: ", error);
    }
  }

  const handleEmailOrder = async () => {
    try {
      const emailToUseFinal = emailToUse.trim();

      if (!emailToUseFinal.trim()) {
        toast.error("Enter the florist email address first.");
        return;
      }

      if (order.fulfillmentType !== "outside_network") {
        toast.error("Only outside-network orders can be emailed from here.");
        return;
      }

      setEmailingOrder(true);

      const productTotal = order.products.reduce((sum, item) => {
        return sum + (Number(item.priceCents) || 0) * (Number(item.qty) || 1);
      }, 0);

      const res = await fetch("/api/orders/outside-network/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toEmail: emailToUseFinal,

          outsideFlorist: {
            name: order.outsideFlorist?.name || order.fulfillingShopName || "",
            phone: order.outsideFlorist?.phone || "",
            email: emailToUseFinal,
            address: order.outsideFlorist?.address || "",
            googlePlaceId: order.outsideFlorist?.googlePlaceId || "",
          },

          recipient: {
            firstName: order.recipient.firstName || "",
            lastName: order.recipient.lastName || "",
            fullName:
              order.recipient.fullName ||
              `${order.recipient.firstName || ""} ${order.recipient.lastName || ""}`.trim(),
            address: order.recipient.address,
            apt: order.recipient.apt || "",
            city: order.recipient.city,
            state: order.recipient.state,
            zip: order.recipient.zip,
            phone: order.recipient.phone || "",
            email: order.recipient.email || "",
            company: order.recipient.company || "",
            message: order.recipient.message || "",
          },

          customer: {
            firstName: order.customer?.firstName || "",
            lastName: order.customer?.lastName || "",
            fullName:
              order.customer?.fullName ||
              `${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim(),
            email: order.customer?.email || "",
            phone: order.customer?.phone || "",
          },

          logistics: {
            deliveryDate: order.logistics.deliveryDate,
            deliveryTimeOption: order.logistics.deliveryTimeOption,
            deliveryTimeFrom:
              order.logistics.deliveryTimeOption === "specific"
                ? order.logistics.deliveryTimeFrom || null
                : null,
            deliveryTimeTo:
              order.logistics.deliveryTimeOption === "specific"
                ? order.logistics.deliveryTimeTo || null
                : null,
            specialInstructions: order.logistics.specialInstructions || "",
          },

          manualOrder: {
            contactPerson: order.outsideFlorist?.contactPerson || "",
            items: order.products.map((item) => ({
              name: item.name,
              description: item.description || "",
              qty: Number(item.qty) || 1,
              price: (Number(item.priceCents) || 0) / 100,
              lineTotal:
                ((Number(item.priceCents) || 0) * (Number(item.qty) || 1)) /
                100,
              taxable: item.taxable !== false,
            })),
            productTotal: productTotal / 100,
            deliveryFee: (Number(order.pricing.deliveryFeeCents) || 0) / 100,
            taxAmount: (Number(order.pricing.taxCents) || 0) / 100,
            taxPercent: 0,
            orderTotal: (Number(order.pricing.orderTotalCents) || 0) / 100,
            sendingShopFee:
              (Number(order.pricing.originatingShopKeepsCents) || 0) / 100,
            fulfillingShopGets:
              (Number(order.pricing.fulfillingShopGetsCents) || 0) / 100,
          },

          cardMessage: order.recipient.message || "",
          manualNotes: order.outsideFlorist?.notes || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to email order.");
      }

      try {
        const updateRes = await fetch(
          "/api/orders/outside-network/update-email",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order._id,
              email: emailToUseFinal,
            }),
          },
        );

        if (!updateRes.ok) {
          const updateData = await updateRes.json();
          console.warn(
            "Email sent, but failed to save email:",
            updateData.error,
          );
        }
      } catch (updateError) {
        toast.error(
          "Email set successfully, but failed to save email to order.",
        );
        console.warn("Email sent, but failed to save email:", updateError);
      }

      setEmailOrderOpen(false);
      toast.success("Order email sent successfully.");
    } catch (error: any) {
      console.error("EMAIL OUTSIDE NETWORK ORDER ERROR:", error);
      toast.error(error.message || "Failed to email order.");
    } finally {
      setEmailingOrder(false);
    }
  };

  const handleInviteFlorist = async () => {
    try {
      if (!order.outsideFlorist?.email) {
        toast("Please add the florist email first.");
        return;
      }

      setEmailingInvite(true);

      await sendInvite({
        to: order.outsideFlorist?.email,
        businessName: order.originatingShopName,
        personalMessage:
          "We recently worked with your shop and wanted to invite you to join GetBloomDirect.",
      });

      setEmailingInvite(false);
      setEmailInviteOpen(false);
      toast.success("Invitation sent successfully.");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to send invitation.");
    } finally {
      setEmailInviteOpen(false);
      setEmailingInvite(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-6 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Back To Orders Button */}
          <Link
            href={"/dashboard/incoming"}
            className="px-6 py-2 rounded-xl bg-gray-400 text-white flex text-lg items-center w-full justify-center font-semibold hover:bg-gray-500 transition-all border-0  md:max-w-72"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.0"
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            Back To Orders
          </Link>

          {/* HEADER */}
          <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col gap-4 text-center">
            <h1 className="text-xl font-black text-purple-600">
              Order #{order.orderNumber}
            </h1>

            {/* <h2 className="text-sm font-mono text-gray-500">
              Order ID: {order._id.toString()}
            </h2> */}

            <div className="flex flex-wrap items-center gap-4 justify-center">
              <span>
                {order.status === OrderStatus.DECLINED ? (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-700">
                    DECLINED
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    {order.status.replaceAll("_", " ")}
                  </span>
                )}
              </span>

              {order.status === OrderStatus.DECLINED &&
                role === "ORIGINATING" && (
                  <p className="mt-1 text-sm text-red-600">
                    Reason:{" "}
                    {order.declineReason?.replaceAll("_", " ") ||
                      "Not specified"}
                  </p>
                )}

              <span className="px-4 py-2 rounded-full text-sm font-bold bg-gray-100 text-gray-700">
                You are the {role.toLowerCase()} shop
              </span>
            </div>
          </div>

          {/* Outside Network Banner */}
          {order.fulfillmentType === "outside_network" && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-center">
              <p className="font-bold text-amber-800">
                Outside-Network Reference Order
              </p>

              <p className="text-sm text-amber-700 mt-1">
                This florist is not currently part of GetBloomDirect. This order
                was saved for reference and manual fulfillment.
              </p>
            </div>
          )}

          {/* STATUS TIMELINE */}
          {order.fulfillmentType !== "outside_network" && (
            <div className="bg-white rounded-3xl shadow-xl p-6 grid grid-cols-2 md:flex md:flex-row justify-between gap-6">
              {[
                { label: "Sent", done: true },
                { label: "Accepted", done: !!order.acceptedAt },
                { label: "Paid", done: !!order.paidAt },
                { label: "Delivered", done: !!order.completedAt },
              ].map((step, i) => (
                <div key={i} className="flex-1 text-center">
                  <div
                    className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center font-black ${
                      step.done
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <p
                    className={`mt-2 text-sm font-semibold ${
                      step.done ? "text-gray-900" : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* MAIN CONTENT */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* LEFT – Order Details + Products */}
            {order.fulfillmentType !== "outside_network" ? (
              <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
                <div className="text-center">
                  {/* Role */}
                  {role === "FULFILLING" ? (
                    <p className="text-lg text-gray-600 font-semibold">
                      From:{" "}
                      <span className="text-purple-600 font-bold text-xl">
                        {order.originatingShopName}
                      </span>
                    </p>
                  ) : (
                    <p className="text-lg text-gray-600 font-semibold">
                      To:{" "}
                      <span className="text-purple-600 font-bold text-xl">
                        {order.fulfillingShopName}
                      </span>
                    </p>
                  )}

                  <div className="h-[0.01rem] w-full bg-gray-200 my-4"></div>

                  {/* Fulfilling Shop Gets */}
                  <p className="text-lg text-gray-600 font-semibold">
                    Fulfilling Shop Gets:{" "}
                    <span className="text-emerald-600 font-bold text-xl">
                      {formatCurrencyFromCents(
                        order.pricing.fulfillingShopGetsCents,
                      )}
                    </span>
                  </p>

                  <div className="h-[0.01rem] w-full bg-gray-200 my-4"></div>

                  {/* Delivery Fee */}
                  <p className="text-lg text-gray-600 font-semibold">
                    Delivery Fee:{" "}
                    <span className="text-emerald-600 font-bold text-xl">
                      {formatCurrencyFromCents(order.pricing.deliveryFeeCents)}
                    </span>
                  </p>
                </div>

                <div className="h-[0.01rem] w-full bg-gray-200 my-4"></div>

                {/* Products */}
                <div className="overflow-y-scroll max-h-96">
                  {order.products.map((product: any, index: any) => (
                    <div
                      key={product.id || index}
                      className="mb-2 flex gap-2 p-2 rounded-lg bg-gray-50"
                    >
                      {product.photo ? (
                        <div className="w-24 h-24 border rounded-lg p-1 overflow-hidden">
                          <img
                            src={product.photo}
                            alt={product.name}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="min-w-24 max-h-24 min-h-24 border rounded-lg p-1">
                          No Image
                        </div>
                      )}
                      <div className="flex flex-col w-full">
                        <span className="text-black text-xl font-bold">
                          {product.name}
                        </span>
                        <div className="flex flex-col justify-between">
                          <p>
                            <span className="text-sm font-semibold">
                              Price:
                            </span>{" "}
                            <span className="text-emerald-600 font-semibold">
                              {formatCurrencyFromCents(product.priceCents)}
                            </span>
                          </p>
                          <p>
                            {product.taxable === true ? (
                              <span className="px-2 py-[0.1rem] bg-emerald-600 text-white shadow-md rounded-md">
                                Taxable
                              </span>
                            ) : (
                              <span className="px-2 py-[0.1rem] bg-red-500 text-white shadow-md rounded-md">
                                Not Taxable
                              </span>
                            )}
                          </p>
                        </div>
                        <p>
                          <span className="text-sm font-semibold">QTY:</span>{" "}
                          {product.qty}
                        </p>
                        <p>
                          <span className="text-sm font-semibold">
                            Description:
                          </span>{" "}
                          {product.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
                <div className="text-center">
                  <p className="text-xl text-gray-600 font-semibold">
                    Fulfilling Florist:
                  </p>

                  <p className="text-gray-600 font-semibold">
                    Name:{" "}
                    <span className="text-purple-600 font-bold text-xl">
                      {order.outsideFlorist?.name}
                    </span>
                  </p>

                  {order.outsideFlorist?.phone && (
                    <p className="text-gray-600 font-semibold">
                      Phone:{" "}
                      <span className="text-purple-600 font-bold text-xl">
                        {order.outsideFlorist?.phone}
                      </span>
                    </p>
                  )}

                  {order.outsideFlorist?.email && (
                    <p className="text-gray-600 font-semibold">
                      Email:{" "}
                      <span className="text-purple-600 font-bold text-xl">
                        {order.outsideFlorist?.email}
                      </span>
                    </p>
                  )}

                  {order.outsideFlorist?.address && (
                    <p className="text-gray-600 font-semibold">
                      Address:{" "}
                      <span className="text-purple-600 font-bold text-xl">
                        {order.outsideFlorist?.address}
                      </span>
                    </p>
                  )}

                  {order.outsideFlorist?.contactPerson && (
                    <p className="text-gray-600 font-semibold">
                      Contact:{" "}
                      <span className="text-purple-600 font-bold text-xl">
                        {order.outsideFlorist?.contactPerson}
                      </span>
                    </p>
                  )}

                  {order.outsideFlorist?.notes && (
                    <p className="text-gray-600 font-semibold">
                      Notes:{" "}
                      <span className="text-purple-600 font-bold text-xl">
                        {order.outsideFlorist?.notes}
                      </span>
                    </p>
                  )}

                  <div className="h-[0.01rem] w-full bg-gray-200 my-4"></div>

                  {/* Fulfilling Shop Gets */}
                  <p className="text-lg text-gray-600 font-semibold">
                    Fulfilling Shop Gets:{" "}
                    <span className="text-emerald-600 font-bold text-xl">
                      {formatCurrencyFromCents(
                        order.pricing.fulfillingShopGetsCents,
                      )}
                    </span>
                  </p>

                  <div className="h-[0.01rem] w-full bg-gray-200 my-4"></div>

                  {/* Delivery Fee */}
                  <p className="text-lg text-gray-600 font-semibold">
                    Delivery Fee:{" "}
                    <span className="text-emerald-600 font-bold text-xl">
                      {formatCurrencyFromCents(order.pricing.deliveryFeeCents)}
                    </span>
                  </p>
                </div>

                <div className="h-[0.01rem] w-full bg-gray-200 my-4"></div>

                {/* Products */}
                <div className="overflow-y-scroll max-h-96">
                  {order.products.map((product: any, index: any) => (
                    <div
                      key={product.id || index}
                      className="mb-2 flex gap-2 p-2 rounded-lg bg-gray-50"
                    >
                      {product.photo ? (
                        <div className="w-24 h-24 border rounded-lg p-1 overflow-hidden">
                          <img
                            src={product.photo}
                            alt={product.name}
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="min-w-24 max-h-24 min-h-24 border rounded-lg p-1">
                          No Image
                        </div>
                      )}
                      <div className="flex flex-col w-full">
                        <span className="text-black text-xl font-bold">
                          {product.name}
                        </span>
                        <div className="flex flex-col justify-between">
                          <p>
                            <span className="text-sm font-semibold">
                              Price:
                            </span>{" "}
                            <span className="text-emerald-600 font-semibold">
                              {formatCurrencyFromCents(product.priceCents)}
                            </span>
                          </p>
                          <p>
                            {product.taxable === true ? (
                              <span className="px-2 py-[0.1rem] bg-emerald-600 text-white shadow-md rounded-md">
                                Taxable
                              </span>
                            ) : (
                              <span className="px-2 py-[0.1rem] bg-red-500 text-white shadow-md rounded-md">
                                Not Taxable
                              </span>
                            )}
                          </p>
                        </div>
                        <p>
                          <span className="text-sm font-semibold">QTY:</span>{" "}
                          {product.qty}
                        </p>
                        <p>
                          <span className="text-sm font-semibold">
                            Description:
                          </span>{" "}
                          {product.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MIDDLE – DETAILS */}
            <div className="bg-white rounded-3xl shadow-xl p-4 grid grid-cols-2 gap-4 text-center">
              {/* Delivery Date */}
              <div className="col-span-2">
                <p className="font-bold text-purple-700">Delivery Date</p>
                <p className="text-2xl font-black">
                  {new Date(order.logistics.deliveryDate).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </p>
              </div>
              {/* Delivery Times */}
              <div className="col-span-2">
                <p className="font-bold text-purple-700">Delivery Time</p>
                <p className="text-2xl font-black capitalize">
                  {order.logistics.deliveryTimeOption}
                </p>
                {order.logistics.deliveryTimeOption === "specific" && (
                  <div>
                    <span className="font-semibold text-gray-600 text-sm">
                      From:
                    </span>{" "}
                    <span className="font-bold">
                      {formatTimeString(order.logistics.deliveryTimeFrom)}
                    </span>{" "}
                    <span className="font-semibold text-gray-600 text-sm">
                      - To:
                    </span>{" "}
                    <span className="font-bold">
                      {formatTimeString(order.logistics.deliveryTimeTo)}
                    </span>
                  </div>
                )}
              </div>
              {/* Recipient */}
              <div className="">
                <p className="font-bold text-purple-700">Recipient</p>
                <p className="font-semibold capitalize">
                  {order.recipient.fullName}
                </p>
                <p>
                  {order.recipient.address}
                  <br />
                  {order.recipient.city}, {order.recipient.state}{" "}
                  {order.recipient.zip}
                </p>
                <p>{order.recipient.phone}</p>
                <p>{order.recipient?.email}</p>
                <p>{order.recipient?.company}</p>
              </div>
              {/* Customer */}
              <div className="text-gray-600 text-sm">
                <p className="font-bold text-purple-700 text-base">Customer</p>
                <p>{order.customer?.fullName}</p>
                <p>{order.customer?.email}</p>
                <p>{order.customer?.phone}</p>
              </div>
              {/* Card Message */}
              <div className="col-span-2">
                <p className="text-purple-600 font-bold text-lg">
                  Card Message
                </p>
                <p className="text-black text-sm p-4 rounded-md bg-gray-50">
                  {order.recipient.message || "No message"}
                </p>
              </div>

              {/* DECLINE REASON */}
              {order.status === OrderStatus.DECLINED && isOriginating && (
                <div className="border-4 border-red-500 bg-red-50 rounded-2xl p-5 space-y-2 col-span-2">
                  <p className="font-black text-red-700 text-lg">
                    Order Declined
                  </p>

                  <p className="text-sm text-gray-700">
                    <strong>{order.fulfillingShopName}</strong> declined this
                    order.
                  </p>

                  {order.declineReason && (
                    <p className="text-sm">
                      <span className="font-bold">Reason:</span>{" "}
                      {order.declineReason.replaceAll("_", " ")}
                    </p>
                  )}

                  {order.declineMessage && (
                    <p className="italic bg-white/70 p-3 rounded-xl text-sm">
                      “{order.declineMessage}”
                    </p>
                  )}
                </div>
              )}

              {/* Special Instructions */}
              {order.logistics.specialInstructions && (
                <div className="bg-yellow-50 border-4 border-yellow-400 rounded-2xl p-4 col-span-2">
                  <p className="font-bold text-yellow-900">
                    Special Instructions
                  </p>
                  <p>{order.logistics.specialInstructions}</p>
                </div>
              )}

              {/* Activity Log */}
              {order.activityLog?.length ? (
                <div className="bg-gray-50 border rounded-2xl p-5 space-y-3 col-span-2">
                  <h3 className="font-black text-gray-700">Order Activity</h3>

                  <ul className="space-y-2 text-sm">
                    {order.activityLog
                      .slice()
                      .reverse()
                      .map((log, idx) => (
                        <li key={idx} className="flex justify-between gap-4">
                          <span>{log.message}</span>
                          <span className="text-gray-400">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* RIGHT – ACTIONS */}
            <div className="bg-white rounded-3xl shadow-xl p-6 space-y-4">
              {/* OUTSIDE NETWORK SEND ORDER BUTTON */}
              {order.fulfillmentType === "outside_network" && (
                <div className="flex flex-col gap-4">
                  <button
                    type="button"
                    onClick={() => setEmailOrderOpen(true)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-xl py-4 rounded-2xl transition"
                  >
                    Email Order
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmailInviteOpen(true)}
                    className="w-full bg-purple-100 border border-purple-600 rounded-2xl py-4 text-xl font-black text-purple-700 hover:bg-purple-200 transition"
                  >
                    Invite Florist
                  </button>
                </div>
              )}

              {/* ACCEPT / DECLINE */}
              {isFulfilling &&
                order.status === OrderStatus.PENDING_ACCEPTANCE && (
                  <div className="flex flex-col gap-4">
                    <button
                      type="button"
                      disabled={handlingStatus}
                      onClick={() =>
                        handleStatus(
                          order._id,
                          OrderStatus.ACCEPTED_AWAITING_PAYMENT,
                        )
                      }
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl py-4 rounded-2xl"
                    >
                      Accept Order
                    </button>
                    <button
                      type="button"
                      disabled={decliningOrder || actionOrderId === order._id}
                      onClick={() => setShowDeclineModal(true)}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-black text-xl py-4 rounded-2xl"
                    >
                      {decliningOrder ? (
                        <div className="flex gap-2 items-center justify-center">
                          <span>Declining Order</span>
                          <BloomSpinner size={28} />
                        </div>
                      ) : (
                        "Decline Order"
                      )}
                    </button>
                  </div>
                )}

              {/* MARK PAID */}
              {isOriginating &&
                order.status === OrderStatus.ACCEPTED_AWAITING_PAYMENT && (
                  <div className="space-y-2">
                    <p className="font-bold text-gray-700">Mark as Paid</p>

                    <p className="text-gray-600 font-semibold">
                      Preferred Payment Method:{" "}
                      <span className="text-lg uppercase text-emerald-600">
                        {order.paymentMethods?.default}
                      </span>
                    </p>

                    <div className="flex flex-col gap-2">
                      {(["venmo", "cashapp", "zelle", "paypal"] as const).map(
                        (method) => (
                          <button
                            disabled={handlingStatus}
                            key={method}
                            onClick={() => handleMarkPaid(order._id, method)}
                            className={`
                            w-full text-white font-bold py-3 rounded-xl shadow-lg transition-all
                            ${
                              method === "venmo"
                                ? "bg-blue-500 hover:bg-blue-600"
                                : method === "cashapp"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : method === "zelle"
                                    ? "bg-purple-500 hover:bg-purple-600"
                                    : "bg-gray-500 hover:bg-gray-600"
                            }
                          `}
                          >
                            Paid via {method.toUpperCase()}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}

              {/* MARK DELIVERED */}
              {isFulfilling &&
                order.status === OrderStatus.PAID_AWAITING_FULFILLMENT && (
                  <div>
                    <button
                      type="button"
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black text-xl py-4 rounded-2xl"
                      disabled={handlingStatus}
                      onClick={() =>
                        handleStatus(order._id, OrderStatus.COMPLETED)
                      }
                    >
                      {handlingStatus ? (
                        <div className="flex gap-2 items-center w-full justify-center">
                          <span>Marking as Delivered</span>
                          <span>
                            <BloomSpinner size={28} />
                          </span>
                        </div>
                      ) : (
                        "Mark as Delivered"
                      )}
                    </button>
                  </div>
                )}

              {/* REASSIGN ORDER */}
              {isOriginating && order.status === OrderStatus.DECLINED && (
                <>
                  {availableShops.length > 0 ? (
                    <div className="space-y-4 border-t pt-6">
                      <h3 className="text-lg font-black text-purple-700">
                        Reassign Order
                      </h3>

                      <p className="text-sm text-gray-600">
                        This order was declined. Choose another shop to fulfill
                        it.
                      </p>

                      <p className="text-sm text-gray-500">
                        Once reassigned, the new shop will receive this order
                        and can choose to accept or decline it. You will be
                        notified by email.
                      </p>

                      <p className="text-xs text-red-500 text-center">
                        This action cannot be undone.
                      </p>

                      <select
                        name="newFulfillingShopId"
                        value={reassignShop}
                        required
                        disabled={handlingStatus}
                        onChange={(e) => setReassignShop(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      >
                        <option value="">
                          {handlingStatus
                            ? "Searching for shops..."
                            : "Select a shop..."}
                        </option>
                        {availableShops.map((shop) => (
                          <option key={shop?._id} value={shop?._id}>
                            {shop?.businessName}
                          </option>
                        ))}
                      </select>

                      <label className="flex items-start gap-3 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          required
                          checked={understand}
                          onChange={() => setUnderstand(!understand)}
                          className="mt-1 accent-purple-600"
                        />
                        I understand this order will be sent to a new shop.
                      </label>

                      <button
                        type="button"
                        disabled={
                          !understand || handlingStatus || reassignShop === ""
                        }
                        onClick={() => handleReassign(order._id, reassignShop)}
                        className={
                          (!understand || handlingStatus || reassignShop === ""
                            ? "bg-gray-600"
                            : "bg-purple-600 hover:bg-purple-700") +
                          " w-full text-white font-black py-4 rounded-2xl"
                        }
                      >
                        Reassign Order
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 border-t pt-6">
                      <p className="text-lg mt-4 text-center sm:text-start md:max-w-lg">
                        GetBloomDirect is expanding quickly. We don't currently
                        have another partner florist available to service this
                        order - but we'd love to change that!
                      </p>
                      <Link
                        href={"/dashboard"}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-4 py-2 rounded-2xl shadow-lg mt-5 transition-all"
                      >
                        Invite another florist in that area
                      </Link>
                    </div>
                  )}
                </>
              )}

              {/* LEAVE REVIEW */}
              {isOriginating &&
                order.status === OrderStatus.COMPLETED &&
                !reviewSet && (
                  <div>
                    <p className="font-semibold mb-4">
                      Leave a review to let other shops know how{" "}
                      {order.fulfillingShopName} did.
                    </p>
                    <div>
                      <StarRating value={rating} onChange={setRating} />
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        className="w-full mt-2 p-2 border border-slate-300 rounded-md"
                      />
                      <p className="text-sm text-gray-500 ml-2">
                        Pre-filled review can be edited.
                      </p>
                    </div>

                    <div>
                      <button
                        className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-bold transition-colors"
                        onClick={handleSubmitReview}
                      >
                        Submit Review
                        {leavingReview && (
                          <span className="ml-2">
                            <BloomSpinner />
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

              {/* FALLBACK */}
              {!(
                (isFulfilling &&
                  order.status === OrderStatus.PENDING_ACCEPTANCE) ||
                (isOriginating &&
                  order.status === OrderStatus.ACCEPTED_AWAITING_PAYMENT) ||
                (isFulfilling &&
                  order.status === OrderStatus.PAID_AWAITING_FULFILLMENT) ||
                (isOriginating && order.status === OrderStatus.DECLINED) ||
                (isOriginating && reviewSet === false)
              ) && (
                <div className="text-center text-gray-500 text-sm pt-4">
                  No actions available for this status
                </div>
              )}
            </div>
          </div>
        </div>

        {emailOrderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <h2 className="text-2xl font-black text-purple-700">
                Email Outside-Network Order
              </h2>

              <p className="text-sm text-gray-600">
                Enter the florist's email address to send the order details.
              </p>

              <input
                type="email"
                value={emailToUse}
                onChange={(e) => setEmailToUse(e.target.value)}
                placeholder="florist@example.com"
                className="order-input"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEmailOrderOpen(false)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={emailingOrder}
                  onClick={handleEmailOrder}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl disabled:opacity-60"
                >
                  {emailingOrder ? "Sending..." : "Send Email"}
                </button>
              </div>
            </div>
          </div>
        )}

        {emailInviteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <h2 className="text-2xl font-black text-purple-700">
                Send Email Invite To Florist
              </h2>

              <p className="text-sm text-gray-600">
                Enter the florist's email address to invite this florist.
              </p>

              <input
                type="email"
                value={emailToUse}
                onChange={(e) => setEmailToUse(e.target.value)}
                placeholder="florist@example.com"
                className="order-input"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEmailInviteOpen(false)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={emailingInvite}
                  onClick={handleInviteFlorist}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl disabled:opacity-60"
                >
                  {emailingInvite ? "Sending..." : "Send Email"}
                </button>
              </div>
            </div>
          </div>
        )}

        <DeclineOrderModal
          open={showDeclineModal}
          onClose={() => {
            if (!decliningOrder) {
              setShowDeclineModal(false);
            }
          }}
          onConfirm={handleDeclineOrder}
        />
      </div>
    </>
  );
}
