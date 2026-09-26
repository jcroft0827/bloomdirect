import type { TfposSafePaymentDetails } from "./getTfposSafePaymentDetails";

export type TfposTransportProtocol = "ftp" | "ftps" | "sftp";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function xml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function money(cents: unknown) {
  const value = Number(cents);
  return Number.isFinite(value) ? (value / 100).toFixed(2) : "0.00";
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function effectiveTaxRate(order: any) {
  const taxable = number(order?.totals?.taxableSubtotalCents);
  const tax = number(order?.totals?.taxAmountCents);

  if (taxable <= 0 || tax <= 0) return 0;
  return (tax / taxable) * 100;
}

function safeFilenamePart(value: unknown) {
  return clean(value)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function formatRecipe(item: any) {
  const ingredients = Array.isArray(item?.recipe?.ingredients)
    ? item.recipe.ingredients
    : [];

  const parts: string[] = [];

  if (clean(item?.tierLabel)) {
    parts.push(`Tier: ${clean(item.tierLabel)}`);
  }

  if (ingredients.length > 0) {
    parts.push(
      `Recipe: ${ingredients
        .map((ingredient: any) => {
          const quantity = number(ingredient?.quantity);
          const unit = clean(ingredient?.unit);
          const name = clean(ingredient?.name);
          const notes = clean(ingredient?.notes);
          return `${quantity}${unit ? ` ${unit}` : ""} ${name}${notes ? ` (${notes})` : ""}`.trim();
        })
        .filter(Boolean)
        .join("; ")}`,
    );
  }

  if (clean(item?.recipe?.designerInstructions)) {
    parts.push(`Designer instructions: ${clean(item.recipe.designerInstructions)}`);
  }

  return parts.join(" | ");
}

function productXml({
  quantity,
  unitCostCents,
  itemNumber,
  itemName,
  description,
}: {
  quantity: number;
  unitCostCents: number;
  itemNumber: string;
  itemName: string;
  description: string;
}) {
  return [
    "<product>",
    "<productDetails>",
    `<productDetailsUnitCount>${xml(quantity)}</productDetailsUnitCount>`,
    `<productDetailsUnitCost>${xml(money(unitCostCents))}</productDetailsUnitCost>`,
    `<productDetailsItemNumber>${xml(itemNumber)}</productDetailsItemNumber>`,
    `<productDetailsItemName>${xml(itemName)}</productDetailsItemName>`,
    `<productDetailsItemDescription>${xml(description)}</productDetailsItemDescription>`,
    "</productDetails>",
    "</product>",
  ].join("");
}

function productLines(order: any) {
  const lines: string[] = [];

  for (const item of Array.isArray(order?.items) ? order.items : []) {
    lines.push(
      productXml({
        quantity: Math.max(1, Math.trunc(number(item?.quantity))),
        unitCostCents: number(item?.unitPriceCents),
        itemNumber: clean(item?.sku),
        itemName: clean(item?.name),
        description: formatRecipe(item),
      }),
    );

    for (const addon of Array.isArray(item?.addons) ? item.addons : []) {
      lines.push(
        productXml({
          quantity: Math.max(1, Math.trunc(number(addon?.quantity))),
          unitCostCents: number(addon?.unitPriceCents),
          itemNumber: clean(addon?.sku),
          itemName: clean(addon?.name) || "Add-on",
          description: clean(addon?.category)
            ? `BloomWebsite add-on · ${clean(addon.category)}`
            : "BloomWebsite add-on",
        }),
      );
    }
  }

  const tipCents = number(order?.totals?.tipCents);
  if (tipCents > 0) {
    lines.push(
      productXml({
        quantity: 1,
        unitCostCents: tipCents,
        itemNumber: "BLOOM-TIP",
        itemName: "Gratuity",
        description: "Customer gratuity collected by BloomWebsites.",
      }),
    );
  }

  return lines.join("");
}

function buildOrderNotes(order: any, payment: TfposSafePaymentDetails) {
  const notes = [
    `BloomWebsites order ${clean(order?.orderNumber)}`,
    `Payment provider: ${clean(order?.payment?.provider) || "unknown"}`,
    payment.transactionId ? `Processor transaction: ${payment.transactionId}` : "",
    `Bloom tax collected: ${money(order?.totals?.taxAmountCents)}`,
  ].filter(Boolean);

  const taxLines = Array.isArray(order?.tax?.lines) ? order.tax.lines : [];
  const distinctTaxRates = new Set(
    taxLines
      .filter((line: any) => number(line?.taxableAmountCents) > 0)
      .map((line: any) => {
        const base = number(line?.taxableAmountCents);
        const tax = number(line?.taxAmountCents);
        return base > 0 ? ((tax / base) * 100).toFixed(4) : "0.0000";
      }),
  );

  if (distinctTaxRates.size > 1) {
    notes.push(
      "Bloom used mixed tax rates/taxability on this order; payment total is authoritative.",
    );
  }

  return notes.join(" | ");
}

export function buildTfposRemoteFilename(order: any) {
  const orderNumber = safeFilenamePart(order?.orderNumber) || "ORDER";
  return `${orderNumber}.xml`;
}

export function generateTfposXml({
  order,
  payment,
  protocol = "sftp",
  sourceVendor = "BloomWebsites",
}: {
  order: any;
  payment: TfposSafePaymentDetails;
  protocol?: TfposTransportProtocol;
  sourceVendor?: string;
}) {
  if (!order) throw new Error("A BloomWebsite order is required.");

  if (
    order?.payment?.status !== "paid" &&
    order?.payment?.status !== "partially_refunded" &&
    order?.payment?.status !== "refunded"
  ) {
    throw new Error("TFPOS export is only available for paid BloomWebsite orders.");
  }

  const isPickup = order?.fulfillment?.type === "pickup";
  const deliveryAddress = isPickup
    ? order?.fulfillment?.pickupLocation?.address || {}
    : order?.fulfillment?.deliveryAddress || {};

  const customerAddress = payment.billingAddress || {
    address1: "",
    address2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  };

  const recipientFirstName =
    clean(order?.recipient?.firstName) || clean(order?.customer?.firstName);
  const recipientLastName =
    clean(order?.recipient?.lastName) || clean(order?.customer?.lastName);
  const recipientPhone =
    clean(order?.recipient?.phone) || clean(order?.customer?.phone);

  const deliveryBusinessName = isPickup
    ? clean(order?.fulfillment?.pickupLocation?.businessName)
    : clean(order?.recipient?.company);

  const deliveryInstructions = isPickup
    ? clean(order?.fulfillment?.pickupLocation?.instructions)
    : clean(order?.recipient?.deliveryInstructions);

  const taxRate = effectiveTaxRate(order).toFixed(4);
  const paymentTotal = money(order?.totals?.totalCents);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<IncomingOrder>",
    "<interface>",
    "<interfaceType>Generic</interfaceType>",
    `<interfaceMethod>${xml(protocol)}</interfaceMethod>`,
    "</interface>",
    "<source>",
    "<sourceType>Website</sourceType>",
    `<sourceVendor>${xml(sourceVendor)}</sourceVendor>`,
    "<sourceVersion>1.0</sourceVersion>",
    "</source>",
    "<order>",
    `<orderNumber>${xml(clean(order?.orderNumber))}</orderNumber>`,
    "<customer>",
    "<customerAcctId></customerAcctId>",
    "<customerBusinessName></customerBusinessName>",
    `<customerNameFirst>${xml(clean(order?.customer?.firstName))}</customerNameFirst>`,
    `<customerNameLast>${xml(clean(order?.customer?.lastName))}</customerNameLast>`,
    `<customerPhone>${xml(clean(order?.customer?.phone))}</customerPhone>`,
    `<customerAddress>${xml(clean(customerAddress.address1))}</customerAddress>`,
    `<customerCity>${xml(clean(customerAddress.city))}</customerCity>`,
    `<customerState>${xml(clean(customerAddress.state))}</customerState>`,
    `<customerZip>${xml(clean(customerAddress.postalCode))}</customerZip>`,
    `<customerCountry>${xml(clean(customerAddress.country) || "US")}</customerCountry>`,
    `<customerEmail>${xml(clean(order?.customer?.email))}</customerEmail>`,
    "</customer>",
    "<recipient>",
    `<recipientFirstName>${xml(recipientFirstName)}</recipientFirstName>`,
    `<recipientLastName>${xml(recipientLastName)}</recipientLastName>`,
    `<recipientPhone>${xml(recipientPhone)}</recipientPhone>`,
    "</recipient>",
    "<card>",
    `<cardMessage>${xml(clean(order?.cardMessage) || "[No Card Message]")}</cardMessage>`,
    "<cardType>Other</cardType>",
    "</card>",
    "<delivery>",
    `<deliveryDate>${xml(clean(order?.fulfillment?.requestedDate))}</deliveryDate>`,
    `<deliveryBusinessName>${xml(deliveryBusinessName)}</deliveryBusinessName>`,
    `<deliveryAddress1>${xml(clean(deliveryAddress?.address1))}</deliveryAddress1>`,
    `<deliveryAddress2>${xml(clean(deliveryAddress?.address2))}</deliveryAddress2>`,
    `<deliveryCity>${xml(clean(deliveryAddress?.city))}</deliveryCity>`,
    `<deliveryState>${xml(clean(deliveryAddress?.state))}</deliveryState>`,
    `<deliveryZipCode>${xml(clean(deliveryAddress?.postalCode))}</deliveryZipCode>`,
    `<deliveryInstructions>${xml(deliveryInstructions)}</deliveryInstructions>`,
    `<deliveryCharge>${xml(money(order?.totals?.fulfillmentFeeCents))}</deliveryCharge>`,
    "<wireout>N</wireout>",
    "<wireoutServiceCharge>0.00</wireoutServiceCharge>",
    `<pickup>${isPickup ? "Y" : "N"}</pickup>`,
    `<orderTaxPercent>${xml(taxRate)}</orderTaxPercent>`,
    `<orderNotes>${xml(buildOrderNotes(order, payment))}</orderNotes>`,
    "</delivery>",
    productLines(order),
    "<payment>",
    "<paymentType>CC</paymentType>",
    `<paymentCardType>${xml(payment.cardType || "CC")}</paymentCardType>`,
    "<paymentCardNumber></paymentCardNumber>",
    "<paymentCardExpiration></paymentCardExpiration>",
    "<paymentCardCVS></paymentCardCVS>",
    `<paymentCardZip>${xml(clean(payment.billingAddress?.postalCode))}</paymentCardZip>`,
    `<paymentCardHolderName>${xml(clean(payment.cardholderName))}</paymentCardHolderName>`,
    `<paymentCardApproval>${xml(clean(payment.approvalCode) || "Paid")}</paymentCardApproval>`,
    `<paymentCardTransID>${xml(clean(payment.transactionId) || clean(order?.payment?.providerPaymentId))}</paymentCardTransID>`,
    "<discountValue>0.00</discountValue>",
    "<discountCode></discountCode>",
    `<paymentTotal>${xml(paymentTotal)}</paymentTotal>`,
    "</payment>",
    "</order>",
    "</IncomingOrder>",
  ].join("");
}
