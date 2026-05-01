export const PAYMENT_METHODS = [
  "venmo",
  "cashapp",
  "zelle",
  "paypal",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

type PaymentMethodsShape = Partial<Record<PaymentMethod, string>> & {
  default?: PaymentMethod;
};

export function getAvailablePaymentMethods(paymentMethods?: PaymentMethodsShape) {
  return PAYMENT_METHODS.filter((method) => {
    const value = paymentMethods?.[method];
    return typeof value === "string" && value.trim() !== "";
  });
}

export function getPreferredPaymentMethod(paymentMethods?: PaymentMethodsShape) {
  const available = getAvailablePaymentMethods(paymentMethods);
  if (!available.length) return null;

  const preferred = paymentMethods?.default;
  if (preferred && available.includes(preferred)) {
    return preferred;
  }

  return available[0];
}