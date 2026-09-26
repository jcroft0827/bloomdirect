import { connectToDB } from "@/lib/mongoose";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";

export type BloomWebsiteReportRange = {
  startDate: string;
  endDate: string;
  timezone: string;
};

export type BloomWebsiteReportOrderRow = {
  orderId: string;
  orderNumber: string;
  placedDate: string;
  placedAt: string;
  customerName: string;
  customerEmail: string;
  fulfillmentType: "delivery" | "pickup";
  fulfillmentDate: string;
  status: string;
  productSubtotalCents: number;
  addonSubtotalCents: number;
  deliveryCents: number;
  tipCents: number;
  taxableSubtotalCents: number;
  taxCents: number;
  totalCents: number;
  lifetimeRefundedCents: number;
  paymentStatus: string;
};

export type BloomWebsiteReportRefundRow = {
  refundId: string;
  orderId: string;
  orderNumber: string;
  date: string;
  occurredAt: string;
  status: string;
  amountCents: number;
  merchandisePrincipalCents: number;
  deliveryPrincipalCents: number;
  tipPrincipalCents: number;
  taxAmountCents: number;
  customCents: number;
  unclassifiedCents: number;
  reason: string;
  allocationSummary: string;
};

export type BloomWebsiteReportProductRow = {
  key: string;
  kind: "product" | "addon";
  name: string;
  detail: string;
  quantity: number;
  grossSalesCents: number;
};

export type BloomWebsiteReportTaxJurisdictionRow = {
  key: string;
  country: string;
  state: string;
  county: string;
  city: string;
  jurisdictionCode: string;
  rate: number | null;
  taxableSalesCents: number | null;
  taxCollectedCents: number;
};

export type BloomWebsiteReportDailyRow = {
  date: string;
  orderCount: number;
  totalChargedCents: number;
  taxCollectedCents: number;
  tipsCents: number;
};

export type BloomWebsiteReport = {
  range: BloomWebsiteReportRange;
  summary: {
    orderCount: number;
    deliveryOrders: number;
    pickupOrders: number;
    merchandiseSalesCents: number;
    deliverySalesCents: number;
    grossSalesCents: number;
    tipsCents: number;
    grossReceiptsBeforeTaxCents: number;
    taxableSalesCents: number;
    nonTaxableSalesCents: number;
    merchandiseTaxableCents: number;
    merchandiseNonTaxableCents: number;
    merchandiseTaxCents: number;
    deliveryTaxableCents: number;
    deliveryNonTaxableCents: number;
    deliveryTaxCents: number;
    tipsTaxableCents: number;
    tipsNonTaxableCents: number;
    tipsTaxCents: number;
    taxCollectedCents: number;
    totalChargedCents: number;
    averageOrderCents: number;
    successfulRefundsCents: number;
    successfulRefundsExcludingTaxCents: number;
    refundedMerchandiseCents: number;
    refundedDeliveryCents: number;
    refundedTipsCents: number;
    customRefundsCents: number;
    unclassifiedRefundsCents: number;
    pendingRefundsCents: number;
    taxRefundedCents: number;
    netReceiptsBeforeTaxCents: number;
    netTaxCents: number;
    netPaymentActivityCents: number;
    exemptOrderCount: number;
    refundedOrderCount: number;
    disputedOrderCount: number;
    taxLineCoverageOrderCount: number;
  };
  orders: BloomWebsiteReportOrderRow[];
  refunds: BloomWebsiteReportRefundRow[];
  products: BloomWebsiteReportProductRow[];
  taxJurisdictions: BloomWebsiteReportTaxJurisdictionRow[];
  daily: BloomWebsiteReportDailyRow[];
};

const FINANCIAL_PAYMENT_STATUSES = [
  "paid",
  "partially_refunded",
  "refunded",
  "disputed",
];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cents(value: unknown) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : 0;
}

export function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function normalizeBloomWebsiteReportRange({
  startDate,
  endDate,
  timezone,
}: {
  startDate?: string | null;
  endDate?: string | null;
  timezone?: string | null;
}): BloomWebsiteReportRange {
  const normalizedStart = clean(startDate);
  const normalizedEnd = clean(endDate);
  const normalizedTimezone = clean(timezone) || "America/New_York";

  if (normalizedStart && !isDateOnly(normalizedStart)) {
    throw new Error("INVALID_REPORT_START_DATE");
  }

  if (normalizedEnd && !isDateOnly(normalizedEnd)) {
    throw new Error("INVALID_REPORT_END_DATE");
  }

  if (normalizedStart && normalizedEnd && normalizedStart > normalizedEnd) {
    throw new Error("INVALID_REPORT_DATE_RANGE");
  }

  return {
    startDate: normalizedStart,
    endDate: normalizedEnd,
    timezone: normalizedTimezone,
  };
}

