"use client";

import { useBloomWebsiteCart } from "@/components/websites/storefront/BloomWebsiteCartProvider";
import BloomWebsiteCheckoutSteps from "@/components/websites/storefront/BloomWebsiteCheckoutSteps";
import {
  type BloomWebsiteValidatedDelivery,
  type BloomWebsiteValidatedPickup,
  useBloomWebsiteCheckout,
} from "@/components/websites/storefront/BloomWebsiteCheckoutProvider";
import {
  loadBloomStripeJs,
  type BloomStripe,
  type BloomStripeElement,
  type BloomStripeElements,
} from "@/lib/bloom-websites/payments/loadBloomStripeJs";

import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
} from "lucide-react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type BloomWebsitePaymentCheckoutProps = {
  previewSlug: string;
  basePath?: string;
};

type DeliveryApiSuccess = {
  eligible: true;
  address: {
    formattedAddress: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    lat: number;
    lng: number;
    placeId: string;
  };
  delivery: {
    requestedDate: string;
    sameDay: boolean;
    distanceMiles: number | null;
    feeCents: number;
  };
  cart: {
    itemCount: number;
    productSubtotalCents: number;
    addonSubtotalCents: number;
    subtotalCents: number;
    taxableSubtotalCents: number;
    containsLocalOnlyProducts: boolean;
  };
  totals: {
    subtotalCents: number;
    deliveryFeeCents: number;
    totalBeforeTaxCents: number;
  };
};

type DeliveryApiFailure = {
  eligible?: false;
  reason?: string;
  message?: string;
  error?: string;
};

type PickupApiSuccess = {
  eligible: true;
  pickup: {
    requestedDate: string;
    sameDay: boolean;
    preparationMinutes: number;
    instructions: string;
  };
  location: {
    businessName: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    formattedAddress: string;
  };
  cart: {
    itemCount: number;
    productSubtotalCents: number;
    addonSubtotalCents: number;
    subtotalCents: number;
    taxableSubtotalCents: number;
  };
  totals: {
    subtotalCents: number;
    deliveryFeeCents: 0;
    totalBeforeTaxCents: number;
  };
};

type PickupApiFailure = {
  eligible?: false;
  reason?: string;
  message?: string;
  error?: string;
};

type PaymentTotals = {
  subtotalCents: number;
  fulfillmentFeeCents: number;
  taxAmountCents: number;
  tipCents: number;
  totalCents: number;
};

type PreparedPayment = {
  attemptId: string;
  provider: "stripe" | "fiserv";
  providerPaymentId: string;
  providerStatus: string;
  amountCents: number;
  clientSecret?: string;
  redirectUrl?: string;
  stripeAccountId?: string;
  totals: PaymentTotals;
  existing: boolean;
};

type StoredAttempt = {
  signature: string;
  idempotencyKey: string;
  attemptId: string;
};

const inputClassName =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-4 focus:ring-gray-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500";

function formatMoneyFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDeliveryDate(value: string) {
  if (!value) return "";

  const date = new Date(`${value}T12:00:00Z`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `bw-checkout:${crypto.randomUUID()}`;
  }

  return `bw-checkout:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function BloomWebsitePaymentCheckout({
  previewSlug,
  basePath,
}: BloomWebsitePaymentCheckoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const storefrontBasePath =
    basePath ?? `/websites/preview/${encodeURIComponent(previewSlug)}`;

  const {
    items,
    itemCount,
    openCart,
    clearCart,
    syncArrangementContainerNotes,
  } = useBloomWebsiteCart();

  const {
    hasLoadedStorage,
    fulfillmentType,
    recipient,
    customer,
    deliveryAddress,
    requestedDate,
    pickupRequestedDate,
    deliveryInstructions,
    cardMessage,
    cardSignature,
    validatedDelivery,
    validatedPickup,
    setCustomer,
    setValidatedDelivery,
    setValidatedPickup,
    clearCheckout,
  } = useBloomWebsiteCheckout();

  const [isRevalidating, setIsRevalidating] = useState(false);
  const [revalidationError, setRevalidationError] = useState<string | null>(
    null,
  );
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isReturnProcessing, setIsReturnProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentErrorAction, setPaymentErrorAction] = useState<{
    href: string;
    label: string;
  } | null>(null);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [preparedPayment, setPreparedPayment] =
    useState<PreparedPayment | null>(null);

  const hasRevalidatedRef = useRef(false);
  const stripeRef = useRef<BloomStripe | null>(null);
  const stripeElementsRef = useRef<BloomStripeElements | null>(null);
  const paymentElementRef = useRef<BloomStripeElement | null>(null);

  const messageHref = `${storefrontBasePath}/checkout/message`;
  const deliveryHref = `${storefrontBasePath}/checkout/delivery`;
  const attemptStorageKey = `bloomwebsites-payment-attempt:${previewSlug}`;

  const selectedValidation =
    fulfillmentType === "pickup" ? validatedPickup : validatedDelivery;

  const requestedFulfillmentDate =
    fulfillmentType === "pickup" ? pickupRequestedDate : requestedDate;

  const cartItems = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId,
        tier: item.tier.label,
        addonIds: item.addons.map((addon) => addon.id),
        quantity: item.quantity,
      })),
    [items],
  );

  const checkoutPayload = useMemo(
    () => ({
      items: cartItems,
      fulfillmentType,
      requestedDate: requestedFulfillmentDate,
      customer: {
        firstName: customer.firstName.trim(),
        lastName: customer.lastName.trim(),
        email: customer.email.trim().toLowerCase(),
        phone: customer.phone.trim(),
      },
      recipient: {
        firstName: recipient.firstName.trim(),
        lastName: recipient.lastName.trim(),
        phone: recipient.phone.trim(),
      },
      deliveryAddress:
        fulfillmentType === "delivery"
          ? {
              address1: deliveryAddress.address1.trim(),
              address2: deliveryAddress.address2.trim(),
              city: deliveryAddress.city.trim(),
              state: deliveryAddress.state.trim(),
              zip: deliveryAddress.zip.trim(),
            }
          : {
              address1: "",
              address2: "",
              city: "",
              state: "",
              zip: "",
            },
      deliveryInstructions: deliveryInstructions.trim(),
      cardMessage: cardMessage.trim(),
      cardSignature: cardSignature.trim(),
    }),
    [
      cardMessage,
      cardSignature,
      cartItems,
      customer.email,
      customer.firstName,
      customer.lastName,
      customer.phone,
      deliveryAddress.address1,
      deliveryAddress.address2,
      deliveryAddress.city,
      deliveryAddress.state,
      deliveryAddress.zip,
      deliveryInstructions,
      fulfillmentType,
      recipient.firstName,
      recipient.lastName,
      recipient.phone,
      requestedFulfillmentDate,
    ],
  );

  const checkoutSignature = useMemo(
    () => JSON.stringify(checkoutPayload),
    [checkoutPayload],
  );

  function readStoredAttempt(): StoredAttempt | null {
    try {
      const raw = window.sessionStorage.getItem(attemptStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<StoredAttempt>;

      if (
        typeof parsed.signature === "string" &&
        typeof parsed.idempotencyKey === "string" &&
        typeof parsed.attemptId === "string"
      ) {
        return parsed as StoredAttempt;
      }
    } catch {
      // Ignore malformed or unavailable storage.
    }

    return null;
  }

  function persistStoredAttempt(value: StoredAttempt) {
    try {
      window.sessionStorage.setItem(attemptStorageKey, JSON.stringify(value));
    } catch {
      // Checkout can continue without persistence.
    }
  }

  function clearStoredAttempt() {
    try {
      window.sessionStorage.removeItem(attemptStorageKey);
    } catch {
      // Ignore storage failures.
    }
  }

  async function finalizeAttempt(attemptId: string) {
    let lastMessage =
      "Payment is still processing. Please do not submit another payment.";

    for (let index = 0; index < 8; index += 1) {
      const response = await fetch(
        `/api/websites/storefront/${encodeURIComponent(previewSlug)}/checkout/payment/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId }),
        },
      );

      const data = await response.json().catch(() => null);

      if (response.ok && data?.completed === true) {
        clearStoredAttempt();
        clearCart();
        clearCheckout();

        router.replace(
          `${storefrontBasePath}/order-confirmation/${encodeURIComponent(attemptId)}`,
        );
        return true;
      }

      lastMessage = typeof data?.error === "string" ? data.error : lastMessage;

      if (data?.retryable !== true) {
        break;
      }

      await wait(1500);
    }

    throw new Error(lastMessage);
  }

  useEffect(() => {
    const returnAttemptId = searchParams.get("attemptId");
    const isPaymentReturn = searchParams.get("payment_return") === "1";

    if (!isPaymentReturn || !returnAttemptId || isReturnProcessing) {
      return;
    }

    setIsReturnProcessing(true);
    setIsPaymentProcessing(true);
    setPaymentError(null);
    setPaymentErrorAction(null);

    void finalizeAttempt(returnAttemptId)
      .catch((error) => {
        setIsPaymentProcessing(false);
        setPaymentError(
          error instanceof Error
            ? error.message
            : "Payment could not be confirmed yet.",
        );
      })
      .finally(() => {
        setIsReturnProcessing(false);
      });
    // finalizeAttempt intentionally uses the latest router/cart/checkout refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const selected =
      fulfillmentType === "pickup" ? validatedPickup : validatedDelivery;

    if (
      !hasLoadedStorage ||
      items.length === 0 ||
      !selected ||
      hasRevalidatedRef.current
    ) {
      return;
    }

    hasRevalidatedRef.current = true;

    async function revalidate() {
      setIsRevalidating(true);
      setRevalidationError(null);

      try {
        if (fulfillmentType === "pickup") {
          const response = await fetch(
            `/api/websites/storefront/${encodeURIComponent(previewSlug)}/pickup`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: cartItems,
                requestedDate: pickupRequestedDate,
              }),
            },
          );

          const data = (await response.json()) as
            | PickupApiSuccess
            | PickupApiFailure;

          if (!response.ok || !("eligible" in data && data.eligible === true)) {
            setValidatedPickup(null);
            setRevalidationError(
              "message" in data && data.message
                ? data.message
                : "Your order details changed and pickup needs to be checked again.",
            );
            return;
          }

          const freshPickup: BloomWebsiteValidatedPickup = {
            requestedDate: data.pickup.requestedDate,
            sameDay: data.pickup.sameDay,
            cartSubtotalCents: data.cart.subtotalCents,
            totalBeforeTaxCents: data.totals.totalBeforeTaxCents,
            preparationMinutes: data.pickup.preparationMinutes,
            instructions: data.pickup.instructions,
            location: data.location,
          };

          setValidatedPickup(freshPickup);
          return;
        }

        const response = await fetch(
          `/api/websites/storefront/${encodeURIComponent(previewSlug)}/delivery`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: cartItems,
              address: deliveryAddress,
              requestedDate,
            }),
          },
        );

        const data = (await response.json()) as
          | DeliveryApiSuccess
          | DeliveryApiFailure;

        if (!response.ok || !("eligible" in data && data.eligible === true)) {
          setValidatedDelivery(null);
          setRevalidationError(
            "message" in data && data.message
              ? data.message
              : "Your order details changed and delivery needs to be checked again.",
          );
          return;
        }

        const freshDelivery: BloomWebsiteValidatedDelivery = {
          address: data.address,
          requestedDate: data.delivery.requestedDate,
          sameDay: data.delivery.sameDay,
          distanceMiles: data.delivery.distanceMiles,
          feeCents: data.delivery.feeCents,
          cartSubtotalCents: data.cart.subtotalCents,
          totalBeforeTaxCents: data.totals.totalBeforeTaxCents,
        };

        setValidatedDelivery(freshDelivery);
      } catch (error) {
        console.error("Unable to revalidate BloomWebsite checkout:", error);
        setRevalidationError(
          fulfillmentType === "pickup"
            ? "We couldn't refresh your pickup details. Please return to Fulfillment and try again."
            : "We couldn't refresh your delivery details. Please return to Fulfillment and try again.",
        );
      } finally {
        setIsRevalidating(false);
      }
    }

    void revalidate();
  }, [
    cartItems,
    deliveryAddress,
    fulfillmentType,
    hasLoadedStorage,
    items.length,
    pickupRequestedDate,
    previewSlug,
    requestedDate,
    setValidatedDelivery,
    setValidatedPickup,
    validatedDelivery,
    validatedPickup,
  ]);

  useEffect(() => {
    paymentElementRef.current?.destroy();
    paymentElementRef.current = null;
    stripeElementsRef.current = null;
    stripeRef.current = null;

    if (
      preparedPayment?.provider !== "stripe" ||
      !preparedPayment.clientSecret ||
      !preparedPayment.stripeAccountId
    ) {
      return;
    }

    let canceled = false;

    void loadBloomStripeJs()
      .then((Stripe) => {
        if (canceled) return;

        const publishableKey =
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

        if (!publishableKey) {
          throw new Error(
            "Stripe publishable key is not configured for BloomWebsites.",
          );
        }

        const stripe = Stripe(publishableKey, {
          stripeAccount: preparedPayment.stripeAccountId,
        });

        const elements = stripe.elements({
          clientSecret: preparedPayment.clientSecret!,
          appearance: {
            theme: "stripe",
            variables: {
              borderRadius: "14px",
              fontFamily: "Arial, sans-serif",
            },
          },
        });

        const paymentElement = elements.create("payment", {
          layout: "tabs",
        });

        stripeRef.current = stripe;
        stripeElementsRef.current = elements;
        paymentElementRef.current = paymentElement;
        paymentElement.mount("#bloom-stripe-payment-element");
      })
      .catch((error) => {
        console.error("Unable to mount Stripe Payment Element:", error);
        setPaymentError(
          error instanceof Error
            ? error.message
            : "Secure payment form could not be loaded.",
        );
      });

    return () => {
      canceled = true;
      paymentElementRef.current?.destroy();
      paymentElementRef.current = null;
      stripeElementsRef.current = null;
      stripeRef.current = null;
    };
  }, [preparedPayment]);

  function validatePurchaser() {
    if (!customer.firstName.trim() || !customer.lastName.trim()) {
      return "Please enter the purchaser's first and last name.";
    }

    if (!validEmail(customer.email)) {
      return "Please enter a valid email address for the receipt.";
    }

    return null;
  }

  async function preparePayment() {
    const purchaserError = validatePurchaser();

    if (purchaserError) {
      setPaymentError(purchaserError);
      return;
    }

    if (!selectedValidation) {
      setPaymentError(
        `Please return to Fulfillment and verify ${fulfillmentType}.`,
      );
      return;
    }

    setIsPreparingPayment(true);
    setPaymentError(null);
    setPaymentErrorAction(null);

    try {
      const stored = readStoredAttempt();
      let attemptId =
        stored?.signature === checkoutSignature ? stored.attemptId : "";
      let idempotencyKey =
        stored?.signature === checkoutSignature
          ? stored.idempotencyKey
          : createIdempotencyKey();

      if (!attemptId) {
        const preflightResponse = await fetch(
          `/api/websites/storefront/${encodeURIComponent(previewSlug)}/checkout/preflight`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": idempotencyKey,
            },
            body: JSON.stringify(checkoutPayload),
          },
        );

        const preflight = await preflightResponse.json().catch(() => null);

        if (!preflightResponse.ok || preflight?.ready !== true) {
          if (
            preflight?.code === "RECIPIENT_INCOMPLETE" ||
            preflight?.code === "RECIPIENT_PHONE_REQUIRED"
          ) {
            setPaymentErrorAction({
              href: deliveryHref,
              label: "Return to Recipient & Fulfillment",
            });
          }

          throw new Error(
            preflight?.error || "We couldn't verify your order before payment.",
          );
        }

        attemptId = preflight.attemptId;

        persistStoredAttempt({
          signature: checkoutSignature,
          idempotencyKey,
          attemptId,
        });

        const authoritativeItems: unknown[] = Array.isArray(
          preflight?.cart?.items,
        )
          ? preflight.cart.items
          : [];

        const authoritativeNotes = authoritativeItems
          .filter(
            (
              item: unknown,
            ): item is {
              productId: string;
              tier: "standard" | "deluxe" | "premium";
              arrangementContainerNote?: string;
            } => {
              if (!item || typeof item !== "object") return false;

              const candidate = item as Record<string, unknown>;

              return (
                typeof candidate.productId === "string" &&
                (candidate.tier === "standard" ||
                  candidate.tier === "deluxe" ||
                  candidate.tier === "premium")
              );
            },
          )
          .map((item) => ({
            productId: item.productId,
            tier: item.tier,
            arrangementContainerNote:
              typeof item.arrangementContainerNote === "string"
                ? item.arrangementContainerNote
                : "",
          }));

        const noteMap = new Map(
          authoritativeNotes.map((item) => [
            `${item.productId}::${item.tier}`,
            item.arrangementContainerNote,
          ]),
        );

        const arrangementNoteChanged = items.some((item) => {
          const key = `${item.productId}::${item.tier.label}`;

          return (
            noteMap.has(key) &&
            (item.arrangementContainerNote ?? "") !== noteMap.get(key)
          );
        });

        if (arrangementNoteChanged) {
          syncArrangementContainerNotes(authoritativeNotes);
          throw new Error(
            "Arrangement details were updated. Please review the arrangement & container note, then continue to payment again.",
          );
        }
      }

      const prepareResponse = await fetch(
        `/api/websites/storefront/${encodeURIComponent(previewSlug)}/checkout/payment/prepare`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId,
            ...checkoutPayload,
            tipCents: 0,
          }),
        },
      );

      const prepared = await prepareResponse.json().catch(() => null);

      if (!prepareResponse.ok || prepared?.ready !== true) {
        if (
          prepared?.code === "CHECKOUT_FINGERPRINT_MISMATCH" ||
          prepared?.code === "CHECKOUT_ATTEMPT_FAILED"
        ) {
          clearStoredAttempt();
        }

        throw new Error(
          prepared?.error || "Secure payment could not be prepared.",
        );
      }

      if (prepared.provider !== "stripe") {
        throw new Error(
          "This florist's selected payment processor is not activated for storefront checkout yet.",
        );
      }

      if (!prepared.clientSecret || !prepared.stripeAccountId) {
        throw new Error(
          "Stripe did not return the information needed to display secure payment.",
        );
      }

      setPreparedPayment(prepared as PreparedPayment);
    } catch (error) {
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Secure payment could not be prepared.",
      );
    } finally {
      setIsPreparingPayment(false);
    }
  }

  async function recoverCardFailure(attemptId: string) {
    const response = await fetch(
      `/api/websites/storefront/${encodeURIComponent(previewSlug)}/checkout/payment/failure`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.error || "Payment failure could not be reconciled yet.",
      );
    }

    return data as {
      reset?: boolean;
      completed?: boolean;
      processing?: boolean;
      orderId?: string;
      orderNumber?: string;
      providerStatus?: string;
    };
  }

  async function placeOrder() {
    if (
      !preparedPayment ||
      preparedPayment.provider !== "stripe" ||
      !stripeRef.current ||
      !stripeElementsRef.current
    ) {
      setPaymentError("Secure payment is still loading. Please wait a moment.");
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError(null);
    setPaymentErrorAction(null);

    try {
      const returnUrl =
        `${window.location.origin}${storefrontBasePath}/checkout/payment` +
        `?payment_return=1&attemptId=${encodeURIComponent(preparedPayment.attemptId)}`;

      const result = await stripeRef.current.confirmPayment({
        elements: stripeElementsRef.current,
        confirmParams: {
          return_url: returnUrl,
          receipt_email: customer.email.trim().toLowerCase(),
        },
        redirect: "if_required",
      });

      if (result.error) {
        const message =
          result.error.message ||
          "Your payment could not be completed. Please check the card details and try again.";

        /*
         * Stripe card declines normally leave the PaymentIntent in
         * requires_payment_method. Bloom reserved inventory before processor
         * handoff, so reconcile that known failure server-side before leaving
         * the customer on the payment screen. The server re-reads Stripe and
         * only releases inventory after it has safely canceled the old intent.
         * Ambiguous/processing/succeeded outcomes never release stock here.
         */
        if (result.error.type === "card_error") {
          try {
            const recovery = await recoverCardFailure(
              preparedPayment.attemptId,
            );

            if (recovery.completed === true) {
              clearStoredAttempt();
              clearCart();
              clearCheckout();

              router.replace(
                `${storefrontBasePath}/order-confirmation/${encodeURIComponent(preparedPayment.attemptId)}`,
              );
              return;
            }

            if (recovery.processing === true) {
              setIsPaymentProcessing(true);
              await finalizeAttempt(preparedPayment.attemptId);
              return;
            }

            if (recovery.reset === true) {
              clearStoredAttempt();
              setPreparedPayment(null);
              setPaymentError(
                `${message} No order was placed. Please try again with another payment method.`,
              );
              return;
            }
          } catch (recoveryError) {
            console.error(
              "Unable to reconcile declined BloomWebsite payment:",
              recoveryError,
            );
          }
        }

        throw new Error(message);
      }

      /*
       * Stripe must be allowed to read the mounted Payment Element before we
       * replace the checkout UI with the processing screen. Switching screens
       * earlier unmounts the Element and causes Stripe to report that it could
       * not retrieve data from the specified Element.
       *
       * Once Stripe has accepted the payment details, it is safe to show the
       * processing screen while Bloom verifies the PaymentIntent, commits the
       * canonical order, clears checkout state, and redirects to confirmation.
       */
      setIsPaymentProcessing(true);

      await finalizeAttempt(preparedPayment.attemptId);
    } catch (error) {
      setIsPaymentProcessing(false);
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Payment could not be completed.",
      );
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  if (isPaymentProcessing || isReturnProcessing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
        <div className="max-w-md rounded-[2rem] border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-10">
          <Loader2
            size={34}
            className="mx-auto animate-spin"
            style={{ color: "var(--bloom-primary)" }}
          />
          <h1 className="mt-5 text-2xl font-black text-gray-950">
            Your payment is being processed
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            Please be patient and keep this page open. We&apos;re confirming
            your payment and creating your order. Do not refresh or submit
            another payment.
          </p>
        </div>
      </main>
    );
  }

  if (!hasLoadedStorage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
        <div className="flex items-center gap-3 text-sm font-black text-gray-500">
          <Loader2 size={20} className="animate-spin" />
          Loading checkout...
        </div>
      </main>
    );
  }

  if (items.length === 0 && searchParams.get("payment_return") !== "1") {
    return (
      <main className="min-h-screen bg-gray-50 px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-12">
          <ShoppingBag
            size={30}
            className="mx-auto"
            style={{ color: "var(--bloom-primary)" }}
          />
          <h1 className="mt-5 text-2xl font-black text-gray-950">
            Your cart is empty
          </h1>
          <Link
            href={storefrontBasePath || "/"}
            className="mt-7 inline-flex rounded-full px-6 py-3.5 text-sm font-black transition hover:opacity-90"
            style={{
              backgroundColor: "var(--bloom-primary)",
              color: "var(--bloom-primary-foreground)",
            }}
          >
            Return to Shop
          </Link>
        </div>
      </main>
    );
  }

  if (!selectedValidation && !isRevalidating) {
    return (
      <main className="min-h-screen bg-gray-50 px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-12">
          {fulfillmentType === "pickup" ? (
            <Store size={30} className="mx-auto text-amber-600" />
          ) : (
            <MapPin size={30} className="mx-auto text-amber-600" />
          )}
          <h1 className="mt-5 text-2xl font-black text-gray-950">
            {fulfillmentType === "pickup"
              ? "Pickup needs to be checked again"
              : "Delivery needs to be checked again"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            {revalidationError ||
              `Please verify ${fulfillmentType} before continuing to payment.`}
          </p>
          <Link
            href={deliveryHref}
            className="mt-7 inline-flex rounded-full px-6 py-3.5 text-sm font-black transition hover:opacity-90"
            style={{
              backgroundColor: "var(--bloom-primary)",
              color: "var(--bloom-primary-foreground)",
            }}
          >
            Return to Fulfillment
          </Link>
        </div>
      </main>
    );
  }

  const displayTotals = preparedPayment?.totals;
  const formLocked = preparedPayment !== null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <Link
            href={messageHref}
            className="inline-flex items-center gap-2 text-sm font-black text-gray-700 transition hover:text-gray-950"
          >
            <ArrowLeft size={17} />
            Back to Card Message
          </Link>

          <button
            type="button"
            onClick={openCart}
            disabled={formLocked}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag size={17} />
            Cart ({itemCount})
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
        <BloomWebsiteCheckoutSteps currentStep="payment" />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <section className="space-y-6">
            <div>
              <p
                className="text-sm font-black uppercase tracking-[0.16em]"
                style={{ color: "var(--bloom-accent)" }}
              >
                Payment
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                Almost there
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
                Confirm who is placing the order, then securely enter payment.
              </p>
            </div>

            {isRevalidating && (
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm font-bold text-gray-600 shadow-sm">
                <Loader2 size={18} className="animate-spin" />
                Refreshing pricing and fulfillment availability...
              </div>
            )}

            {paymentError && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p>{paymentError}</p>
                  {paymentErrorAction && (
                    <Link
                      href={paymentErrorAction.href}
                      className="mt-2 inline-flex font-black text-red-900 underline decoration-red-300 underline-offset-4"
                    >
                      {paymentErrorAction.label}
                    </Link>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--bloom-primary) 10%, white)",
                    color: "var(--bloom-primary)",
                  }}
                >
                  <UserRound size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-gray-950">
                    Your Information
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    We&apos;ll send the receipt and confirmation here.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-black text-gray-800">
                  First Name
                  <input
                    type="text"
                    value={customer.firstName}
                    disabled={formLocked}
                    onChange={(event) =>
                      setCustomer({
                        ...customer,
                        firstName: event.target.value,
                      })
                    }
                    className={inputClassName}
                    autoComplete="given-name"
                    placeholder="First name"
                  />
                </label>

                <label className="text-sm font-black text-gray-800">
                  Last Name
                  <input
                    type="text"
                    value={customer.lastName}
                    disabled={formLocked}
                    onChange={(event) =>
                      setCustomer({ ...customer, lastName: event.target.value })
                    }
                    className={inputClassName}
                    autoComplete="family-name"
                    placeholder="Last name"
                  />
                </label>

                <label className="text-sm font-black text-gray-800">
                  <span className="flex items-center gap-2">
                    <Mail size={15} />
                    Email
                  </span>
                  <input
                    type="email"
                    value={customer.email}
                    disabled={formLocked}
                    onChange={(event) =>
                      setCustomer({ ...customer, email: event.target.value })
                    }
                    className={inputClassName}
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                  <span className="mt-2 block text-xs font-medium leading-5 text-gray-400">
                    Required for your receipt and order confirmation.
                  </span>
                </label>

                <label className="text-sm font-black text-gray-800">
                  <span className="flex items-center gap-2">
                    <Phone size={15} />
                    Phone
                    <span className="font-semibold text-gray-400">
                      Optional
                    </span>
                  </span>
                  <input
                    type="tel"
                    value={customer.phone}
                    disabled={formLocked}
                    onChange={(event) =>
                      setCustomer({ ...customer, phone: event.target.value })
                    }
                    className={inputClassName}
                    autoComplete="tel"
                    placeholder="(555) 555-5555"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--bloom-accent) 10%, white)",
                    color: "var(--bloom-accent)",
                  }}
                >
                  <CreditCard size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-gray-950">
                    Secure Payment
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Card details are entered directly into Stripe&apos;s secure
                    Payment Element. Bloom does not store raw card numbers.
                  </p>
                </div>
              </div>

              {!preparedPayment ? (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6">
                  <div className="flex items-start gap-3">
                    <LockKeyhole
                      size={20}
                      className="mt-0.5 shrink-0 text-gray-500"
                    />
                    <div>
                      <p className="text-sm font-black text-gray-800">
                        Ready to load secure payment
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Bloom will re-check the order, reserve inventory,
                        calculate authoritative tax, and then load Stripe.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6">
                  <div
                    id="bloom-stripe-payment-element"
                    className="min-h-[140px] rounded-2xl border border-gray-200 p-4"
                  />
                  <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-gray-500">
                    <ShieldCheck size={14} />
                    Secure payment powered by Stripe
                  </p>
                </div>
              )}
            </div>

            {!preparedPayment ? (
              <button
                type="button"
                onClick={preparePayment}
                disabled={isPreparingPayment || isRevalidating}
                className="flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: "var(--bloom-primary)" }}
              >
                {isPreparingPayment ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Preparing Secure Payment...
                  </>
                ) : (
                  <>
                    <LockKeyhole size={18} />
                    Continue to Secure Payment
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={placeOrder}
                disabled={isSubmittingPayment}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-950 px-6 py-4 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingPayment ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Confirming Payment...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Place Secure Order ·{" "}
                    {formatMoneyFromCents(preparedPayment.totals.totalCents)}
                  </>
                )}
              </button>
            )}

            <p className="text-center text-xs font-medium leading-5 text-gray-400">
              Your order is not created until Bloom independently verifies the
              processor payment.
            </p>
          </section>

          <aside className="lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
                <h2 className="text-lg font-black text-gray-950">
                  Final Review
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div
                    key={item.lineId}
                    className="flex gap-4 px-5 py-5 sm:px-6"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <ShoppingBag size={19} className="text-gray-300" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-black text-gray-950">
                        {item.productName}
                      </p>
                      <p className="mt-1 text-xs font-semibold capitalize text-gray-500">
                        {item.tier.label} · Qty {item.quantity}
                      </p>

                      {item.addons.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {item.addons.map((addon) => (
                            <p key={addon.id} className="text-xs text-gray-400">
                              + {addon.name}
                            </p>
                          ))}
                        </div>
                      )}

                      {item.arrangementContainerNote && (
                        <div className="mt-3 rounded-xl bg-gray-50 p-3">
                          <p className="text-[11px] font-black uppercase tracking-wide text-gray-500">
                            Arrangement &amp; container note
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-600">
                            {item.arrangementContainerNote}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {fulfillmentType === "delivery" && validatedDelivery && (
                <div className="border-t border-gray-100 px-5 py-5 sm:px-6">
                  <p
                    className="text-xs font-black uppercase tracking-[0.14em]"
                    style={{ color: "var(--bloom-accent)" }}
                  >
                    Delivery
                  </p>
                  <p className="mt-3 text-sm font-black text-gray-950">
                    {recipient.firstName} {recipient.lastName}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    {validatedDelivery.address.formattedAddress}
                  </p>
                  <p className="mt-2 text-sm font-bold text-gray-700">
                    {formatDeliveryDate(validatedDelivery.requestedDate)}
                  </p>
                </div>
              )}

              {fulfillmentType === "pickup" && validatedPickup && (
                <div className="border-t border-gray-100 px-5 py-5 sm:px-6">
                  <p
                    className="text-xs font-black uppercase tracking-[0.14em]"
                    style={{ color: "var(--bloom-accent)" }}
                  >
                    Pickup
                  </p>
                  <p className="mt-3 text-sm font-black text-gray-950">
                    {validatedPickup.location.businessName}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    {validatedPickup.location.formattedAddress}
                  </p>
                  <p className="mt-2 text-sm font-bold text-gray-700">
                    {formatDeliveryDate(validatedPickup.requestedDate)}
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-gray-500">
                    Preparation estimate: {validatedPickup.preparationMinutes}{" "}
                    minutes
                  </p>
                </div>
              )}

              {(cardMessage || cardSignature) && (
                <div className="border-t border-gray-100 px-5 py-5 sm:px-6">
                  <p
                    className="text-xs font-black uppercase tracking-[0.14em]"
                    style={{ color: "var(--bloom-accent)" }}
                  >
                    Card Message
                  </p>
                  {cardMessage && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                      {cardMessage}
                    </p>
                  )}
                  {cardSignature && (
                    <p className="mt-3 text-sm font-black text-gray-800">
                      — {cardSignature}
                    </p>
                  )}
                </div>
              )}

              {selectedValidation && (
                <div className="space-y-3 border-t border-gray-100 px-5 py-5 text-sm sm:px-6">
                  <div className="flex justify-between gap-4">
                    <span className="font-semibold text-gray-500">
                      Subtotal
                    </span>
                    <span className="font-black text-gray-950">
                      {formatMoneyFromCents(
                        displayTotals?.subtotalCents ??
                          selectedValidation.cartSubtotalCents,
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="font-semibold text-gray-500">
                      {fulfillmentType === "pickup" ? "Pickup" : "Delivery"}
                    </span>
                    <span className="font-black text-gray-950">
                      {formatMoneyFromCents(
                        displayTotals?.fulfillmentFeeCents ??
                          (fulfillmentType === "pickup"
                            ? 0
                            : validatedDelivery?.feeCents || 0),
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="font-semibold text-gray-500">
                      Sales Tax
                    </span>
                    <span
                      className={`font-black ${
                        displayTotals ? "text-gray-950" : "text-gray-400"
                      }`}
                    >
                      {displayTotals
                        ? formatMoneyFromCents(displayTotals.taxAmountCents)
                        : "Calculated before payment"}
                    </span>
                  </div>

                  {displayTotals && displayTotals.tipCents > 0 && (
                    <div className="flex justify-between gap-4">
                      <span className="font-semibold text-gray-500">Tip</span>
                      <span className="font-black text-gray-950">
                        {formatMoneyFromCents(displayTotals.tipCents)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-end justify-between gap-4 border-t border-gray-100 pt-4">
                    <div>
                      <p className="font-black text-gray-950">
                        {displayTotals ? "Order Total" : "Total before tax"}
                      </p>
                      <p className="mt-1 max-w-[190px] text-xs leading-5 text-gray-400">
                        {displayTotals
                          ? "This is the exact amount the processor will charge."
                          : fulfillmentType === "pickup"
                            ? "Tax will be based on the pickup location."
                            : "Tax will be based on the delivery destination."}
                      </p>
                    </div>

                    <span className="text-xl font-black tracking-tight text-gray-950">
                      {formatMoneyFromCents(
                        displayTotals?.totalCents ??
                          selectedValidation.totalBeforeTaxCents,
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
