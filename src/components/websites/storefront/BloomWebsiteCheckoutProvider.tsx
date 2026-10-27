"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type BloomWebsiteFulfillmentType = "delivery" | "pickup";

export type BloomWebsiteCheckoutRecipient = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export type BloomWebsiteCheckoutCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type BloomWebsitePickupDetails = {
  person: "recipient" | "customer" | "other";
  firstName: string;
  lastName: string;
  phone: string;
  instructions: string;
  timeFrom: string;
  timeTo: string;
};

export type BloomWebsiteCheckoutDeliveryAddress = {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
};

export type BloomWebsiteValidatedPickup = {
  requestedDate: string;
  sameDay: boolean;
  cartSubtotalCents: number;
  totalBeforeTaxCents: number;
  preparationMinutes: number;
  instructions: string;
  location: {
    businessName: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    formattedAddress: string;
  };
};

export type BloomWebsiteValidatedDelivery = {
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

  requestedDate: string;
  sameDay: boolean;
  distanceMiles: number | null;
  feeCents: number;
  cartSubtotalCents: number;
  totalBeforeTaxCents: number;
};

type BloomWebsiteCheckoutContextValue = {
  hasLoadedStorage: boolean;

  fulfillmentType: BloomWebsiteFulfillmentType;

  recipient: BloomWebsiteCheckoutRecipient;

  customer: BloomWebsiteCheckoutCustomer;

  deliveryAddress: BloomWebsiteCheckoutDeliveryAddress;

  requestedDate: string;

  pickupRequestedDate: string;
  pickupDetails: BloomWebsitePickupDetails;

  deliveryInstructions: string;

  cardMessage: string;

  cardSignature: string;

  validatedDelivery: BloomWebsiteValidatedDelivery | null;

  validatedPickup: BloomWebsiteValidatedPickup | null;

  setFulfillmentType: (fulfillmentType: BloomWebsiteFulfillmentType) => void;

  setRecipient: (recipient: BloomWebsiteCheckoutRecipient) => void;

  setCustomer: (customer: BloomWebsiteCheckoutCustomer) => void;

  setDeliveryAddress: (address: BloomWebsiteCheckoutDeliveryAddress) => void;

  setRequestedDate: (requestedDate: string) => void;

  setPickupRequestedDate: (requestedDate: string) => void;
  setPickupDetails: (details: BloomWebsitePickupDetails) => void;

  setDeliveryInstructions: (instructions: string) => void;

  setCardMessage: (message: string) => void;

  setCardSignature: (signature: string) => void;

  setValidatedDelivery: (
    delivery: BloomWebsiteValidatedDelivery | null,
  ) => void;

  setValidatedPickup: (pickup: BloomWebsiteValidatedPickup | null) => void;

  invalidateDeliveryValidation: () => void;

  invalidatePickupValidation: () => void;

  invalidateFulfillmentValidation: () => void;

  clearCheckout: () => void;
};

const BloomWebsiteCheckoutContext =
  createContext<BloomWebsiteCheckoutContextValue | null>(null);

type BloomWebsiteCheckoutProviderProps = {
  previewSlug: string;
  children: ReactNode;
};

type StoredCheckoutState = {
  fulfillmentType: BloomWebsiteFulfillmentType;

  recipient: BloomWebsiteCheckoutRecipient;

  customer: BloomWebsiteCheckoutCustomer;

  deliveryAddress: BloomWebsiteCheckoutDeliveryAddress;

  requestedDate: string;

  pickupRequestedDate: string;
  pickupDetails: BloomWebsitePickupDetails;

  deliveryInstructions: string;

  cardMessage: string;

  cardSignature: string;

  validatedDelivery: BloomWebsiteValidatedDelivery | null;

  validatedPickup: BloomWebsiteValidatedPickup | null;
};

const EMPTY_PICKUP: BloomWebsitePickupDetails = { person: "customer", firstName: "", lastName: "", phone: "", instructions: "", timeFrom: "", timeTo: "" };

const EMPTY_RECIPIENT: BloomWebsiteCheckoutRecipient = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
};

const EMPTY_CUSTOMER: BloomWebsiteCheckoutCustomer = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
};