function dateKey(value: unknown, timezone: string) {
  const date = new Date(value as any);
  if (Number.isNaN(date.getTime())) return "";

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value || "";
    const month = parts.find((part) => part.type === "month")?.value || "";
    const day = parts.find((part) => part.type === "day")?.value || "";

    return year && month && day ? `${year}-${month}-${day}` : "";
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function dateInRange(date: string, range: BloomWebsiteReportRange) {
  if (!date) return false;
  if (range.startDate && date < range.startDate) return false;
  if (range.endDate && date > range.endDate) return false;
  return true;
}

function buildBroadPlacedAtFilter(range: BloomWebsiteReportRange) {
  if (!range.startDate && !range.endDate) return null;

  const result: Record<string, Date> = {};

  if (range.startDate) {
    const start = new Date(`${range.startDate}T00:00:00.000Z`);
    start.setUTCDate(start.getUTCDate() - 1);
    result.$gte = start;
  }

  if (range.endDate) {
    const end = new Date(`${range.endDate}T23:59:59.999Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    result.$lte = end;
  }

  return result;
}

function refundOccurredAt(refund: any) {
  return refund?.completedAt || refund?.createdAt || null;
}

function taxRefundedFor(refund: any) {
  return (refund?.allocations || []).reduce(
    (sum: number, allocation: any) => sum + cents(allocation?.taxAmountCents),
    0,
  );
}

function refundAccountingBreakdown(refund: any) {
  let merchandisePrincipalCents = 0;
  let deliveryPrincipalCents = 0;
  let tipPrincipalCents = 0;
  let taxAmountCents = 0;
  let customCents = 0;
  let allocationTotalCents = 0;

  for (const allocation of refund?.allocations || []) {
    const kind = clean(allocation?.kind);
    const principal = cents(allocation?.principalAmountCents);
    const tax = cents(allocation?.taxAmountCents);
    const total = cents(allocation?.totalAmountCents);

    allocationTotalCents += total;
    taxAmountCents += tax;

    if (kind === "product" || kind === "addon") {
      merchandisePrincipalCents += principal;
    } else if (kind === "delivery") {
      deliveryPrincipalCents += principal;
    } else if (kind === "tip") {
      tipPrincipalCents += principal;
    } else if (kind === "custom") {
      customCents += principal;
    }
  }

  const refundAmountCents = cents(refund?.amountCents);

  return {
    merchandisePrincipalCents,
    deliveryPrincipalCents,
    tipPrincipalCents,
    taxAmountCents,
    customCents,
    unclassifiedCents: Math.max(0, refundAmountCents - allocationTotalCents),
  };
}

function allocationSummary(refund: any) {
  const labels = (refund?.allocations || [])
    .map((allocation: any) => clean(allocation?.label))
    .filter(Boolean);

  return labels.length > 0 ? labels.join("; ") : "Custom refund";
}

function productKey(item: any) {
  return `product:${String(item?.productId || item?.name || "unknown")}:${clean(item?.tier)}`;
}

function addonKey(addon: any) {
  return `addon:${String(addon?.addonId || addon?.name || "unknown")}`;
}

function jurisdictionKey(jurisdiction: any) {
  return [
    clean(jurisdiction?.country),
    clean(jurisdiction?.state),
    clean(jurisdiction?.county),
    clean(jurisdiction?.city),
    jurisdiction?.rate ?? "",
  ].join("|");
}

export async function getBloomWebsiteReport({
  shopId,
  range,
}: {
  shopId: string;
  range: BloomWebsiteReportRange;
}): Promise<BloomWebsiteReport> {
  await connectToDB();

  const placedAtFilter = buildBroadPlacedAtFilter(range);
  const orderQuery: Record<string, any> = {
    shop: shopId,
    "payment.status": { $in: FINANCIAL_PAYMENT_STATUSES },
  };

  if (placedAtFilter) {
    orderQuery.placedAt = placedAtFilter;
  }

  const [candidateOrders, refundOrders] = await Promise.all([
    BloomWebsiteOrder.find(orderQuery)
      .sort({ placedAt: 1 })
      .select(
        "_id orderNumber placedAt customer fulfillment status items totals tax payment totalRefundedCents",
      )
      .lean<any[]>(),
    BloomWebsiteOrder.find({
      shop: shopId,
      "refunds.0": { $exists: true },
    })
      .select("_id orderNumber refunds")
      .lean<any[]>(),
  ]);

  const orders = candidateOrders.filter((order) => {
    const timezone = clean(order?.fulfillment?.timezone) || range.timezone;
    return dateInRange(dateKey(order.placedAt, timezone), range);
  });

  const orderRows: BloomWebsiteReportOrderRow[] = [];
  const refundRows: BloomWebsiteReportRefundRow[] = [];
  const productMap = new Map<string, BloomWebsiteReportProductRow>();
  const jurisdictionMap = new Map<string, BloomWebsiteReportTaxJurisdictionRow>();
  const dailyMap = new Map<string, BloomWebsiteReportDailyRow>();

  let deliveryOrders = 0;
  let pickupOrders = 0;
  let merchandiseSalesCents = 0;
  let deliverySalesCents = 0;
  let tipsCents = 0;
  let taxableSalesCents = 0;
  let nonTaxableSalesCents = 0;
  let merchandiseTaxableCents = 0;
  let merchandiseNonTaxableCents = 0;
  let merchandiseTaxCents = 0;
  let deliveryTaxableCents = 0;
  let deliveryNonTaxableCents = 0;
  let deliveryTaxCents = 0;
  let tipsTaxableCents = 0;
  let tipsNonTaxableCents = 0;
  let tipsTaxCents = 0;
  let taxCollectedCents = 0;
  let totalChargedCents = 0;
  let exemptOrderCount = 0;
  let disputedOrderCount = 0;
  let taxLineCoverageOrderCount = 0;

  for (const order of orders) {
    const orderTimezone = clean(order?.fulfillment?.timezone) || range.timezone;
    const placedDate = dateKey(order.placedAt, orderTimezone);
    const productSubtotalCents = cents(order?.totals?.productSubtotalCents);
    const addonSubtotalCents = cents(order?.totals?.addonSubtotalCents);
    const deliveryCents = cents(order?.totals?.fulfillmentFeeCents);
    const orderTipsCents = cents(order?.totals?.tipCents);
    const orderTaxableCents = cents(order?.totals?.taxableSubtotalCents);
    const orderTaxCents = cents(order?.totals?.taxAmountCents);
    const orderTotalCents = cents(order?.totals?.totalCents);
    const beforeTaxCents =
      productSubtotalCents + addonSubtotalCents + deliveryCents + orderTipsCents;

    merchandiseSalesCents += productSubtotalCents + addonSubtotalCents;
    deliverySalesCents += deliveryCents;
    tipsCents += orderTipsCents;
    taxableSalesCents += orderTaxableCents;
    nonTaxableSalesCents += Math.max(0, beforeTaxCents - orderTaxableCents);
    taxCollectedCents += orderTaxCents;
    totalChargedCents += orderTotalCents;

    if (order?.fulfillment?.type === "pickup") pickupOrders += 1;
    else deliveryOrders += 1;

    if (order?.tax?.exemption?.applied === true) exemptOrderCount += 1;
    if (order?.payment?.status === "disputed") disputedOrderCount += 1;

    const taxLines = Array.isArray(order?.tax?.lines) ? order.tax.lines : [];
    if (taxLines.length > 0) taxLineCoverageOrderCount += 1;

    for (const line of taxLines) {
      const lineAmount = cents(line?.amountCents);
      const lineTaxable = Math.min(lineAmount, cents(line?.taxableAmountCents));
      const lineNonTaxable = Math.max(0, lineAmount - lineTaxable);
      const lineTax = cents(line?.taxAmountCents);

      if (line?.kind === "product" || line?.kind === "addon") {
        merchandiseTaxableCents += lineTaxable;
        merchandiseNonTaxableCents += lineNonTaxable;
        merchandiseTaxCents += lineTax;
      } else if (line?.kind === "delivery") {
        deliveryTaxableCents += lineTaxable;
        deliveryNonTaxableCents += lineNonTaxable;
        deliveryTaxCents += lineTax;
      } else if (line?.kind === "tip") {
        tipsTaxableCents += lineTaxable;
        tipsNonTaxableCents += lineNonTaxable;
        tipsTaxCents += lineTax;
      }
    }

    orderRows.push({
      orderId: String(order._id),
      orderNumber: clean(order.orderNumber),
      placedDate,
      placedAt: new Date(order.placedAt).toISOString(),
      customerName: [clean(order?.customer?.firstName), clean(order?.customer?.lastName)]
        .filter(Boolean)
        .join(" "),
      customerEmail: clean(order?.customer?.email),
      fulfillmentType:
        order?.fulfillment?.type === "pickup" ? "pickup" : "delivery",
      fulfillmentDate: clean(order?.fulfillment?.requestedDate),
      status: clean(order?.status),
      productSubtotalCents,
      addonSubtotalCents,
      deliveryCents,
      tipCents: orderTipsCents,
      taxableSubtotalCents: orderTaxableCents,
      taxCents: orderTaxCents,
      totalCents: orderTotalCents,
      lifetimeRefundedCents: cents(order?.totalRefundedCents),
      paymentStatus: clean(order?.payment?.status),
    });

    const daily = dailyMap.get(placedDate) || {
      date: placedDate,
      orderCount: 0,
      totalChargedCents: 0,
      taxCollectedCents: 0,
      tipsCents: 0,
    };

    daily.orderCount += 1;
    daily.totalChargedCents += orderTotalCents;
    daily.taxCollectedCents += orderTaxCents;
    daily.tipsCents += orderTipsCents;
    dailyMap.set(placedDate, daily);

    for (const item of order.items || []) {
      const key = productKey(item);
      const row = productMap.get(key) || {
        key,
        kind: "product" as const,
        name: clean(item?.name) || "Product",
        detail: clean(item?.tierLabel) || clean(item?.tier),
        quantity: 0,
        grossSalesCents: 0,
      };

      row.quantity += Number.isInteger(item?.quantity) ? Number(item.quantity) : 0;
      row.grossSalesCents += cents(item?.productSubtotalCents);
      productMap.set(key, row);

      for (const addon of item?.addons || []) {
        const addonMapKey = addonKey(addon);
        const addonRow = productMap.get(addonMapKey) || {
          key: addonMapKey,
          kind: "addon" as const,
          name: clean(addon?.name) || "Add-on",
          detail: clean(addon?.category) || "Add-on",
          quantity: 0,
          grossSalesCents: 0,
        };

        addonRow.quantity += Number.isInteger(addon?.quantity)
          ? Number(addon.quantity)
          : 0;
        addonRow.grossSalesCents += cents(addon?.lineTotalCents);
        productMap.set(addonMapKey, addonRow);
      }
    }

    for (const jurisdiction of order?.tax?.jurisdictions || []) {
      const key = jurisdictionKey(jurisdiction);
      const row = jurisdictionMap.get(key) || {
        key,
        country: clean(jurisdiction?.country),
        state: clean(jurisdiction?.state),
        county: clean(jurisdiction?.county),
        city: clean(jurisdiction?.city),
        jurisdictionCode: clean(jurisdiction?.jurisdictionCode),
        rate:
          typeof jurisdiction?.rate === "number" && Number.isFinite(jurisdiction.rate)
            ? jurisdiction.rate
            : null,
        taxableSalesCents: null,
        taxCollectedCents: 0,
      };

      row.taxCollectedCents += cents(jurisdiction?.taxAmountCents);
      jurisdictionMap.set(key, row);
    }
  }

  // Taxable charges are authoritative at the order level. When a stored tax
  // snapshot has exactly one jurisdiction, the full taxable base can be
  // assigned to it. Multi-jurisdiction snapshots do not contain a per-
  // jurisdiction taxable-base allocation, so Bloom leaves those values blank
  // instead of estimating them.
  const incompleteJurisdictionTaxableBaseKeys = new Set<string>();

  for (const order of orders) {
    const jurisdictions = Array.isArray(order?.tax?.jurisdictions)
      ? order.tax.jurisdictions
      : [];

    if (jurisdictions.length === 1) {
      const key = jurisdictionKey(jurisdictions[0]);
      if (!incompleteJurisdictionTaxableBaseKeys.has(key)) {
        const row = jurisdictionMap.get(key);
        if (row) {
          row.taxableSalesCents =
            (row.taxableSalesCents || 0) +
            cents(order?.totals?.taxableSubtotalCents);
        }
      }
    } else if (jurisdictions.length > 1) {
      for (const jurisdiction of jurisdictions) {
        const key = jurisdictionKey(jurisdiction);
        incompleteJurisdictionTaxableBaseKeys.add(key);
        const row = jurisdictionMap.get(key);
        if (row) row.taxableSalesCents = null;
      }
    }
  }

  for (const key of incompleteJurisdictionTaxableBaseKeys) {
    const row = jurisdictionMap.get(key);
    if (row) row.taxableSalesCents = null;
  }

  let successfulRefundsCents = 0;
  let pendingRefundsCents = 0;
  let taxRefundedCents = 0;
  let refundedMerchandiseCents = 0;
  let refundedDeliveryCents = 0;
  let refundedTipsCents = 0;
  let customRefundsCents = 0;
  let unclassifiedRefundsCents = 0;
  const refundedOrders = new Set<string>();

  for (const order of refundOrders) {
    for (const refund of order.refunds || []) {
      const occurredAt = refundOccurredAt(refund);
      if (!occurredAt) continue;

      const refundDate = dateKey(occurredAt, range.timezone);
      if (!dateInRange(refundDate, range)) continue;

      const status = clean(refund?.status);
      const refundAmountCents = cents(refund?.amountCents);
      const breakdown = refundAccountingBreakdown(refund);
      const refundTaxCents = taxRefundedFor(refund);

      if (status === "succeeded") {
        successfulRefundsCents += refundAmountCents;
        taxRefundedCents += refundTaxCents;
        refundedMerchandiseCents += breakdown.merchandisePrincipalCents;
        refundedDeliveryCents += breakdown.deliveryPrincipalCents;
        refundedTipsCents += breakdown.tipPrincipalCents;
        customRefundsCents += breakdown.customCents;
        unclassifiedRefundsCents += breakdown.unclassifiedCents;
        refundedOrders.add(String(order._id));
      } else if (status === "pending") {
        pendingRefundsCents += refundAmountCents;
      }

      refundRows.push({
        refundId: clean(refund?.refundId),
        orderId: String(order._id),
        orderNumber: clean(order?.orderNumber),
        date: refundDate,
        occurredAt: new Date(occurredAt).toISOString(),
        status,
        amountCents: refundAmountCents,
        merchandisePrincipalCents: breakdown.merchandisePrincipalCents,
        deliveryPrincipalCents: breakdown.deliveryPrincipalCents,
        tipPrincipalCents: breakdown.tipPrincipalCents,
        taxAmountCents: refundTaxCents,
        customCents: breakdown.customCents,
        unclassifiedCents: breakdown.unclassifiedCents,
        reason: clean(refund?.reason),
        allocationSummary: allocationSummary(refund),
      });
    }
  }

  refundRows.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const productRows = Array.from(productMap.values()).sort((a, b) => {
    if (b.grossSalesCents !== a.grossSalesCents) {
      return b.grossSalesCents - a.grossSalesCents;
    }
    return a.name.localeCompare(b.name);
  });

  const taxJurisdictions = Array.from(jurisdictionMap.values()).sort((a, b) => {
    if (b.taxCollectedCents !== a.taxCollectedCents) {
      return b.taxCollectedCents - a.taxCollectedCents;
    }
    return a.key.localeCompare(b.key);
  });

  const daily = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return {
    range,
    summary: {
      orderCount: orders.length,
      deliveryOrders,
      pickupOrders,
      merchandiseSalesCents,
      deliverySalesCents,
      grossSalesCents: merchandiseSalesCents + deliverySalesCents,
      tipsCents,
      grossReceiptsBeforeTaxCents:
        merchandiseSalesCents + deliverySalesCents + tipsCents,
      taxableSalesCents,
      nonTaxableSalesCents,
      merchandiseTaxableCents,
      merchandiseNonTaxableCents,
      merchandiseTaxCents,
      deliveryTaxableCents,
      deliveryNonTaxableCents,
      deliveryTaxCents,
      tipsTaxableCents,
      tipsNonTaxableCents,
      tipsTaxCents,
      taxCollectedCents,
      totalChargedCents,
      averageOrderCents:
        orders.length > 0 ? Math.round(totalChargedCents / orders.length) : 0,
      successfulRefundsCents,
      successfulRefundsExcludingTaxCents:
        successfulRefundsCents - taxRefundedCents,
      refundedMerchandiseCents,
      refundedDeliveryCents,
      refundedTipsCents,
      customRefundsCents,
      unclassifiedRefundsCents,
      pendingRefundsCents,
      taxRefundedCents,
      netReceiptsBeforeTaxCents:
        merchandiseSalesCents +
        deliverySalesCents +
        tipsCents -
        (successfulRefundsCents - taxRefundedCents),
      netTaxCents: taxCollectedCents - taxRefundedCents,
      netPaymentActivityCents: totalChargedCents - successfulRefundsCents,
      exemptOrderCount,
      refundedOrderCount: refundedOrders.size,
      disputedOrderCount,
      taxLineCoverageOrderCount,
    },
    orders: orderRows,
    refunds: refundRows,
    products: productRows,
    taxJurisdictions,
    daily,
  };
}
