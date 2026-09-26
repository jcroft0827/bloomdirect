import BloomWebsiteMerchantConnection from "@/models/BloomWebsiteMerchantConnection";

type SafeAddress = {
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type TfposSafePaymentDetails = {
  cardType: string;
  cardholderName: string;
  billingAddress: SafeAddress;
  approvalCode: string;
  transactionId: string;
};

const emptyAddress: SafeAddress = {
  address1: "",
  address2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCardBrand(value: unknown) {
  const brand = clean(value).toLowerCase();

  switch (brand) {
    case "visa":
      return "VISA";
    case "mastercard":
      return "MASTERCARD";
    case "amex":
      return "AMEX";
    case "discover":
      return "DISCOVER";
    case "diners":
      return "DINERS";
    case "jcb":
      return "JCB";
    case "unionpay":
      return "UNIONPAY";
    default:
      return brand ? brand.toUpperCase() : "CC";
  }
}

async function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) return null;

  const StripeSdk = (await import("stripe")).default;
  return new StripeSdk(secretKey);
}

/**
 * Retrieves only processor metadata that is safe and useful for a POS export.
 * Bloom never requests, stores, or exports PAN/CVV/card expiration here.
 */
export async function getTfposSafePaymentDetails(order: any) {
  const providerPaymentId = clean(order?.payment?.providerPaymentId);
  const fallback: TfposSafePaymentDetails = {
    cardType: clean(order?.payment?.provider).toUpperCase() || "CC",
    cardholderName:
      `${clean(order?.customer?.firstName)} ${clean(order?.customer?.lastName)}`.trim(),
    billingAddress: { ...emptyAddress },
    approvalCode: clean(order?.payment?.provider) || "Paid",
    transactionId: providerPaymentId,
  };

  if (
    order?.payment?.provider !== "stripe" ||
    !providerPaymentId ||
    !order?.payment?.merchantConnectionId
  ) {
    return fallback;
  }

  const connection = await BloomWebsiteMerchantConnection.findById(
    order.payment.merchantConnectionId,
  )
    .select("provider providerAccountId")
    .lean<any>();

  if (!connection?.providerAccountId || connection.provider !== "stripe") {
    return fallback;
  }

  const stripe = await getStripe();
  if (!stripe) return fallback;

  try {
    const intent = await stripe.paymentIntents.retrieve(
      providerPaymentId,
      {
        expand: ["latest_charge", "payment_method"],
      },
      {
        stripeAccount: connection.providerAccountId,
      },
    );

    const charge =
      intent.latest_charge && typeof intent.latest_charge !== "string"
        ? (intent.latest_charge as any)
        : null;

    const paymentMethod =
      intent.payment_method && typeof intent.payment_method !== "string"
        ? (intent.payment_method as any)
        : null;

    const billingDetails = paymentMethod?.billing_details || charge?.billing_details;
    const billingAddress = billingDetails?.address || {};
    const cardDetails = charge?.payment_method_details?.card || paymentMethod?.card;

    return {
      cardType: normalizeCardBrand(cardDetails?.brand),
      cardholderName:
        clean(billingDetails?.name) || fallback.cardholderName,
      billingAddress: {
        address1: clean(billingAddress?.line1),
        address2: clean(billingAddress?.line2),
        city: clean(billingAddress?.city),
        state: clean(billingAddress?.state),
        postalCode: clean(billingAddress?.postal_code),
        country: clean(billingAddress?.country).toUpperCase() || "US",
      },
      approvalCode:
        clean(cardDetails?.authorization_code) ||
        clean(charge?.payment_method_details?.card?.authorization_code) ||
        "Stripe",
      transactionId: clean(charge?.id) || intent.id,
    };
  } catch (error) {
    console.error("TFPOS Stripe metadata lookup failed:", error);
    return fallback;
  }
}
