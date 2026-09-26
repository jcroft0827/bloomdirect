import { randomBytes, randomUUID } from "crypto";

import { connectToDB } from "@/lib/mongoose";
import {
  sendBloomWebsiteRefundNotification,
} from "@/lib/bloom-websites/orders/sendBloomWebsiteOrderNotifications";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";

import { getBloomPaymentProvider } from "./getBloomPaymentProvider";
import { getBloomWebsiteMerchantReadiness } from "./getBloomWebsiteMerchantReadiness";
import type { BloomPaymentProviderName } from "./types";

export class BloomWebsiteRefundError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 409) {
    super(message);
    this.name = "BloomWebsiteRefundError";
    this.code = code;
    this.status = status;
  }
}

export type BloomWebsiteRefundSelectionInput = {
  kind: "product" | "addon" | "delivery" | "tip" | "tax";
  referenceId: string;
  quantity?: number;
  amountCents?: number;
  includeTax?: boolean;
};

type RefundComponentKind = "product" | "addon" | "delivery" | "tip";

export type BloomWebsiteRefundComponent = {
  kind: RefundComponentKind;
  referenceId: string;
  label: string;
  detail: string;
  itemIndex: number | null;
  addonIndex: number | null;
  unitAmountCents: number;
  originalQuantity: number | null;
  remainingQuantity: number | null;
  originalPrincipalCents: number;
  remainingPrincipalCents: number;
  originalTaxCents: number;
  remainingTaxCents: number;
};

export type BloomWebsiteRefundAvailability = {
  orderTotalCents: number;
  successfulRefundedCents: number;
  pendingRefundCents: number;
  committedRefundCents: number;
  remainingRefundableCents: number;
  unallocatedRefundCents: number;
  components: BloomWebsiteRefundComponent[];
};

type RefundAllocation = {
  kind: "product" | "addon" | "delivery" | "tip" | "tax" | "custom";
  referenceId: string;
  label: string;
  quantity: number | null;
  principalAmountCents: number;
  taxAmountCents: number;
  totalAmountCents: number;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function integer(value: unknown) {
  return Number.isInteger(value) ? Number(value) : null;
}

function cents(value: unknown) {
  const amount = integer(value);
  return amount !== null && amount >= 0 ? amount : 0;
}

function refundCountsAgainstBalance(refund: any) {
  return refund?.status === "succeeded" || refund?.status === "pending";
}

function addToMap(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) || 0) + value);
}

function productReference(item: any, itemIndex: number) {
  return `product:${itemIndex}:${String(item.productId)}:${item.tier}`;
}

function addonReference(
  item: any,
  itemIndex: number,
  addon: any,
  addonIndex: number,
) {
  return `addon:${itemIndex}:${addonIndex}:${String(
    item.productId,
  )}:${item.tier}:${String(addon.addonId)}`;
}

function findProductTaxLine(order: any, item: any, itemIndex: number) {
  const lines = Array.isArray(order.tax?.lines) ? order.tax.lines : [];
  const prefix = `product:${itemIndex}:`;

  return (
    lines.find(
      (line: any) =>
        line.kind === "product" &&
        clean(line.referenceId).startsWith(prefix),
    ) ||
    lines.find(
      (line: any) =>
        line.kind === "product" &&
        clean(line.referenceId).includes(String(item.productId)) &&
        clean(line.referenceId).endsWith(`:${item.tier}`),
    ) ||
    null
  );
}

function findAddonTaxLine(
  order: any,
  item: any,
  itemIndex: number,
  addon: any,
  addonIndex: number,
) {
  const lines = Array.isArray(order.tax?.lines) ? order.tax.lines : [];
  const prefix = `addon:${itemIndex}:${addonIndex}:`;

  return (
    lines.find(
      (line: any) =>
        line.kind === "addon" &&
        clean(line.referenceId).startsWith(prefix),
    ) ||
    lines.find(
      (line: any) =>
        line.kind === "addon" &&
        clean(line.referenceId).includes(String(item.productId)) &&
        clean(line.referenceId).includes(String(addon.addonId)),
    ) ||
    null
  );
}

function findTaxLine(order: any, kind: "delivery" | "tip") {
  const lines = Array.isArray(order.tax?.lines) ? order.tax.lines : [];
  return lines.find((line: any) => line.kind === kind) || null;
}

