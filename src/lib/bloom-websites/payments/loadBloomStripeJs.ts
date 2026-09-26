"use client";

export type BloomStripeElement = {
  mount(target: string | HTMLElement): void;
  destroy(): void;
};

export type BloomStripeElements = {
  create(
    type: "payment",
    options?: {
      layout?: "tabs" | "accordion" | "auto";
    },
  ): BloomStripeElement;
};

export type BloomStripe = {
  elements(options: {
    clientSecret: string;
    appearance?: {
      theme?: "stripe" | "night" | "flat";
      variables?: Record<string, string>;
    };
  }): BloomStripeElements;

  confirmPayment(options: {
    elements: BloomStripeElements;
    confirmParams: {
      return_url: string;
      receipt_email?: string;
    };
    redirect: "if_required";
  }): Promise<{
    error?: {
      type?: string;
      code?: string;
      message?: string;
    };
    paymentIntent?: {
      id: string;
      status: string;
    };
  }>;
};

type StripeFactory = (
  publishableKey: string,
  options?: {
    stripeAccount?: string;
  },
) => BloomStripe;

declare global {
  interface Window {
    Stripe?: StripeFactory;
  }
}

let stripeScriptPromise: Promise<StripeFactory> | null = null;

export function loadBloomStripeJs(): Promise<StripeFactory> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Stripe.js can only be loaded in the browser."),
    );
  }

  if (window.Stripe) {
    return Promise.resolve(window.Stripe);
  }

  if (stripeScriptPromise) {
    return stripeScriptPromise;
  }

  stripeScriptPromise = new Promise<StripeFactory>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.stripe.com/v3/"]',
    );

    const resolveStripe = () => {
      if (window.Stripe) {
        resolve(window.Stripe);
      } else {
        reject(new Error("Stripe.js loaded without exposing Stripe."));
      }
    };

    if (existing) {
      existing.addEventListener("load", resolveStripe, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Stripe.js could not be loaded.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = resolveStripe;
    script.onerror = () =>
      reject(new Error("Stripe.js could not be loaded."));
    document.head.appendChild(script);
  });

  return stripeScriptPromise;
}