const EMPTY_DELIVERY_ADDRESS: BloomWebsiteCheckoutDeliveryAddress = {
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStoredRecipient(value: unknown): BloomWebsiteCheckoutRecipient {
  if (!isRecord(value)) {
    return {
      ...EMPTY_RECIPIENT,
    };
  }

  return {
    firstName: cleanString(value.firstName),

    lastName: cleanString(value.lastName),

    phone: cleanString(value.phone),
    email: cleanString(value.email),
  };
}

function parseStoredCustomer(value: unknown): BloomWebsiteCheckoutCustomer {
  if (!isRecord(value)) {
    return {
      ...EMPTY_CUSTOMER,
    };
  }

  return {
    firstName: cleanString(value.firstName),

    lastName: cleanString(value.lastName),

    email: cleanString(value.email),

    phone: cleanString(value.phone),
  };
}

function parseStoredDeliveryAddress(
  value: unknown,
): BloomWebsiteCheckoutDeliveryAddress {
  if (!isRecord(value)) {
    return {
      ...EMPTY_DELIVERY_ADDRESS,
    };
  }

  return {
    address1: cleanString(value.address1),

    address2: cleanString(value.address2),

    city: cleanString(value.city),

    state: cleanString(value.state),

    zip: cleanString(value.zip),
  };
}

function parseValidatedDelivery(
  value: unknown,
): BloomWebsiteValidatedDelivery | null {
  if (!isRecord(value) || !isRecord(value.address)) {
    return null;
  }

  const feeCents = Number(value.feeCents);

  const cartSubtotalCents = Number(value.cartSubtotalCents);

  const totalBeforeTaxCents = Number(value.totalBeforeTaxCents);

  const lat = Number(value.address.lat);

  const lng = Number(value.address.lng);

  if (
    !Number.isFinite(feeCents) ||
    !Number.isFinite(cartSubtotalCents) ||
    !Number.isFinite(totalBeforeTaxCents) ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  const distanceValue = value.distanceMiles;

  const distanceMiles = distanceValue === null ? null : Number(distanceValue);

  if (distanceMiles !== null && !Number.isFinite(distanceMiles)) {
    return null;
  }

  return {
    address: {
      formattedAddress: cleanString(value.address.formattedAddress),

      address1: cleanString(value.address.address1),

      address2: cleanString(value.address.address2),

      city: cleanString(value.address.city),

      state: cleanString(value.address.state),

      zip: cleanString(value.address.zip),

      country: cleanString(value.address.country),

      lat,
      lng,

      placeId: cleanString(value.address.placeId),
    },

    requestedDate: cleanString(value.requestedDate),

    sameDay: value.sameDay === true,

    distanceMiles,

    feeCents,

    cartSubtotalCents,

    totalBeforeTaxCents,
  };
}

function parseValidatedPickup(
  value: unknown,
): BloomWebsiteValidatedPickup | null {
  if (!isRecord(value) || !isRecord(value.location)) {
    return null;
  }

  const cartSubtotalCents = Number(value.cartSubtotalCents);
  const totalBeforeTaxCents = Number(value.totalBeforeTaxCents);
  const preparationMinutes = Number(value.preparationMinutes);

  if (
    !Number.isFinite(cartSubtotalCents) ||
    !Number.isFinite(totalBeforeTaxCents) ||
    !Number.isFinite(preparationMinutes)
  ) {
    return null;
  }

  return {
    requestedDate: cleanString(value.requestedDate),
    sameDay: value.sameDay === true,
    cartSubtotalCents,
    totalBeforeTaxCents,
    preparationMinutes,
    instructions: cleanString(value.instructions),
    location: {
      businessName: cleanString(value.location.businessName),
      address1: cleanString(value.location.address1),
      city: cleanString(value.location.city),
      state: cleanString(value.location.state),
      zip: cleanString(value.location.zip),
      country: cleanString(value.location.country),
      formattedAddress: cleanString(value.location.formattedAddress),
    },
  };
}

export default function BloomWebsiteCheckoutProvider({
  previewSlug,
  children,
}: BloomWebsiteCheckoutProviderProps) {
  const storageKey = `bloomwebsites-checkout:${previewSlug}`;

  const [fulfillmentType, setFulfillmentTypeState] =
    useState<BloomWebsiteFulfillmentType>("delivery");

  const [recipient, setRecipientState] =
    useState<BloomWebsiteCheckoutRecipient>(EMPTY_RECIPIENT);

  const [customer, setCustomerState] =
    useState<BloomWebsiteCheckoutCustomer>(EMPTY_CUSTOMER);

  const [deliveryAddress, setDeliveryAddressState] =
    useState<BloomWebsiteCheckoutDeliveryAddress>(EMPTY_DELIVERY_ADDRESS);

  const [requestedDate, setRequestedDateState] = useState("");

  const [pickupRequestedDate, setPickupRequestedDateState] = useState("");
  const [pickupDetails, setPickupDetailsState] = useState<BloomWebsitePickupDetails>(EMPTY_PICKUP);

  const [deliveryInstructions, setDeliveryInstructionsState] = useState("");

  const [cardMessage, setCardMessageState] = useState("");

  const [cardSignature, setCardSignatureState] = useState("");

  const [validatedDelivery, setValidatedDeliveryState] =
    useState<BloomWebsiteValidatedDelivery | null>(null);

  const [validatedPickup, setValidatedPickupState] =
    useState<BloomWebsiteValidatedPickup | null>(null);

  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  useEffect(() => {
    setHasLoadedStorage(false);

    try {
      const rawValue = window.sessionStorage.getItem(storageKey);

      if (!rawValue) {
        setFulfillmentTypeState("delivery");

        setRecipientState({
          ...EMPTY_RECIPIENT,
        });

        setCustomerState({
          ...EMPTY_CUSTOMER,
        });

        setDeliveryAddressState({
          ...EMPTY_DELIVERY_ADDRESS,
        });

        setRequestedDateState("");

        setPickupRequestedDateState("");
        setPickupDetailsState({ ...EMPTY_PICKUP });

        setDeliveryInstructionsState("");

        setCardMessageState("");

        setCardSignatureState("");

        setValidatedDeliveryState(null);

        setValidatedPickupState(null);

        return;
      }

      const parsed = JSON.parse(rawValue);

      if (!isRecord(parsed)) {
        throw new Error("Invalid checkout storage.");
      }

      const storedFulfillmentType: BloomWebsiteFulfillmentType =
        parsed.fulfillmentType === "pickup" ? "pickup" : "delivery";

      setFulfillmentTypeState(storedFulfillmentType);

      setRecipientState(parseStoredRecipient(parsed.recipient));

      setCustomerState(parseStoredCustomer(parsed.customer));

      setDeliveryAddressState(
        parseStoredDeliveryAddress(parsed.deliveryAddress),
      );

      setRequestedDateState(cleanString(parsed.requestedDate));

      setPickupRequestedDateState(cleanString(parsed.pickupRequestedDate));
      const pd = isRecord(parsed.pickupDetails) ? parsed.pickupDetails : {};
      setPickupDetailsState({
        person: pd.person === "recipient" || pd.person === "other" ? pd.person : "customer",
        firstName: cleanString(pd.firstName), lastName: cleanString(pd.lastName), phone: cleanString(pd.phone),
        instructions: cleanString(pd.instructions), timeFrom: cleanString(pd.timeFrom), timeTo: cleanString(pd.timeTo),
      });

      setDeliveryInstructionsState(cleanString(parsed.deliveryInstructions));

      setCardMessageState(cleanString(parsed.cardMessage));

      setCardSignatureState(cleanString(parsed.cardSignature));

      setValidatedDeliveryState(
        storedFulfillmentType === "delivery"
          ? parseValidatedDelivery(parsed.validatedDelivery)
          : null,
      );

      setValidatedPickupState(
        storedFulfillmentType === "pickup"
          ? parseValidatedPickup(parsed.validatedPickup)
          : null,
      );
    } catch {
      setFulfillmentTypeState("delivery");

      setRecipientState({
        ...EMPTY_RECIPIENT,
      });

      setCustomerState({
        ...EMPTY_CUSTOMER,
      });

      setDeliveryAddressState({
        ...EMPTY_DELIVERY_ADDRESS,
      });

      setRequestedDateState("");

      setPickupRequestedDateState("");
      setPickupDetailsState({ ...EMPTY_PICKUP });

      setDeliveryInstructionsState("");

      setCardMessageState("");

      setCardSignatureState("");

      setValidatedDeliveryState(null);

      setValidatedPickupState(null);
    } finally {
      setHasLoadedStorage(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoadedStorage) {
      return;
    }

    const storedState: StoredCheckoutState = {
      fulfillmentType,

      recipient,
      customer,
      deliveryAddress,
      requestedDate,
      pickupRequestedDate,
      pickupDetails,
      deliveryInstructions,
      cardMessage,
      cardSignature,
      validatedDelivery,
      validatedPickup,
    };

    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(storedState));
    } catch {
      /*
       * Checkout still works in memory
       * if storage is unavailable.
       */
    }
  }, [
    cardMessage,
    cardSignature,
    customer,
    deliveryAddress,
    fulfillmentType,
    deliveryInstructions,
    hasLoadedStorage,
    recipient,
    requestedDate,
    pickupRequestedDate,
    pickupDetails,
    storageKey,
    validatedDelivery,
    validatedPickup,
  ]);

  function invalidateDeliveryValidation() {
    setValidatedDeliveryState(null);
  }

  function invalidatePickupValidation() {
    setValidatedPickupState(null);
  }

  function invalidateFulfillmentValidation() {
    invalidateDeliveryValidation();
    invalidatePickupValidation();
  }

  function setFulfillmentType(nextType: BloomWebsiteFulfillmentType) {
    setFulfillmentTypeState(nextType);
    invalidateFulfillmentValidation();
  }

  function setRecipient(nextRecipient: BloomWebsiteCheckoutRecipient) {
    setRecipientState(nextRecipient);

    invalidateDeliveryValidation();
  }

  function setCustomer(nextCustomer: BloomWebsiteCheckoutCustomer) {
    setCustomerState(nextCustomer);
  }

  function setDeliveryAddress(
    nextAddress: BloomWebsiteCheckoutDeliveryAddress,
  ) {
    setDeliveryAddressState(nextAddress);

    invalidateDeliveryValidation();
  }

  function setRequestedDate(nextRequestedDate: string) {
    setRequestedDateState(nextRequestedDate);

    invalidateDeliveryValidation();
  }

  function setPickupRequestedDate(nextRequestedDate: string) {
    setPickupRequestedDateState(nextRequestedDate);

    invalidatePickupValidation();
  }

  function setPickupDetails(details: BloomWebsitePickupDetails) { setPickupDetailsState(details); invalidatePickupValidation(); }

  function setDeliveryInstructions(instructions: string) {
    setDeliveryInstructionsState(instructions);
  }

  function setCardMessage(message: string) {
    setCardMessageState(message.slice(0, 300));
  }

  function setCardSignature(signature: string) {
    setCardSignatureState(signature.slice(0, 80));
  }

  function setValidatedDelivery(
    delivery: BloomWebsiteValidatedDelivery | null,
  ) {
    setValidatedDeliveryState(delivery);

    if (delivery) {
      setValidatedPickupState(null);
    }
  }

  function setValidatedPickup(pickup: BloomWebsiteValidatedPickup | null) {
    setValidatedPickupState(pickup);

    if (pickup) {
      setValidatedDeliveryState(null);
    }
  }

  function clearCheckout() {
    setFulfillmentTypeState("delivery");

    setRecipientState({
      ...EMPTY_RECIPIENT,
    });

    setCustomerState({
      ...EMPTY_CUSTOMER,
    });

    setDeliveryAddressState({
      ...EMPTY_DELIVERY_ADDRESS,
    });

    setRequestedDateState("");

    setPickupRequestedDateState("");
    setPickupDetailsState({...EMPTY_PICKUP});

    setDeliveryInstructionsState("");

    setCardMessageState("");

    setCardSignatureState("");

    setValidatedDeliveryState(null);

    setValidatedPickupState(null);

    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore storage failures.
    }
  }

  const contextValue = useMemo<BloomWebsiteCheckoutContextValue>(
    () => ({
      hasLoadedStorage,

      fulfillmentType,

      recipient,
      customer,
      deliveryAddress,
      requestedDate,
      pickupRequestedDate,
      pickupDetails,
      deliveryInstructions,
      cardMessage,
      cardSignature,
      validatedDelivery,
      validatedPickup,

      setFulfillmentType,
      setRecipient,
      setCustomer,
      setDeliveryAddress,
      setRequestedDate,
      setPickupRequestedDate,
      setPickupDetails,
      setDeliveryInstructions,
      setCardMessage,
      setCardSignature,
      setValidatedDelivery,
      setValidatedPickup,
      invalidateDeliveryValidation,
      invalidatePickupValidation,
      invalidateFulfillmentValidation,
      clearCheckout,
    }),
    [
      cardMessage,
      cardSignature,
      customer,
      deliveryAddress,
      deliveryInstructions,
      hasLoadedStorage,
      recipient,
      requestedDate,
      validatedDelivery,

      fulfillmentType,
      pickupRequestedDate,
      pickupDetails,
      validatedPickup,
    ],
  );

  return (
    <BloomWebsiteCheckoutContext.Provider value={contextValue}>
      {children}
    </BloomWebsiteCheckoutContext.Provider>
  );
}

export function useBloomWebsiteCheckout() {
  const context = useContext(BloomWebsiteCheckoutContext);

  if (!context) {
    throw new Error(
      "useBloomWebsiteCheckout must be used inside BloomWebsiteCheckoutProvider.",
    );
  }

  return context;
}