export function getBloomWebsiteRefundAvailability(
  order: any,
): BloomWebsiteRefundAvailability {
  const principalRefunded = new Map<string, number>();
  const taxRefunded = new Map<string, number>();
  const quantityRefunded = new Map<string, number>();

  let committedRefundCents = 0;
  let pendingRefundCents = 0;
  let unallocatedRefundCents = 0;

  for (const refund of order.refunds || []) {
    if (!refundCountsAgainstBalance(refund)) continue;

    const refundAmount = cents(refund.amountCents);
    committedRefundCents += refundAmount;

    if (refund.status === "pending") {
      pendingRefundCents += refundAmount;
    }

    const allocations = Array.isArray(refund.allocations)
      ? refund.allocations
      : [];

    if (allocations.length === 0) {
      unallocatedRefundCents += refundAmount;
      continue;
    }

    let allocationTotal = 0;

    for (const allocation of allocations) {
      const total = cents(allocation.totalAmountCents);
      allocationTotal += total;

      if (allocation.kind === "custom") {
        unallocatedRefundCents += total;
        continue;
      }

      const referenceId = clean(allocation.referenceId);

      if (!referenceId) {
        unallocatedRefundCents += total;
        continue;
      }

      addToMap(
        principalRefunded,
        referenceId,
        cents(allocation.principalAmountCents),
      );
      addToMap(
        taxRefunded,
        referenceId,
        cents(allocation.taxAmountCents),
      );

      if (
        allocation.quantity !== null &&
        allocation.quantity !== undefined &&
        Number.isInteger(allocation.quantity)
      ) {
        addToMap(
          quantityRefunded,
          referenceId,
          Number(allocation.quantity),
        );
      }
    }

    if (allocationTotal < refundAmount) {
      unallocatedRefundCents += refundAmount - allocationTotal;
    }
  }

  const components: BloomWebsiteRefundComponent[] = [];

  for (const [itemIndex, item] of (order.items || []).entries()) {
    const productTaxLine = findProductTaxLine(order, item, itemIndex);
    const productRef =
      clean(productTaxLine?.referenceId) ||
      productReference(item, itemIndex);
    const originalQuantity = Number(item.quantity || 0);
    const originalPrincipalCents = cents(item.productSubtotalCents);
    const principalUsed = principalRefunded.get(productRef) || 0;
    const quantityUsed =
      quantityRefunded.get(productRef) ||
      (item.unitPriceCents > 0
        ? Math.floor(principalUsed / item.unitPriceCents)
        : 0);

    components.push({
      kind: "product",
      referenceId: productRef,
      label: clean(item.name) || "Product",
      detail: clean(item.tierLabel) || clean(item.tier),
      itemIndex,
      addonIndex: null,
      unitAmountCents: cents(item.unitPriceCents),
      originalQuantity,
      remainingQuantity: Math.max(0, originalQuantity - quantityUsed),
      originalPrincipalCents,
      remainingPrincipalCents: Math.max(
        0,
        originalPrincipalCents - principalUsed,
      ),
      originalTaxCents: cents(productTaxLine?.taxAmountCents),
      remainingTaxCents: Math.max(
        0,
        cents(productTaxLine?.taxAmountCents) -
          (taxRefunded.get(productRef) || 0),
      ),
    });

    for (const [addonIndex, addon] of (item.addons || []).entries()) {
      const addonTaxLine = findAddonTaxLine(
        order,
        item,
        itemIndex,
        addon,
        addonIndex,
      );
      const addonRef =
        clean(addonTaxLine?.referenceId) ||
        addonReference(item, itemIndex, addon, addonIndex);
      const originalAddonQuantity = Number(addon.quantity || 0);
      const originalAddonPrincipal = cents(addon.lineTotalCents);
      const addonPrincipalUsed = principalRefunded.get(addonRef) || 0;
      const addonQuantityUsed =
        quantityRefunded.get(addonRef) ||
        (addon.unitPriceCents > 0
          ? Math.floor(addonPrincipalUsed / addon.unitPriceCents)
          : 0);

      components.push({
        kind: "addon",
        referenceId: addonRef,
        label: clean(addon.name) || "Add-on",
        detail: `Add-on for ${clean(item.name) || "product"}`,
        itemIndex,
        addonIndex,
        unitAmountCents: cents(addon.unitPriceCents),
        originalQuantity: originalAddonQuantity,
        remainingQuantity: Math.max(
          0,
          originalAddonQuantity - addonQuantityUsed,
        ),
        originalPrincipalCents: originalAddonPrincipal,
        remainingPrincipalCents: Math.max(
          0,
          originalAddonPrincipal - addonPrincipalUsed,
        ),
        originalTaxCents: cents(addonTaxLine?.taxAmountCents),
        remainingTaxCents: Math.max(
          0,
          cents(addonTaxLine?.taxAmountCents) -
            (taxRefunded.get(addonRef) || 0),
        ),
      });
    }
  }

  const deliveryLine = findTaxLine(order, "delivery");
  const deliveryRef =
    clean(deliveryLine?.referenceId) || "fulfillment:delivery";
  const deliveryPrincipal = cents(order.totals?.fulfillmentFeeCents);

  if (deliveryPrincipal > 0) {
    components.push({
      kind: "delivery",
      referenceId: deliveryRef,
      label: "Delivery charge",
      detail: "Order delivery fee",
      itemIndex: null,
      addonIndex: null,
      unitAmountCents: deliveryPrincipal,
      originalQuantity: null,
      remainingQuantity: null,
      originalPrincipalCents: deliveryPrincipal,
      remainingPrincipalCents: Math.max(
        0,
        deliveryPrincipal - (principalRefunded.get(deliveryRef) || 0),
      ),
      originalTaxCents: cents(deliveryLine?.taxAmountCents),
      remainingTaxCents: Math.max(
        0,
        cents(deliveryLine?.taxAmountCents) -
          (taxRefunded.get(deliveryRef) || 0),
      ),
    });
  }

  const tipLine = findTaxLine(order, "tip");
  const tipRef = clean(tipLine?.referenceId) || "gratuity:tip";
  const tipPrincipal = cents(order.totals?.tipCents);

  if (tipPrincipal > 0) {
    components.push({
      kind: "tip",
      referenceId: tipRef,
      label: "Tip / gratuity",
      detail: "Customer tip",
      itemIndex: null,
      addonIndex: null,
      unitAmountCents: tipPrincipal,
      originalQuantity: null,
      remainingQuantity: null,
      originalPrincipalCents: tipPrincipal,
      remainingPrincipalCents: Math.max(
        0,
        tipPrincipal - (principalRefunded.get(tipRef) || 0),
      ),
      originalTaxCents: cents(tipLine?.taxAmountCents),
      remainingTaxCents: Math.max(
        0,
        cents(tipLine?.taxAmountCents) -
          (taxRefunded.get(tipRef) || 0),
      ),
    });
  }

  const orderTotalCents = cents(order.totals?.totalCents);

  return {
    orderTotalCents,
    successfulRefundedCents: cents(order.totalRefundedCents),
    pendingRefundCents,
    committedRefundCents,
    remainingRefundableCents: Math.max(
      0,
      orderTotalCents - committedRefundCents,
    ),
    unallocatedRefundCents,
    components,
  };
}

