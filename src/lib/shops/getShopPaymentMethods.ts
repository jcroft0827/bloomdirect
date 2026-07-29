/**
 * -----------------------------------------------------------------------------
 * GetBloomDirect
 * -----------------------------------------------------------------------------
 * Shop Payment Method Helpers
 *
 * Purpose:
 * Centralizes all logic related to a shop's configured payment methods.
 *
 * This helper determines:
 *   • Which payment methods are currently configured.
 *   • Whether a shop is eligible to receive orders based on payment setup.
 *   • Which payment method should be presented as the shop's preferred
 *     receiving method.
 *
 * Why this exists:
 * Order eligibility, settlements, directory search, and the future POS API
 * should all use the exact same payment validation rules. By keeping this
 * logic in one place, we avoid duplicate implementations and ensure the
 * platform behaves consistently.
 *
 * NOTE:
 * This helper validates payment methods configured on a Shop account.
 * It does NOT process payments or settlements.
 * -----------------------------------------------------------------------------
 */

export const SHOP_PAYMENT_METHODS = [
  "venmo",
  "cashapp",
  "zelle",
  "paypal",
] as const;

export type ShopPaymentMethod = (typeof SHOP_PAYMENT_METHODS)[number];

export type ShopPaymentMethods = {
  venmoHandle?: unknown;
  cashAppTag?: unknown;
  zellePhoneOrEmail?: unknown;
  paypalEmail?: unknown;
  defaultPaymentMethod?: unknown;
};

const paymentMethodFields: Record<
  ShopPaymentMethod,
  keyof ShopPaymentMethods
> = {
  venmo: "venmoHandle",
  cashapp: "cashAppTag",
  zelle: "zellePhoneOrEmail",
  paypal: "paypalEmail",
};

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function getAvailableShopPaymentMethods(
  paymentMethods?: ShopPaymentMethods | null,
): ShopPaymentMethod[] {
  if (!paymentMethods) {
    return [];
  }

  return SHOP_PAYMENT_METHODS.filter((method) => {
    const field = paymentMethodFields[method];
    return hasNonEmptyString(paymentMethods[field]);
  });
}

export function hasValidReceivingPaymentMethod(
  paymentMethods?: ShopPaymentMethods | null,
): boolean {
  return getAvailableShopPaymentMethods(paymentMethods).length > 0;
}

export function getPreferredShopPaymentMethod(
  paymentMethods?: ShopPaymentMethods | null,
): ShopPaymentMethod | null {
  const availableMethods = getAvailableShopPaymentMethods(paymentMethods);

  if (availableMethods.length === 0) {
    return null;
  }

  const defaultMethod = paymentMethods?.defaultPaymentMethod;

  if (
    typeof defaultMethod === "string" &&
    SHOP_PAYMENT_METHODS.includes(defaultMethod as ShopPaymentMethod) &&
    availableMethods.includes(defaultMethod as ShopPaymentMethod)
  ) {
    return defaultMethod as ShopPaymentMethod;
  }

  return availableMethods[0];
}