import { OrderStatus } from "@/lib/order-status";

export function mapOrderForDashboard(order: any) {
  return {
    _id: String(order._id),
    orderNumber: order.orderNumber,

    status: order.status as OrderStatus,

    originatingShop: String(order.originatingShop),
    originatingShopName: order.originatingShopName,
    fulfillingShop: String(order.fulfillingShop),
    fulfillingShopName: order.fulfillingShopName,

    recipient: {
      fullName: order.recipient?.fullName || "",
      address: order.recipient?.address || "",
      city: order.recipient?.city || "",
      state: order.recipient?.state || "",
      zip: order.recipient?.zip || "",
      phone: order.recipient?.phone || "",
      company: order.recipient?.company || "",
      message: order.recipient?.message || "",
    },

    customer: {
      fullName: order.customer?.fullName || "",
      email: order.customer?.email || "",
      phone: order.customer?.phone || "",
    },

    logistics: {
      deliveryDate: order.logistics?.deliveryDate || null,
      deliveryTimeOption: order.logistics?.deliveryTimeOption || "",
      deliveryTimeFrom: order.logistics?.deliveryTimeFrom || "",
      deliveryTimeTo: order.logistics?.deliveryTimeTo || "",
      specialInstructions: order.logistics?.specialInstructions || "",
    },

    products: Array.isArray(order.products)
      ? order.products.map((product: any) => ({
          id: product.id ? String(product.id) : undefined,
          productId: product.productId ? String(product.productId) : undefined,
          name: product.name || "",
          description: product.description || "",
          photo: product.photo || "",
          priceCents: Number(product.priceCents || 0),
          qty: Number(product.qty || 0),
          taxable: !!product.taxable,
        }))
      : [],

    pricing: {
      productsSubtotalCents: Number(order.pricing?.productsSubtotalCents || 0),
      deliveryFeeCents: Number(order.pricing?.deliveryFeeCents || 0),
      taxCents: Number(order.pricing?.taxCents || 0),
      orderTotalCents: Number(order.pricing?.orderTotalCents || 0),
      originatingShopFeeType: order.pricing?.originatingShopFeeType,
      originatingShopFeeValue: order.pricing?.originatingShopFeeValue,
      originatingShopKeepsCents: Number(order.pricing?.originatingShopKeepsCents || 0),
      fulfillingShopGetsCents: Number(order.pricing?.fulfillingShopGetsCents || 0),
    },

    paymentMethods: {
      venmo: order.paymentMethods?.venmo || "",
      cashapp: order.paymentMethods?.cashapp || "",
      zelle: order.paymentMethods?.zelle || "",
      paypal: order.paymentMethods?.paypal || "",
      default: order.paymentMethods?.default || "venmo",
    },

    paymentMethod: order.paymentMethod || undefined,

    declineReason: order.declineReason || "",
    declineMessage: order.declineMessage || "",

    acceptedAt: order.acceptedAt || null,
    declinedAt: order.declinedAt || null,
    paidAt: order.paidAt || null,
    completedAt: order.completedAt || null,
    paymentMarkedPaidAt: order.paymentMarkedPaidAt || null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    reassignCount: Number(order.reassignCount || 0),
  };
}