function proportionalTax(
  remainingTaxCents: number,
  selectedPrincipalCents: number,
  remainingPrincipalCents: number,
) {
  if (
    remainingTaxCents <= 0 ||
    selectedPrincipalCents <= 0 ||
    remainingPrincipalCents <= 0
  ) {
    return 0;
  }

  if (selectedPrincipalCents >= remainingPrincipalCents) {
    return remainingTaxCents;
  }

  return Math.min(
    remainingTaxCents,
    Math.round(
      (remainingTaxCents * selectedPrincipalCents) /
        remainingPrincipalCents,
    ),
  );
}

function buildStructuredRefundPlan(
  order: any,
  selections: BloomWebsiteRefundSelectionInput[],
) {
  const availability = getBloomWebsiteRefundAvailability(order);

  if (availability.remainingRefundableCents <= 0) {
    throw new BloomWebsiteRefundError(
      "ORDER_ALREADY_REFUNDED",
      "This order does not have a remaining refundable balance.",
    );
  }

  const componentByReference = new Map(
    availability.components.map((component) => [
      component.referenceId,
      {
        ...component,
        workingPrincipalCents: component.remainingPrincipalCents,
        workingTaxCents: component.remainingTaxCents,
        workingQuantity: component.remainingQuantity,
      },
    ]),
  );

  const principalReferences = new Set<string>();
  const allocations: RefundAllocation[] = [];

  for (const selection of selections) {
    const referenceId = clean(selection.referenceId);
    const component = componentByReference.get(referenceId);

    if (!component) {
      throw new BloomWebsiteRefundError(
        "REFUND_COMPONENT_NOT_FOUND",
        "One of the selected refund components no longer matches this order.",
        400,
      );
    }

    if (selection.kind === "tax") {
      const taxAmount = integer(selection.amountCents);

      if (
        taxAmount === null ||
        taxAmount <= 0 ||
        taxAmount > component.workingTaxCents
      ) {
        throw new BloomWebsiteRefundError(
          "INVALID_REFUND_TAX_AMOUNT",
          "Tax refund amount exceeds the remaining tax for that charge.",
          400,
        );
      }

      component.workingTaxCents -= taxAmount;

      allocations.push({
        kind: "tax",
        referenceId,
        label: `Tax on ${component.label}`,
        quantity: null,
        principalAmountCents: 0,
        taxAmountCents: taxAmount,
        totalAmountCents: taxAmount,
      });

      continue;
    }

    if (selection.kind !== component.kind) {
      throw new BloomWebsiteRefundError(
        "REFUND_COMPONENT_MISMATCH",
        "Refund selection does not match the original order charge.",
        400,
      );
    }

    if (principalReferences.has(referenceId)) {
      throw new BloomWebsiteRefundError(
        "DUPLICATE_REFUND_COMPONENT",
        "The same order charge was selected more than once.",
        400,
      );
    }

    principalReferences.add(referenceId);

    let principalAmountCents = 0;
    let quantity: number | null = null;

    if (
      component.kind === "product" ||
      component.kind === "addon"
    ) {
      const requestedQuantity = integer(selection.quantity);

      if (
        requestedQuantity === null ||
        requestedQuantity <= 0 ||
        component.workingQuantity === null ||
        requestedQuantity > component.workingQuantity
      ) {
        throw new BloomWebsiteRefundError(
          "INVALID_REFUND_QUANTITY",
          "Refund quantity exceeds the remaining quantity for that item.",
          400,
        );
      }

      quantity = requestedQuantity;
      principalAmountCents =
        component.unitAmountCents * requestedQuantity;

      if (principalAmountCents > component.workingPrincipalCents) {
        throw new BloomWebsiteRefundError(
          "REFUND_COMPONENT_EXCEEDS_REMAINING",
          "Refund amount exceeds the remaining balance for that item.",
          400,
        );
      }

      component.workingQuantity -= requestedQuantity;
    } else {
      const requestedAmount = integer(selection.amountCents);
      principalAmountCents =
        requestedAmount === null
          ? component.workingPrincipalCents
          : requestedAmount;

      if (
        principalAmountCents <= 0 ||
        principalAmountCents > component.workingPrincipalCents
      ) {
        throw new BloomWebsiteRefundError(
          "REFUND_COMPONENT_EXCEEDS_REMAINING",
          "Refund amount exceeds the remaining balance for that charge.",
          400,
        );
      }
    }

    const taxAmountCents =
      selection.includeTax === true
        ? proportionalTax(
            component.workingTaxCents,
            principalAmountCents,
            component.workingPrincipalCents,
          )
        : 0;

    component.workingPrincipalCents -= principalAmountCents;
    component.workingTaxCents -= taxAmountCents;

    allocations.push({
      kind: component.kind,
      referenceId,
      label: component.label,
      quantity,
      principalAmountCents,
      taxAmountCents,
      totalAmountCents:
        principalAmountCents + taxAmountCents,
    });
  }

  const amountCents = allocations.reduce(
    (sum, allocation) => sum + allocation.totalAmountCents,
    0,
  );

  if (amountCents <= 0) {
    throw new BloomWebsiteRefundError(
      "EMPTY_REFUND",
      "Select at least one item, charge, or tax amount to refund.",
      400,
    );
  }

  if (amountCents > availability.remainingRefundableCents) {
    throw new BloomWebsiteRefundError(
      "REFUND_EXCEEDS_REMAINING_TOTAL",
      "Refund amount exceeds the remaining paid balance.",
      400,
    );
  }

  return { amountCents, allocations };
}

