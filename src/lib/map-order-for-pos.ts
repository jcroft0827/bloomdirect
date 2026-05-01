export function mapOrderForPOS(order: any) {
  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,

    status: order.status,

    recipient: {
      fullName: order.recipient?.fullName || "",
      address: order.recipient?.address || "",
      apt: order.recipient?.apt || "",
      city: order.recipient?.city || "",
      state: order.recipient?.state || "",
      zip: order.recipient?.zip || "",
      phone: order.recipient?.phone || "",
      email: order.recipient?.email || "",
      company: order.recipient?.company || "",
      message: order.recipient?.message || "",
    },

    customer: {
      fullName: order.customer?.fullName || "",
      email: order.customer?.email || "",
      phone: order.customer?.phone || "",
    },

    products: (order.products || []).map((product: any) => ({
      id:
        product.id?.toString?.() ||
        product.productId?.toString?.() ||
        undefined,
      name: product.name || "",
      description: product.description || "",
      photo: product.photo || "",
      qty: Number(product.qty || 0),
      taxable: !!product.taxable,
      price: Number((product.priceCents || 0) / 100),
    })),

    totals: {
      currency: "USD",
      productsSubtotal: Number(
        (order.pricing?.productsSubtotalCents || 0) / 100,
      ),
      deliveryFee: Number((order.pricing?.deliveryFeeCents || 0) / 100),
      tax: Number((order.pricing?.taxCents || 0) / 100),
      total: Number((order.pricing?.orderTotalCents || 0) / 100),
    },

    delivery: {
      date: order.logistics?.deliveryDate || null,
      window: {
        type: order.logistics?.deliveryTimeOption || "",
        from: order.logistics?.deliveryTimeFrom || "",
        to: order.logistics?.deliveryTimeTo || "",
      },
      instructions: order.logistics?.specialInstructions || "",
    },

    paid: order.paidAt,

    timestamps: {
      created: order.createdAt,
      accepted: order.acceptedAt,
      declined: order.declinedAt,
      completed: order.completedAt,
      updated: order.updatedAt,
    },
  };
}