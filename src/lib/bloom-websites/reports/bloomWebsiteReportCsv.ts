import type { BloomWebsiteReport } from "./getBloomWebsiteReport";

export type BloomWebsiteReportCsvKind =
  | "orders"
  | "sales"
  | "refunds"
  | "tax"
  | "products";

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function centsToDollars(value: number) {
  return (value / 100).toFixed(2);
}

function rowsToCsv(rows: unknown[][]) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function isBloomWebsiteReportCsvKind(
  value: string,
): value is BloomWebsiteReportCsvKind {
  return ["orders", "sales", "refunds", "tax", "products"].includes(value);
}

export function buildBloomWebsiteReportCsv(
  report: BloomWebsiteReport,
  kind: BloomWebsiteReportCsvKind,
) {
  if (kind === "orders") {
    return rowsToCsv([
      [
        "Order Date",
        "Order Number",
        "Customer",
        "Customer Email",
        "Fulfillment",
        "Fulfillment Date",
        "Status",
        "Product Sales",
        "Add-on Sales",
        "Delivery",
        "Tips",
        "Taxable Sales",
        "Tax Collected",
        "Total Charged",
        "Lifetime Refunded",
        "Payment Status",
      ],
      ...report.orders.map((row) => [
        row.placedDate,
        row.orderNumber,
        row.customerName,
        row.customerEmail,
        row.fulfillmentType,
        row.fulfillmentDate,
        row.status,
        centsToDollars(row.productSubtotalCents),
        centsToDollars(row.addonSubtotalCents),
        centsToDollars(row.deliveryCents),
        centsToDollars(row.tipCents),
        centsToDollars(row.taxableSubtotalCents),
        centsToDollars(row.taxCents),
        centsToDollars(row.totalCents),
        centsToDollars(row.lifetimeRefundedCents),
        row.paymentStatus,
      ]),
    ]);
  }

  if (kind === "sales") {
    return rowsToCsv([
      ["Date", "Orders", "Total Charged", "Tax Collected", "Tips"],
      ...report.daily.map((row) => [
        row.date,
        row.orderCount,
        centsToDollars(row.totalChargedCents),
        centsToDollars(row.taxCollectedCents),
        centsToDollars(row.tipsCents),
      ]),
      [],
      ["Period Summary", "Value"],
      ["Orders", report.summary.orderCount],
      ["Merchandise Sales", centsToDollars(report.summary.merchandiseSalesCents)],
      ["Delivery Sales", centsToDollars(report.summary.deliverySalesCents)],
      ["Gross Sales (excludes tips and tax)", centsToDollars(report.summary.grossSalesCents)],
      ["Tips", centsToDollars(report.summary.tipsCents)],
      ["Gross Receipts Before Tax", centsToDollars(report.summary.grossReceiptsBeforeTaxCents)],
      ["Tax Collected", centsToDollars(report.summary.taxCollectedCents)],
      ["Total Charged", centsToDollars(report.summary.totalChargedCents)],
      ["Successful Refunds Issued", centsToDollars(report.summary.successfulRefundsCents)],
      ["Refunds Excluding Tax", centsToDollars(report.summary.successfulRefundsExcludingTaxCents)],
      ["Tax Refunded", centsToDollars(report.summary.taxRefundedCents)],
      ["Net Receipts Before Tax", centsToDollars(report.summary.netReceiptsBeforeTaxCents)],
      ["Net Tax", centsToDollars(report.summary.netTaxCents)],
      ["Net Payment Activity", centsToDollars(report.summary.netPaymentActivityCents)],
      ["Pending Refunds", centsToDollars(report.summary.pendingRefundsCents)],
      ["Disputed Orders", report.summary.disputedOrderCount],
    ]);
  }

  if (kind === "refunds") {
    return rowsToCsv([
      [
        "Refund Date",
        "Refund ID",
        "Order Number",
        "Status",
        "Refund Amount",
        "Merchandise Refunded",
        "Delivery Refunded",
        "Tips Refunded",
        "Tax Refunded",
        "Custom / Goodwill",
        "Unclassified",
        "Reason",
        "Components",
      ],
      ...report.refunds.map((row) => [
        row.date,
        row.refundId,
        row.orderNumber,
        row.status,
        centsToDollars(row.amountCents),
        centsToDollars(row.merchandisePrincipalCents),
        centsToDollars(row.deliveryPrincipalCents),
        centsToDollars(row.tipPrincipalCents),
        centsToDollars(row.taxAmountCents),
        centsToDollars(row.customCents),
        centsToDollars(row.unclassifiedCents),
        row.reason,
        row.allocationSummary,
      ]),
    ]);
  }

  if (kind === "tax") {
    return rowsToCsv([
      ["Metric", "Amount"],
      ["Taxable Charges", centsToDollars(report.summary.taxableSalesCents)],
      ["Non-taxable Charges", centsToDollars(report.summary.nonTaxableSalesCents)],
      ["Tax Collected", centsToDollars(report.summary.taxCollectedCents)],
      ["Tax Refunded", centsToDollars(report.summary.taxRefundedCents)],
      ["Net Tax", centsToDollars(report.summary.netTaxCents)],
      ["Tax-exempt Orders", report.summary.exemptOrderCount],
      ["Orders With Component Tax Detail", report.summary.taxLineCoverageOrderCount],
      [],
      ["Charge Type", "Gross Charges", "Taxable", "Non-taxable", "Tax Collected"],
      [
        "Merchandise",
        centsToDollars(report.summary.merchandiseSalesCents),
        centsToDollars(report.summary.merchandiseTaxableCents),
        centsToDollars(report.summary.merchandiseNonTaxableCents),
        centsToDollars(report.summary.merchandiseTaxCents),
      ],
      [
        "Delivery",
        centsToDollars(report.summary.deliverySalesCents),
        centsToDollars(report.summary.deliveryTaxableCents),
        centsToDollars(report.summary.deliveryNonTaxableCents),
        centsToDollars(report.summary.deliveryTaxCents),
      ],
      [
        "Tips / Gratuities",
        centsToDollars(report.summary.tipsCents),
        centsToDollars(report.summary.tipsTaxableCents),
        centsToDollars(report.summary.tipsNonTaxableCents),
        centsToDollars(report.summary.tipsTaxCents),
      ],
      [],
      ["Country", "State", "County", "City", "Jurisdiction Code", "Rate", "Taxable Charges", "Tax Collected"],
      ...report.taxJurisdictions.map((row) => [
        row.country,
        row.state,
        row.county,
        row.city,
        row.jurisdictionCode,
        row.rate === null ? "" : row.rate,
        row.taxableSalesCents === null ? "" : centsToDollars(row.taxableSalesCents),
        centsToDollars(row.taxCollectedCents),
      ]),
    ]);
  }

  return rowsToCsv([
    ["Type", "Name", "Detail", "Quantity Sold", "Gross Sales"],
    ...report.products.map((row) => [
      row.kind,
      row.name,
      row.detail,
      row.quantity,
      centsToDollars(row.grossSalesCents),
    ]),
  ]);
}