function buildCustomRefundPlan(order: any, amountCents: number) {
  const availability = getBloomWebsiteRefundAvailability(order);

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new BloomWebsiteRefundError(
      "INVALID_REFUND_AMOUNT",
      "Refund amount must be a positive number of cents.",
      400,
    );
  }

  if (amountCents > availability.remainingRefundableCents) {
    throw new BloomWebsiteRefundError(
      "REFUND_EXCEEDS_REMAINING_TOTAL",
      "Refund amount exceeds the remaining paid balance.",
      400,
    );
  }

  return {
    amountCents,
    allocations: [
      {
        kind: "custom" as const,
        referenceId: "",
        label: "Custom refund",
        quantity: null,
        principalAmountCents: amountCents,
        taxAmountCents: 0,
        totalAmountCents: amountCents,
      },
    ],
  };
}

function existingRefundResult(order: any, refund: any) {
  return {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    refundId: refund.refundId,
    providerRefundId: refund.providerRefundId,
    refundStatus: refund.status,
    amountCents: refund.amountCents,
    allocations: refund.allocations || [],
    totalRefundedCents: order.totalRefundedCents || 0,
    paymentStatus: order.payment.status,
    recovered: true,
  };
}

export async function refundBloomWebsiteOrder({
  orderId,
  shopId,
  amountCents,
  selections,
  reason,
  idempotencyKey,
  actorLabel = "",
}: {
  orderId: string;
  shopId: string;
  amountCents?: number;
  selections?: BloomWebsiteRefundSelectionInput[];
  reason: string;
  idempotencyKey?: string;
  actorLabel?: string;
}) {
  await connectToDB();

  const requestKey =
    clean(idempotencyKey) ||
    `refund_${randomBytes(16).toString("hex")}`;

  if (requestKey.length > 200) {
    throw new BloomWebsiteRefundError(
      "INVALID_REFUND_IDEMPOTENCY_KEY",
      "Refund request identifier is invalid.",
      400,
    );
  }

  const order = await BloomWebsiteOrder.findOne({
    _id: orderId,
    shop: shopId,
  });

  if (!order) {
    throw new BloomWebsiteRefundError(
      "ORDER_NOT_FOUND",
      "BloomWebsite order could not be found.",
      404,
    );
  }

  const existing = (order.refunds || []).find(
    (refund: any) => clean(refund.idempotencyKey) === requestKey,
  );

  if (existing) {
    return existingRefundResult(order, existing);
  }

  if (
    order.payment?.status !== "paid" &&
    order.payment?.status !== "partially_refunded"
  ) {
    throw new BloomWebsiteRefundError(
      "ORDER_NOT_REFUNDABLE",
      "This order is not currently refundable.",
    );
  }

  const structuredSelections = Array.isArray(selections)
    ? selections
    : [];

  if (
    structuredSelections.length > 0 &&
    amountCents !== undefined &&
    amountCents !== null
  ) {
    throw new BloomWebsiteRefundError(
      "REFUND_REQUEST_AMBIGUOUS",
      "Choose either structured refund components or a custom amount.",
      400,
    );
  }

  const plan =
    structuredSelections.length > 0
      ? buildStructuredRefundPlan(order, structuredSelections)
      : buildCustomRefundPlan(order, Number(amountCents));

  const provider =
    order.payment.provider as BloomPaymentProviderName;

  if (provider !== "stripe" && provider !== "fiserv") {
    throw new BloomWebsiteRefundError(
      "PAYMENT_PROVIDER_UNSUPPORTED",
      "This order has an unsupported payment provider.",
    );
  }

  const readiness = await getBloomWebsiteMerchantReadiness({
    websiteId: String(order.website),
    provider,
    requireReady: false,
  });

  if (!readiness.connection) {
    throw new BloomWebsiteRefundError(
      "MERCHANT_CONNECTION_MISSING",
      "The florist payment connection that owns this order could not be found.",
    );
  }

  const refundId = `BWR_${randomBytes(12).toString("hex")}`;
  const providerClient = getBloomPaymentProvider(provider);

  const result = await providerClient.refundPayment({
    providerPaymentId: clean(order.payment.providerPaymentId),
    amountCents: plan.amountCents,
    reason: clean(reason) || "Florist requested refund.",
    idempotencyKey: `bloom-refund:${order.orderNumber}:${requestKey}`,
    merchant: readiness.connection,
  });

  if (result.amountCents !== plan.amountCents) {
    throw new BloomWebsiteRefundError(
      "REFUND_PROVIDER_AMOUNT_MISMATCH",
      "The payment processor returned an unexpected refund amount.",
      502,
    );
  }

  const repeatedOrder = await BloomWebsiteOrder.findOne({
    _id: orderId,
    shop: shopId,
    "refunds.idempotencyKey": requestKey,
  });

  if (repeatedOrder) {
    const repeatedRefund = repeatedOrder.refunds.find(
      (refund: any) =>
        clean(refund.idempotencyKey) === requestKey,
    );

    if (repeatedRefund) {
      return existingRefundResult(repeatedOrder, repeatedRefund);
    }
  }

  const refundedBefore = order.totalRefundedCents || 0;
  const paymentStatusBefore = order.payment.status;
  const refundOccurredAt = new Date();

  order.refunds.push({
    refundId,
    providerRefundId: result.providerRefundId,
    idempotencyKey: requestKey,
    amountCents: plan.amountCents,
    status: result.status,
    reason: clean(reason),
    allocations: plan.allocations,
    createdAt: refundOccurredAt,
    completedAt:
      result.status === "succeeded" ? refundOccurredAt : null,
  } as any);

  if (result.status === "succeeded") {
    order.totalRefundedCents =
      (order.totalRefundedCents || 0) + result.amountCents;

    order.payment.status =
      order.totalRefundedCents >= order.totals.totalCents
        ? "refunded"
        : "partially_refunded";
  }

  const refundHistoryChanges = [
    {
      field: "refunds",
      label: "Refund recorded",
      beforeValue: null,
      afterValue: {
        refundId,
        status: result.status,
        amountCents: result.amountCents,
        allocations: plan.allocations,
      },
    },
  ];

  if (refundedBefore !== order.totalRefundedCents) {
    refundHistoryChanges.push({
      field: "totalRefundedCents",
      label: "Total refunded",
      beforeValue: refundedBefore,
      afterValue: order.totalRefundedCents,
    } as any);
  }

  if (paymentStatusBefore !== order.payment.status) {
    refundHistoryChanges.push({
      field: "payment.status",
      label: "Payment status",
      beforeValue: paymentStatusBefore,
      afterValue: order.payment.status,
    } as any);
  }

  order.historyEvents = order.historyEvents || [];
  order.historyEvents.push({
    eventId: `BWH_${randomUUID()}`,
    kind: "refund_recorded",
    source: "portal",
    actor: {
      type: "florist",
      id: shopId,
      label: clean(actorLabel) || "Florist account",
    },
    summary:
      result.status === "succeeded"
        ? "Refund completed"
        : `Refund ${result.status}`,
    reason: clean(reason),
    referenceType: "refund",
    referenceId: refundId,
    amountCents: result.amountCents,
    changes: refundHistoryChanges,
    financialReviewRequired: false,
    occurredAt: refundOccurredAt,
  } as any);

  try {
    await order.save();
  } catch (error: any) {
    if (error?.name === "VersionError") {
      const recovered = await BloomWebsiteOrder.findOne({
        _id: orderId,
        shop: shopId,
        "refunds.idempotencyKey": requestKey,
      });

      const recoveredRefund = recovered?.refunds?.find(
        (refund: any) =>
          clean(refund.idempotencyKey) === requestKey,
      );

      if (recovered && recoveredRefund) {
        return existingRefundResult(recovered, recoveredRefund);
      }
    }

    throw error;
  }

  if (result.status === "succeeded") {
    await sendBloomWebsiteRefundNotification(
      String(order._id),
      refundId,
    );
  }

  return {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    refundId,
    providerRefundId: result.providerRefundId,
    refundStatus: result.status,
    amountCents: result.amountCents,
    allocations: plan.allocations,
    totalRefundedCents: order.totalRefundedCents,
    paymentStatus: order.payment.status,
    recovered: false,
  };
}
