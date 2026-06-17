// app/dashboard/new-order/NewOrderClient.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import "react-datepicker/dist/react-datepicker.css";
import { searchGoogleFlorists } from "@/app/actions";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import BloomSpinner from "@/components/BloomSpinner";

// #region Interfaces

interface GoogleFlorist {
  id: string;
  displayName: { text: string };
  nationalPhoneNumber?: string;
  rating?: number;
  formattedAddress: string;
}

interface GoogleShop {
  name: string;
  phone?: string;
  address: string;
  email?: string;
  googlePlaceId?: string;
}

interface RecipientData {
  firstName: string;
  lastName: string;
  address: string;
  apt: string;
  phone: string;
  email: string;
  zip: string;
  city: string;
  state: string;
  company: string;
}

interface ShopsData {}

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface LogisticsData {
  deliveryDate: Date | null;
  timeOption: "anytime" | "specific";
  timeFrom: string;
  timeTo: string;
  specialInstructions: string;
}

interface PricingData {
  productsTotal: number;
  deliveryFee: number;
  taxAmount: number;
  customerPays: number;
  orderTotal: number;
  fulfillingShopGets: number;
  feeCharge: number;
}

interface SendingShop {
  shopId: string;
  shopName: string;
  taxPercentage: number;
  deliveryTaxed: boolean;
  feeTaxed: boolean;
  feeType: string;
  feeValue: number;
}

// #region Fulfilling Shop

interface ZipZone {
  name: string;
  zip: string;
  fee: number;
}

interface DistanceZone {
  min: number;
  max: number;
  fee: number;
}

interface BlackoutDate {
  date: Date;
}

interface BlackoutTime {
  start: string;
  end: string;
}

interface FulfillingReviews {
  customerName?: string;
  rating?: number;
  comment?: string;
  date?: Date;
}

interface FulfillingDelivery {
  deliveryMethod: string;
  zipZones?: ZipZone[];
  distanceZones?: DistanceZone[];
  fallbackFee: number;
  maxRadius: number;
  minProductTotal: number;
  sameDayCutoff: string;
  holidaySurcharge: number;
  blackoutDates?: BlackoutDate[];
  blackoutTimes?: BlackoutTime[];
  noMoreOrdersToday: boolean;
  allowSameDay: boolean;
}

interface FulfillingStats {
  ordersSent: number;
  ordersCompleted: number;
  ordersDeclined: number;
  ordersReceived: number;
  responseRate?: number;
  avgResponseTimeMinutes?: number;
}

interface FulfillingContact {
  phone?: string;
  whatsapp?: string;
  emailSecondary?: string;
  website?: string;
}

interface FulfillingGeo {
  type: string;
  coordinates: number[];
}

interface FulfillingPaymentMethods {
  venmoHandle?: string;
  cashAppTag?: string;
  zellePhoneOrEmail?: string;
  paypalEmail?: string;
  defaultPaymentMethod?: string;
}

interface FulfillingAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  timezone: string;
  geoLocation: FulfillingGeo;
}

interface FulfillingFeaturedBouquet {
  name?: string;
  price?: number;
  description?: string;
  image?: string;
}

interface FulfillingShop {
  id: string;
  businessName: string;
  email: string;
  isVerified: boolean;
  verifiedFlorist: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  isPublic: boolean;
  onboardingComplete: boolean;
  networkJoinDate: Date;
  contact: FulfillingContact;
  address: FulfillingAddress;
  paymentMethods: FulfillingPaymentMethods;
  featuredBouquet: FulfillingFeaturedBouquet;
  delivery: FulfillingDelivery;
  stats: FulfillingStats;
}

// #endregion

// #endregion

export default function NewOrderClient() {
  const { data: session, status } = useSession();
  // const shopId = (session?.user as any)?.shopId;
  const router = useRouter();
  const cfBase = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // #region STATES & VARIABLES

  // Shop Chosen - Boolean
  const [shopChosen, setShopChosen] = useState(false);

  // Loading Status
  const [loading, setLoading] = useState(false);

  // Users Info
  const [sendingShop, setSendingShop] = useState<SendingShop>({
    shopId: "",
    shopName: "",
    taxPercentage: 0.0,
    deliveryTaxed: false,
    feeTaxed: false,
    feeType: "",
    feeValue: 0.0,
  });

  //Fulfilling Shop Data
  const [fulfillingShop, setFulfillingShop] = useState<FulfillingShop | null>(
    null,
  );
  const [fulfillShopId, setFulfillShopId] = useState("");

  // Outside Network Shop Data
  const [googleResults, setGoogleResults] = useState<GoogleFlorist[]>([]);
  const [googleShop, setGoogleShop] = useState<GoogleShop>({
    name: "",
    phone: "",
    address: "",
  });
  const [outsideNetwork, setOutsideNetwork] = useState({
    contactPerson: "",
    items: [
      {
        name: "",
        description: "",
        qty: 1,
        price: 0,
      },
    ],
    deliveryFee: 0,
    taxAmount: 0,
    orderTotal: 0,
    notes: "",
  });
  const [googleSearch, setGoogleSearch] = useState(false);
  const [outsideFloristFormOpen, setOutsideFloristFormOpen] = useState(false);
  const [googleApiFailed, setGoogleApiFailed] = useState(false);
  const [manualOutsideFlorist, setManualOutsideFlorist] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
  });

  const [lastZip, setLastZip] = useState("");

  // Recipient
  const [recipient, setRecipient] = useState<RecipientData>({
    firstName: "",
    lastName: "",
    address: "",
    apt: "",
    phone: "",
    email: "",
    zip: "",
    city: "",
    state: "",
    company: "",
  });

  // Customer
  const [customer, setCustomer] = useState<CustomerData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // Card Message
  const [addCard, setAddCard] = useState(false);
  const [cardMessage, setCardMessage] = useState("");

  // Offerings
  const [offerings, setOfferings] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Delivery
  const [logistics, setLogistics] = useState<LogisticsData>({
    deliveryDate: new Date(),
    timeOption: "anytime",
    timeFrom: "",
    timeTo: "",
    specialInstructions: "",
  });

  // Pricing
  const [pricing, setPricing] = useState<PricingData>({
    productsTotal: 0.0,
    deliveryFee: 20.0,
    taxAmount: 0.0,
    customerPays: 0.0,
    orderTotal: 0.0,
    fulfillingShopGets: 0.0,
    feeCharge: 0.0,
  });

  const [editDeliveryFee, setEditDeliveryFee] = useState(false);
  const [editOriginatingFee, setEditOriginatingFee] = useState(false);
  const [originatingFeeValue, setOriginatingFeeValue] = useState<number>(0);

  // Shops
  const [shops, setShops] = useState<any[]>([]);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [findShopSuccess, setFindShopSuccess] = useState(false);
  const [noShopsInArea, setNoShopsInArea] = useState(false);

  // Request Florist
  const [requestFlorist, setRequestFlorist] = useState(false);

  const [orderPage, setOrderPage] = useState("shop-lookup");
  const [toEmail, setToEmail] = useState("");
  const [orderPageOption, setOrderPageOption] = useState("recipient");

  const [sendingOrder, setSendingOrder] = useState(false);

  // Variables
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `florist flower shop near ${recipient.city} ${recipient.state} ${recipient.zip}`,
  )}`;
  const usingGoogleShop = !!googleShop?.name && !selectedShop?._id;
  const usingNetworkShop = !!selectedShop?._id;

  // #endregion

  // #region useEffects

  // Load shop info
  useEffect(() => {
    async function loadShop() {
      try {
        const res = await fetch("/api/shops/me");
        const data = await res.json();

        if (data && data.shop) {
          if (!data.shop.onboardingComplete) {
            router.push("/dashboard/setup");
          }
        }

        setSendingShop({
          ...sendingShop,
          shopId: data.shop._id,
          shopName: data.shop.businessName,
          taxPercentage: data.shop.financials.taxPercentage,
          deliveryTaxed: data.shop.financials.deliveryTaxed,
          feeTaxed: data.shop.financials.feeTaxed,
          feeType: data.shop.financials.feeType,
          feeValue: data.shop.financials.feeValue,
        });
        setOriginatingFeeValue(data.shop.financials.feeValue || 0);
      } catch (err) {
        console.error("Failed to load shop data", err);
      }
    }
    loadShop();
  }, []);

  useEffect(() => {
    const deliveryFee = Number(pricing.deliveryFee) || 0;
    const taxPercentage = Number(sendingShop.taxPercentage) || 0;

    const { taxableSubtotal, nonTaxableSubtotal } = selectedProducts.reduce(
      (acc, p) => {
        const price = parseFloat(p.price as string) || 0;
        if (p.taxable) {
          acc.taxableSubtotal += price;
        } else {
          acc.nonTaxableSubtotal += price;
        }
        return acc;
      },
      { taxableSubtotal: 0, nonTaxableSubtotal: 0 },
    );

    const productTotal = taxableSubtotal + nonTaxableSubtotal;

    const feeCharge =
      sendingShop.feeType === "%"
        ? productTotal * (Number(originatingFeeValue) / 100)
        : Number(originatingFeeValue);

    const taxableBasis =
      taxableSubtotal +
      (sendingShop.deliveryTaxed ? deliveryFee : 0) +
      (sendingShop.feeTaxed ? feeCharge : 0);

    const taxAmount = taxableBasis * (taxPercentage / 100);

    const finalTotal = productTotal + deliveryFee + feeCharge + taxAmount;

    setPricing((prev) => ({
      ...prev,
      productsTotal: parseFloat(roundToHundredth(productTotal)),
      feeCharge: parseFloat(roundToHundredth(feeCharge)),
      taxAmount: parseFloat(roundToHundredth(taxAmount)),
      customerPays: parseFloat(roundToHundredth(finalTotal)),
      orderTotal: parseFloat(roundToHundredth(finalTotal)),
      fulfillingShopGets: parseFloat(
        roundToHundredth(productTotal + deliveryFee),
      ),
    }));
  }, [
    selectedProducts,
    pricing.deliveryFee,
    sendingShop.taxPercentage,
    sendingShop.deliveryTaxed,
    sendingShop.feeTaxed,
    sendingShop.feeType,
    originatingFeeValue,
  ]);

  // Auto-fill city/state from ZIP
  useEffect(() => {
    if (recipient.zip.length === 5) {
      fetch(`https://ziptasticapi.com/${recipient.zip}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.city && data.state) {
            setRecipient({ ...recipient, city: data.city, state: data.state });
          }
        })
        .catch(() => {
          setRecipient({ ...recipient, city: "" });
          setRecipient({ ...recipient, state: "" });
        });
    }
  }, [recipient.zip]);

  // #endregion

  // #region FUNCTIONS

  // Load Fulfilling Shop
  const loadFulfillingShop = async (id: string) => {
    if (!id) return;

    try {
      // Optional: Clear previous shop while loading new one
      setFulfillingShop(null);
      setFulfillShopId("");

      const res = await fetch("/api/shops/fulfilling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillShopId: id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load shop");
      }

      // This fills your state with the exact shape from the API
      setFulfillingShop(data);
      setFulfillShopId(data._id);
    } catch (error: any) {
      console.error("Error pulling fulfilling shop data:", error);
      toast.error(error.message || "Error pulling fulfilling shop data");
    }
  };

  // Format Price
  const roundToHundredth = (num: number) => {
    const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
    return rounded.toFixed(2);
  };

  // Search shops
  const searchShops = async () => {
    if (
      recipient.zip.length !== 5 ||
      recipient.address === "" ||
      recipient.city === "" ||
      recipient.state === ""
    ) {
      toast.error("Enter a valid address to search");
      return;
    }

    setGoogleSearch(false);
    setGoogleApiFailed(false);
    setGoogleResults([]);
    setOutsideFloristFormOpen(false);
    setGoogleShop({ name: "", phone: "", address: "" });
    setShopChosen(false);
    setNoShopsInArea(false);

    try {
      const address = recipient.address;
      const city = recipient.city;
      const state = recipient.state;
      const zip = recipient.zip;
      const delDate = logistics.deliveryDate;
      const delTimeOpt = logistics.timeOption;
      const delTimeFrom = logistics.timeFrom;
      const delTimeTo = logistics.timeTo;
      const currentShopId = sendingShop.shopId;

      // Pull shops that:
      // 1. Servicing this delivery date
      // 2. Servicing this delivery time
      // 3. Servicing this address (Geo)
      const res = await fetch("/api/shops/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          city,
          state,
          zip,
          delDate,
          delTimeOpt,
          delTimeFrom,
          delTimeTo,
          currentShopId,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Search failed");

      setShops(data || []);
      setFindShopSuccess(data?.length > 0);

      console.log(data);

      if (!data || data.length === 0) {
        toast.error("No GetBloomDirect shops in that area yet — invite them!");
        setNoShopsInArea(true);
      }
    } catch (err) {
      console.error("Error finding shops", err);
      toast.error(
        "Error finding shops. Please try again. If the problem persists, contact GetBloomDirect support.",
      );
    } finally {
      setSearching(false);
    }
  };

  const sendOrder = async () => {
    try {
      setSendingOrder(true);

      const usingGoogleShop = !!googleShop?.name && !selectedShop?._id;

      if (!selectedShop && !usingGoogleShop) {
        return toast.error("Select a fulfilling shop!");
      }

      if (!logistics.deliveryDate) {
        return toast.error("Select delivery date!");
      }

      if (
        !recipient.firstName ||
        !recipient.lastName ||
        !recipient.phone ||
        !recipient.address ||
        !recipient.zip ||
        !recipient.city ||
        !recipient.state
      ) {
        return toast.error("Enter all recipient information!");
      }

      const cfBase = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

      const roundMoney = (value: number) => {
        return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
      };

      const updatedProducts = usingNetworkShop
        ? await Promise.all(
            selectedProducts.map(async (p) => {
              if (!p.file) return { ...p, photo: p.photo || "" };

              const uploadRes = await fetch("/api/s3/upload-url", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fileName: p.file.name,
                  fileType: p.file.type,
                }),
              });

              if (!uploadRes.ok) throw new Error("Failed to get upload URL");

              const { uploadUrl, fileKey } = await uploadRes.json();

              await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": p.file.type },
                body: p.file,
              });

              return {
                ...p,
                photo: `${cfBase}/${fileKey}`,
              };
            }),
          )
        : [];

      const payload = usingGoogleShop
        ? {
            fulfillmentType: "outside_network",
            outsideFlorist: {
              name: googleShop.name,
              phone: googleShop.phone || "",
              email: googleShop.email || "",
              address: googleShop.address || "",
              googlePlaceId: googleShop.googlePlaceId || "",
            },
            recipient: {
              firstName: recipient.firstName,
              lastName: recipient.lastName,
              fullName: `${recipient.firstName} ${recipient.lastName}`,
              address: recipient.address,
              apt: recipient.apt || "",
              city: recipient.city,
              state: recipient.state,
              zip: recipient.zip,
              phone: recipient.phone,
              email: recipient.email || null,
              company: recipient.company || "",
              message: cardMessage || "",
            },
            customer: {
              firstName: customer.firstName || "",
              lastName: customer.lastName || "",
              fullName: `${customer.firstName} ${customer.lastName}`,
              email: customer.email || "",
              phone: customer.phone || "",
            },
            logistics: {
              deliveryDate: logistics.deliveryDate.toISOString(),
              deliveryTimeOption: logistics.timeOption,
              deliveryTimeFrom:
                logistics.timeOption === "specific" ? logistics.timeFrom : null,
              deliveryTimeTo:
                logistics.timeOption === "specific" ? logistics.timeTo : null,
              specialInstructions: logistics.specialInstructions || "",
            },
            manualOrder: {
              contactPerson: outsideNetwork.contactPerson || "",
              items: outsideNetwork.items.map((item) => ({
                name: item.name,
                description: item.description || "",
                qty: Number(item.qty) || 1,
                price: roundMoney(item.price),
                lineTotal: roundMoney((Number(item.qty) || 1) * (Number(item.price) || 0)),
              })),
              productTotal: roundMoney(
                outsideNetwork.items.reduce((sum, item) => {
                  return sum + (Number(item.qty) || 1) * (Number(item.price) || 0);
                }, 0),
              ),
              deliveryFee: roundMoney(outsideNetwork.deliveryFee),
              taxAmount: roundMoney(outsideNetwork.taxAmount),
              orderTotal: roundMoney(outsideNetwork.orderTotal),
            },
            manualNotes: outsideNetwork.notes || "",
          }
        : {
            recipient: {
              firstName: recipient.firstName,
              lastName: recipient.lastName,
              fullName: `${recipient.firstName} ${recipient.lastName}`,
              address: recipient.address,
              apt: recipient.apt || "",
              city: recipient.city,
              state: recipient.state,
              zip: recipient.zip,
              phone: recipient.phone,
              email: recipient.email || null,
              company: recipient.company || "",
              message: cardMessage || "",
            },
            customer: {
              firstName: customer.firstName || "",
              lastName: customer.lastName || "",
              fullName: `${customer.firstName} ${customer.lastName}`,
              email: customer.email || "",
              phone: customer.phone || "",
            },
            logistics: {
              deliveryDate: logistics.deliveryDate.toISOString(),
              deliveryTimeOption: logistics.timeOption,
              deliveryTimeFrom:
                logistics.timeOption === "specific" ? logistics.timeFrom : null,
              deliveryTimeTo:
                logistics.timeOption === "specific" ? logistics.timeTo : null,
              specialInstructions: logistics.specialInstructions || "",
            },
            products: updatedProducts.map((p) => ({
              name: p.name,
              price: parseFloat(p.price),
              description: p.description,
              qty: p.qty,
              taxable: p.taxable,
              photo: p.photo,
            })),
            paymentMethods: {
              venmo: fulfillingShop?.paymentMethods?.venmoHandle,
              cashapp: fulfillingShop?.paymentMethods?.cashAppTag,
              zelle: fulfillingShop?.paymentMethods?.zellePhoneOrEmail,
              paypal: fulfillingShop?.paymentMethods?.paypalEmail,
              default: fulfillingShop?.paymentMethods?.defaultPaymentMethod,
            },
            deliveryFeeOverride: Number(pricing.deliveryFee) || 0,
            originatingShopFeeOverride: {
              feeType: sendingShop.feeType || "flat",
              feeValue: Number(originatingFeeValue) || 0,
            },
            fulfillmentType: "network",
            fulfillingShopId: selectedShop._id,
          };

      const endpoint = usingGoogleShop
        ? "/api/orders/outside-network/create"
        : "/api/orders/create";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create order");

      toast.success("Order sent successfully!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to send order", error);
      toast.error("Failed to send order. Please try again.");
    } finally {
      setSendingOrder(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      searchShops();
    }
  };

  // Load Offerings
  async function loadOfferings(shopId: string) {
    const res = await fetch(`/api/shops/${shopId}/offerings`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to load offerings.");
    }

    setOfferings(data.offerings || []);
    setSelectedProducts([]);
  }

  // Offerings Toggle Function
  function toggleOffering(offering: any, tier?: any) {
    const tierToUse = tier || offering.pricingTiers?.[0];

    if (!tierToUse) {
      toast.error("This offering does not have pricing set.");
      return;
    }

    const productKey = `${offering._id}-${tierToUse.label}`;

    const alreadySelected = selectedProducts.some(
      (p) => p.productKey === productKey,
    );

    if (alreadySelected) {
      setSelectedProducts((prev) =>
        prev.filter((p) => p.productKey !== productKey),
      );
      return;
    }

    setSelectedProducts((prev) => [
      ...prev,
      {
        productKey,
        offeringId: offering._id,
        name: offering.name,
        price: String(tierToUse.price),
        description: offering.description || "",
        photo: offering.image || "",
        taxable: offering.taxable ?? true,
        qty: 1,
        pricingTierLabel: tierToUse.label,
        pricingTierDescription: tierToUse.description || "",
        offeringType: offering.type,
      },
    ]);
  }

  // Select Shop In Network
  async function selectShop(shop: any, setter: Function) {
    try {
      setShopChosen(false);
      setter(shop);

      if (!shop?._id) return;

      setOfferings([]);
      setSelectedProducts([]);

      await loadFulfillingShop(shop._id);
      await loadOfferings(shop._id);

      setPricing((prev) => ({
        ...prev,
        deliveryFee: shop.deliveryCharge || 0,
      }));

      setShopChosen(true);
    } catch (error: any) {
      console.error("Error selecting shop: ", error);

      toast.error(
        error?.message ||
          "There was an error when selecting shop, please try again!",
      );
    }
  }

  // Select Google Shop
  function selectGoogleShop(
    name: string,
    phone?: string,
    address?: string,
    email?: string,
    googlePlaceId?: string,
  ) {
    try {
      setShopChosen(false);
      if (!name) return;
      
      setGoogleShop({
        name,
        phone: phone || "",
        address: address || "",
        email: email || "",
        googlePlaceId: googlePlaceId || "",
      });

      setSelectedShop(null);
      setFulfillingShop(null);
      setFulfillShopId("");
      setOfferings([]);
      setSelectedProducts([]);



      // setPricing((prev) => ({
      //   ...prev,
      //   productsTotal: 0.0,
      //   deliveryFee: 0.0,
      //   taxAmount: 0.0,
      //   customerPays: 0.0,
      //   orderTotal: 0.0,
      //   fulfillingShopGets: 0.0,
      // }));

      setShopChosen(true);
    } catch (error: any) {
      console.error("Error selecting Google shop: ", error);

      toast.error(
        error?.message ||
          "There was an error when selecting Google shop, please try again!",
      );
    }
  }

  // Select Manual Outside Florist
  function selectManualOutsideFlorist() {
    try {
      setShopChosen(false);

      setSelectedShop(null);
      setFulfillingShop(null);
      setFulfillShopId("");
      setOfferings([]);
      setSelectedProducts([]);

      setGoogleShop({
        name: "Manual Outside Florist",
        phone: "",
        address: "",
      });

      setPricing((prev) => ({
        ...prev,
        productsTotal: 0,
        deliveryFee: 0,
        taxAmount: 0,
        customerPays: 0,
        orderTotal: 0,
        fulfillingShopGets: 0,
        feeCharge: 0,
      }));

      setShopChosen(true);
      setOrderPage("order-form");
      setOrderPageOption("products");
    } catch (error: any) {
      console.error("Error selecting manual outside florist:", error);
      toast.error("Could not start manual outside florist order.");
    }
  }

  // Confirm Manual Outside Florist
  function confirmManualOutsideFlorist() {
    if (!manualOutsideFlorist.name.trim()) {
      toast.error("Enter the florist name.");
      return;
    }

    setSelectedShop(null);
    setFulfillingShop(null);
    setFulfillShopId("");
    setOfferings([]);
    setSelectedProducts([]);

    setGoogleShop({
      name: manualOutsideFlorist.name,
      phone: manualOutsideFlorist.phone,
      address: manualOutsideFlorist.address,
      email: manualOutsideFlorist.email,
      googlePlaceId: "",
    });

    setShopChosen(true);
    setOrderPage("order-form");
    setOrderPageOption("recipient");
  }

  // Google Search Function
  const handleGoogleSearch = async () => {
    const zip = recipient.zip.trim();

    if (!zip || zip.length !== 5) {
      toast.error("Please enter a valid 5-digit ZIP code first.");
      return;
    }

    setGoogleSearch(true);
    setLoading(true);
    setGoogleApiFailed(false);

    try {
      const result = await searchGoogleFlorists(zip);

      if (!result.ok) {
        setGoogleResults([]);
        setGoogleApiFailed(true);
        setOutsideFloristFormOpen(true);
        toast.error(result.error || "Google florist search is unavailable. You can search Google manually or enter the florist below.");
        return;
      }

      const sortedData = [...(result.places || [])].sort((a, b) => {
        const zipA = getZipFromComponents(a.addressComponents);
        const zipB = getZipFromComponents(b.addressComponents);

        const isAMatch = zipA === zip;
        const isBMatch = zipB === zip;

        if (isAMatch && !isBMatch) return -1;
        if (!isAMatch && isBMatch) return 1;

        return (b.rating || 0) - (a.rating || 0);
      });

      setGoogleResults(sortedData);
      setLastZip(zip);

      if (sortedData.length === 0) {
        toast.error("No Google florist results found. You can enter the florist manually.");
        setOutsideFloristFormOpen(true);
      }

      if (result.source === "cache") {
        toast.success("Loaded cached Google florist results.");
      }

      if (result.source === "stale_cache") {
        toast.error(result.warning || "Showing cached results.");
      }
    } catch (error) {
      console.error("Google florist search failed:", error);
      setGoogleResults([]);
      setGoogleApiFailed(true);
      setOutsideFloristFormOpen(true);
      toast.error("Google florist search is unavailable. You can enter the florist manually.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract zip code from addressComponents
  const getZipFromComponents = (components?: any[]) => {
    if (!Array.isArray(components)) return "";

    const zipObj = components.find((c) => c.types?.includes("postal_code"));

    return zipObj?.longText || zipObj?.long_name || "";
  };

  // Phone Formatting
  const handlePhoneChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    state: any,
    setter: Function,
  ) => {
    const rawValue = e.target.value.replace(/\D/g, "").slice(0, 10);
    setter({ ...state, phone: rawValue });
  };

  const handlePhoneBlur = (state: any, setter: Function) => {
    const digits = state.phone.replace(/\D/g, "");
    let formatted = digits;

    if (digits.length === 7) {
      formatted = digits.replace(/(\d{3})(\d{4})/, "$1-$2");
    } else if (digits.length === 10) {
      formatted = digits.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    }

    setter({ ...state, phone: formatted });
  };

  const handlePhoneFocus = (state: any, setter: Function) => {
    // Strip dashes back out for clean editing
    setter({
      ...state,
      phone: state.phone.replace(/\D/g, ""),
    });
  };

  // Outside Network Helper Functions
  const addOutsideItem = () => {
    setOutsideNetwork((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", description: "", qty: 1, price: 0 }],
    }));
  };

  const updateOutsideItem = (index: number, field: string, value: any) => {
    setOutsideNetwork((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const removeOutsideItem = (index: number) => {
    setOutsideNetwork((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // #endregion

  return (
    <>
      <Toaster position="top-center" />
      <div>
        <div className="mx-auto space-y-8 xl:space-y-4">
          <div className="bg-transparent rounded-2xl shadow-lg">
            {/* Page Buttons */}
            <div className="flex sm:gap-2">
              <button
                onClick={() => setOrderPage("shop-lookup")}
                className={
                  (orderPage === "shop-lookup"
                    ? "text-white bg-purple-400 border-0"
                    : "border") + " rounded-t-2xl px-4 py-2"
                }
              >
                Shop Lookup
              </button>

              <button
                onClick={() => setOrderPage("order-form")}
                disabled={!shopChosen}
                className={
                  (orderPage === "order-form"
                    ? "text-white bg-purple-400 border-0"
                    : "border") + " rounded-t-2xl px-4 py-2"
                }
              >
                Order Form
              </button>

              <button
                onClick={() => setOrderPage("send-order")}
                disabled={!shopChosen}
                className={
                  (orderPage === "send-order"
                    ? "text-emerald-50 bg-purple-400 border-0"
                    : "border") + " rounded-t-2xl px-4 py-2"
                }
              >
                Send Order
              </button>
            </div>

            <div>
              {/* Address Search + Shop Picker */}
              <div
                className={
                  (orderPage === "shop-lookup" ? "block" : "hidden") +
                  " bg-purple-400 rounded-b-2xl shadow-lg p-8 space-y-4 md:rounded-tr-2xl"
                }
              >
                <div>
                  <div className="2xl:flex justify-between">
                    <p
                      className={
                        (noShopsInArea ? "block" : "hidden") +
                        " text-2xl font-bold text-red-600 mb-4"
                      }
                    >
                      We're not in this area yet.
                    </p>

                    <div
                      className={
                        (noShopsInArea ? "2xl:flex" : "hidden") + " flex-col"
                      }
                    >
                      <h2 className="text-xl font-semibold">
                        Shops pulled from Google Search
                      </h2>
                      <p className="text-gray-600">
                        Shops not part of <b>GetBloomDirect</b> network yet.
                      </p>
                    </div>
                  </div>

                  {/* Address Search */}
                  <div className="grid grid-cols-1 2xl:grid-cols-[minmax(420px,520px)_1fr] gap-6 items-start">
                    {/* LEFT: Address Lookup */}
                    <div
                      className="grid grid-cols-1 gap-4 pt-4 border-4 border-purple-600 rounded-2xl overflow-hidden bg-white/10 shadow-xl"
                      onKeyDown={handleKeyDown}
                    >
                      {/* Header */}
                      <div className="px-4">
                        <div>
                          <h2 className="block text-xl font-bold text-white">
                            Address Lookup
                          </h2>
                          
                          <p
                            className={
                              googleShop && shops.length < 1
                                ? "block"
                                : "hidden"
                            }
                          >
                            Chosen Shop: <b>{googleShop.name}</b>
                          </p>
                        </div>

                        <div>
                          {/* Delivery Date + Times */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-2">
                            {/* Del Date */}
                            <div className="col-span-1">
                              <label className="order-input-label">
                                Delivery Date
                              </label>
                              <input
                                type="date"
                                value={
                                  logistics.deliveryDate
                                    ? logistics.deliveryDate
                                        .toISOString()
                                        .split("T")[0]
                                    : ""
                                }
                                onChange={(e) =>
                                  setLogistics({
                                    ...logistics,
                                    deliveryDate: e.target.value
                                      ? new Date(e.target.value)
                                      : null,
                                  })
                                }
                                className="order-input"
                              />
                            </div>

                            {/* Del Time */}
                            <div className="col-span-1">
                              <label className="order-input-label">
                                Delivery Time
                              </label>
                              <select
                                value={logistics.timeOption}
                                onChange={(e) =>
                                  setLogistics({
                                    ...logistics,
                                    timeOption: e.target.value as
                                      | "anytime"
                                      | "specific",
                                  })
                                }
                                className="order-input focus:rounded-b-none"
                              >
                                <option value="anytime">Anytime</option>
                                <option value="specific">Specific Time</option>
                              </select>
                            </div>

                            {logistics.timeOption === "specific" && (
                              <div className="grid grid-cols-2 col-span-1 sm:grid sm:grid-cols-2 sm:col-span-2 sm:gap-x-2">
                                {/* From Time */}
                                <div>
                                  <label className="block text-lg font-bold ml-2">
                                    From
                                  </label>
                                  <input
                                    type="time"
                                    value={logistics.timeFrom}
                                    onChange={(e) =>
                                      setLogistics({
                                        ...logistics,
                                        timeFrom: e.target.value,
                                      })
                                    }
                                    className="order-input"
                                  />
                                </div>

                                {/* To Time */}
                                <div>
                                  <label className="block text-lg font-bold ml-2">
                                    To
                                  </label>
                                  <input
                                    type="time"
                                    value={logistics.timeTo}
                                    onChange={(e) =>
                                      setLogistics({
                                        ...logistics,
                                        timeTo: e.target.value,
                                      })
                                    }
                                    className="order-input"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Recipient Data */}
                      <div className="px-4 grid gap-x-4 gap-y-1 grid-cols-1 md:grid-cols-3">
                        {/* Street Address */}
                        <div className="md:col-span-3">
                          <label className="order-input-label">
                            Recipient Street Address
                          </label>
                          <input
                            name="address"
                            value={recipient.address}
                            placeholder="street address"
                            className="px-2 py-1 rounded-md text-xl w-full capitalize"
                            onChange={(e) =>
                              setRecipient({
                                ...recipient,
                                address: e.target.value,
                              })
                            }
                          />
                        </div>
                        {/* Zip */}
                        <div>
                          <label className="order-input-label">
                            Recipient Zip
                          </label>
                          <input
                            name="zip"
                            value={recipient.zip}
                            maxLength={6}
                            placeholder="zip"
                            className="px-2 py-1 rounded-md text-xl w-full"
                            onChange={(e) =>
                              setRecipient({
                                ...recipient,
                                zip: e.target.value,
                              })
                            }
                          />
                        </div>
                        {/* City */}
                        <div>
                          <label className="order-input-label">
                            Recipient City
                          </label>
                          <input
                            name="city"
                            value={recipient.city}
                            placeholder="city"
                            className="px-2 py-1 rounded-md text-xl w-full capitalize"
                            onChange={(e) =>
                              setRecipient({
                                ...recipient,
                                city: e.target.value,
                              })
                            }
                          />
                        </div>
                        {/* State */}
                        <div>
                          <label className="order-input-label">
                            Recipient State
                          </label>
                          <input
                            name="state"
                            value={recipient.state}
                            placeholder="state"
                            className="px-2 py-1 rounded-md text-xl w-full capitalize"
                            onChange={(e) =>
                              setRecipient({
                                ...recipient,
                                state: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      
                      {/* Search Button */}
                      <button
                        onClick={searchShops}
                        disabled={searching}
                        className="px-4 py-2 bg-purple-600 text-white text-2xl font-bold hover:bg-purple-700 transition-all"
                      >
                        {searching ? "Searching..." : "Find Shops"}
                      </button>
                    </div>

                    {/* RIGHT: Results Panel */}
                    <div className="rounded-2xl bg-white p-5 shadow-2xl border border-purple-200 min-h-[24rem] max-h-[38rem] overflow-y-auto">
                      {!findShopSuccess && !noShopsInArea && !searching && (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-16">
                          <h2 className="text-2xl font-bold text-purple-700">
                            Find a florist
                          </h2>

                          <p className="mt-2 max-w-md">
                            Enter the recipient address and delivery details, then search for available florists.
                          </p>
                        </div>
                      )}

                      {searching && (
                        <div className="h-full flex flex-col items-center justify-center text-center py-16">
                          <BloomSpinner size={64} />

                          <h2 className="text-2xl font-bol text-purple-700">
                            Searching available florists...
                          </h2>

                          <p className="mt-2 text-gray-500">
                            Checking delivery availability for this address.
                          </p>
                        </div>
                      )}

                      {findShopSuccess && shops.length > 0 && (
                        <div className="space-y-4">
                          <div>
                            <h2 className="text-2xl font-bold text-purple-700">
                              Available Network Florists
                            </h2>

                            <p className="text-gray-600">
                              These GetBloomDirect florists can serve this delivery area.
                            </p>
                          </div>

                          {shops.map((shop) => (
                            <label
                              key={shop._id}
                              className={`block p-5 border-2 rounded-2xl cursor-pointer transition-all ${
                                  selectedShop?._id === shop._id
                                    ? "border-emerald-600 bg-emerald-50 shadow-xl"
                                    : "border-gray-200 hover:border-purple-500 hover:shadow-lg"
                                }`}
                            >
                              <div className="flex justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold text-gray-900">
                                      {shop.businessName}
                                    </h3>

                                    {shop.verifiedFlorist && (
                                      <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-bold text-purple-700">
                                        Verified
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-gray-600">{shop.contact?.phone}</p>
                                  <p>
                                    {shop.address?.street} • {shop.address?.city}, {shop.address?.state}
                                  </p>

                                  <p className="mt-2 font-semibold text-gray-800">
                                    Delivery Charge: ${shop.deliveryCharge}
                                  </p>
                                </div>

                                <input 
                                  type="radio"
                                  name="shop"
                                  checked={selectedShop?._id === shop._id}
                                  onChange={() => selectShop(shop, setSelectedShop)}
                                  className="mt-2 h-7 w-7"
                                />
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {noShopsInArea && (
                        <div className="space-y-5">
                          <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                            <h2 className="text-2xl font-bold text-red-700">
                              No network florist found
                            </h2>

                            <p className="mt-1 text-gray-700">
                              GetBloomDirect does not currently have a partner florist who serves this address.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-3">
                            <button
                              onClick={() => {
                                setRequestFlorist((prev) => !prev);
                                setOutsideFloristFormOpen(true);
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-2xl font-bold shadow-lg transition-all"
                            >
                              Request a Florist in This Area
                            </button>

                            <button
                              onClick={handleGoogleSearch}
                              disabled={loading}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-2xl font-bold shadow-lg transition-all"
                            >
                              {loading ? "Searching Google..." : "Show More Shops Outside Our Network"}
                            </button>

                            <button
                              type="button"
                              onClick={() => setOutsideFloristFormOpen(true)}
                              className="bg-white hover:bg-gray-100 text-purple-700 px-4 py-3 rounded-2xl font-bold shadow-lg transition-all border-2 border-purple-700"
                            >
                              Enter Outside Florist Manually
                            </button>
                          </div>

                          {googleApiFailed && (
                            <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4">
                              <p className="text-red-700 font-bold mb-3">
                                Google search failed. You can still search manually and enter the florist below.
                              </p>

                              <a
                                href={googleSearchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold shadow transition-all"
                              >
                                Open Google Search
                              </a>
                            </div>
                          )}

                          {googleSearch && !googleApiFailed && googleResults.length > 0 && (
                            <div className="space-y-4">
                              <div>
                                <h2 className="text-xl font-bold text-purple-700">
                                  Shops pulled from Google Search
                                </h2>

                                <p className="text-sm text-gray-600">
                                  These shops are not part of GetBloomDirect yet.
                                </p>
                              </div>

                              {googleResults.map((shop) => (
                                <div
                                  key={shop.id}
                                  className={
                                    (googleShop.name === shop.displayName.text
                                      ? "border-purple-600 bg-purple-50"
                                      : "border-gray-200 bg-white") +
                                    " p-4 border-2 rounded-xl shadow-sm flex justify-between gap-4"
                                  }
                                >
                                  <div>
                                    <h3 className="font-bold text-lg text-emerald-900">
                                      {shop.displayName.text}
                                    </h3>

                                    <p className="text-gray-600">
                                      {shop.nationalPhoneNumber || "No phone listed"}
                                    </p>

                                    <p className="text-gray-600">
                                      {shop.formattedAddress || "No address listed"}
                                    </p>

                                    {shop.rating && (
                                      <div className="text-yellow-500 font-medium">
                                        ★ {shop.rating}
                                        <span className="text-gray-400 text-sm"> Google Rating</span>
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    className="self-start rounded-lg px-4 py-2 bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                                    onClick={() =>
                                      selectGoogleShop(
                                        shop.displayName.text,
                                        shop.nationalPhoneNumber,
                                        shop.formattedAddress,
                                        shop.id,
                                      )
                                    }
                                  >
                                    Select
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {outsideFloristFormOpen && (
                            <div className="mt-6 rounded-2xl bg-white p-4 shadow-xl border-2 border-purple-600 max-w-2xl">
                              <h3 className="text-xl font-bold text-purple-700 mb-2">
                                Outside Florist Information
                              </h3>

                              <p className="text-sm text-gray-600 mb-4">
                                Enter the florist you contacted. Once saved, you can continue building the order.
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="sm:col-span-2">
                                  <label className="text-xs uppercase text-gray-600 ml-2">
                                    Florist Name
                                  </label>
                                  <input
                                    type="text"
                                    value={manualOutsideFlorist.name}
                                    onChange={(e) =>
                                      setManualOutsideFlorist({
                                        ...manualOutsideFlorist,
                                        name: e.target.value,
                                      })
                                    }
                                    placeholder="Florist name"
                                    className="order-input"
                                  />
                                </div>

                                <div>
                                  <label className="text-xs uppercase text-gray-600 ml-2">
                                    Phone
                                  </label>
                                  <input
                                    type="text"
                                    value={manualOutsideFlorist.phone}
                                    onChange={(e) =>
                                      setManualOutsideFlorist({
                                        ...manualOutsideFlorist,
                                        phone: e.target.value,
                                      })
                                    }
                                    placeholder="Phone number"
                                    className="order-input"
                                  />
                                </div>

                                <div>
                                  <label className="text-xs uppercase text-gray-600 ml-2">
                                    Email optional
                                  </label>
                                  <input
                                    type="email"
                                    value={manualOutsideFlorist.email}
                                    onChange={(e) =>
                                      setManualOutsideFlorist({
                                        ...manualOutsideFlorist,
                                        email: e.target.value,
                                      })
                                    }
                                    placeholder="Email address"
                                    className="order-input"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label className="text-xs uppercase text-gray-600 ml-2">
                                    Address
                                  </label>
                                  <input
                                    type="text"
                                    value={manualOutsideFlorist.address}
                                    onChange={(e) =>
                                      setManualOutsideFlorist({
                                        ...manualOutsideFlorist,
                                        address: e.target.value,
                                      })
                                    }
                                    placeholder="Florist address"
                                    className="order-input"
                                  />
                                </div>
                              </div>

                              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                                <button
                                  type="button"
                                  onClick={confirmManualOutsideFlorist}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold w-full"
                                >
                                  Use This Florist
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setRequestFlorist(true)}
                                  className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-xl font-semibold w-full"
                                >
                                  Also Invite This Florist
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Form */}
              <div
                className={
                  (orderPage === "order-form" ? "block" : "hidden") +
                  " bg-purple-400 rounded-b-2xl shadow-lg p-4 lg:p-6 xl:p-4 xl:space-y-2 space-y-4 md:rounded-tr-2xl"
                }
              >
                {/* Main Order Form Screen */}
                <div>
                  {/* Recipient + Products */}
                  <div
                    className={`
                      ${orderPageOption === "recipient" || orderPageOption === "products" ? "grid" : "hidden"} 
                      grid-cols-1 xl:grid-cols-2 gap-6 w-full
                    `}
                  >
                    {/* Recipient */}
                    <div
                      className={`
                        ${orderPageOption === "recipient" ? "block" : "hidden xl:block"} 
                       order-page-option
                      `}
                    >
                      <h2 className="order-header">Recipient</h2>
                      <div>
                        {/* First + Last Name + Phone + Company/Event */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-2 xl:gap-2 2xl:grid-cols-2 mb-2">
                          {/* First Name */}
                          <div>
                            <label
                              htmlFor="first-name"
                              className="order-input-label"
                            >
                              First Name
                            </label>
                            <input
                              name="first-name"
                              id="first-name"
                              placeholder="First Name"
                              required
                              value={recipient.firstName}
                              onChange={(e) =>
                                setRecipient({
                                  ...recipient,
                                  firstName: e.target.value,
                                })
                              }
                              className="order-input"
                            />
                          </div>
                          {/* Last Name */}
                          <div>
                            <label
                              htmlFor="last-name"
                              className="order-input-label"
                            >
                              Last Name
                            </label>
                            <input
                              name="last-name"
                              id="last-name"
                              placeholder="Last Name"
                              required
                              value={recipient.lastName}
                              onChange={(e) =>
                                setRecipient({
                                  ...recipient,
                                  lastName: e.target.value,
                                })
                              }
                              className="order-input"
                            />
                          </div>

                          {/* Phone Number -- NEED TO FORMAT THIS */}
                          <div>
                            <label
                              htmlFor="rec-phone"
                              className="order-input-label"
                            >
                              Phone Number
                            </label>
                            <input
                              name="rec-phone"
                              id="rec-phone"
                              placeholder="555-555-5555"
                              required
                              value={recipient.phone}
                              onChange={(e) =>
                                handlePhoneChange(e, recipient, setRecipient)
                              }
                              onBlur={() =>
                                handlePhoneBlur(recipient, setRecipient)
                              }
                              onFocus={() =>
                                handlePhoneFocus(recipient, setRecipient)
                              }
                              className="order-input"
                            />
                          </div>
                          {/* Company / Event */}
                          <div className="md:col-span-3 xl:col-span-1">
                            <label
                              htmlFor="company"
                              className="order-input-label"
                            >
                              Company / Event (optional)
                            </label>
                            <input
                              name="company"
                              id="company"
                              placeholder="Company / Event (optional)"
                              value={recipient.company}
                              onChange={(e) =>
                                setRecipient({
                                  ...recipient,
                                  company: e.target.value,
                                })
                              }
                              className="order-input xl:text-base xl:py-[0.37rem]"
                            />
                          </div>
                        </div>
                        {/* Street Address + City + State + Zip */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-3">
                          {/* Street Address */}
                          <div className="sm:col-span-3 xl:col-span-3">
                            <label
                              htmlFor="street-address"
                              className="order-input-label"
                            >
                              Street Address
                            </label>
                            <input
                              name="street-address"
                              id="street-address"
                              placeholder="Street Address"
                              required
                              value={recipient.address}
                              onChange={(e) =>
                                setRecipient({
                                  ...recipient,
                                  address: e.target.value,
                                })
                              }
                              className="order-input xl:text-base xl:py-[0.37rem] capitalize"
                            />
                          </div>
                          {/* Zip -- Might need to adjust logic when dealing with Canadian Shops */}
                          {/* Also need to fill City + State when this is changed */}
                          <div>
                            <label
                              htmlFor="rec-zip"
                              className="order-input-label"
                            >
                              ZIP
                            </label>
                            <input
                              name="rec-zip"
                              id="rec-zip"
                              placeholder="ZIP"
                              value={recipient.zip}
                              onChange={(e) =>
                                setRecipient({
                                  ...recipient,
                                  zip: e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 5),
                                })
                              }
                              className="order-input uppercase"
                            />
                          </div>
                          {/* City */}
                          <div>
                            <label className="order-input-label">City</label>
                            <input
                              placeholder="City"
                              value={recipient.city}
                              readOnly
                              className="order-input uppercase bg-gray-100"
                            />
                          </div>
                          {/* State */}
                          <div>
                            <label className="order-input-label">State</label>
                            <input
                              placeholder="State"
                              value={recipient.state}
                              readOnly
                              className="order-input uppercase bg-gray-100"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Product */}
                    {usingGoogleShop ? (
                      <div
                        className={`
                          ${orderPageOption === "products" ? "block" : "hidden xl:block"} 
                          order-page-option
                          `}
                      >
                        <h2 className="order-header">Outside Network Order</h2>

                        <div className="rounded-2xl bg-white p-4 mb-4 border">
                          <p className="font-bold text-lg">{googleShop.name}</p>
                          <p>{googleShop.phone || "No phone listed"}</p>
                          <p>{googleShop.address}</p>
                          <p className="mt-2 text-sm text-red-600 font-semibold">
                            This florist is not in GetBloomDirect. This order
                            will be saved as a manual reference order only.
                          </p>
                        </div>

                        <div 
                          className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2"
                        >
                          <div className="sm:col-span-2 space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-lg">Manual Items</h3>

                              <button
                                type="button"
                                onClick={addOutsideItem}
                                className="rounded-lg bg-purple-600 px-3 py-1 text-white font-semibold hover:bg-purple-700"
                              >
                                + Add Item
                              </button>
                            </div>

                            {outsideNetwork.items.map((item, index) => (
                              <div
                                key={index}
                                className="rounded-xl border bg-white p-3 grid grid-cols-1 sm:grid-cols-4 gap-2"
                              >
                                <div className="sm:col-span-2">
                                  <label className="text-xs opacity-75 text-gray-700 uppercase ml-2">
                                    Item Name
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Designer's Choice, balloon, chocolates..."
                                    value={item.name}
                                    onChange={(e) =>
                                      updateOutsideItem(index, "name", e.target.value)
                                    }
                                    className="order-input"
                                  />
                                </div>

                                <div>
                                  <label className="text-xs opacity-75 text-gray-700 uppercase ml-2">
                                    Qty
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.qty}
                                    onChange={(e) =>
                                      updateOutsideItem(index, "qty", Number(e.target.value))
                                    }
                                    className="order-input"
                                  />
                                </div>

                                <div>
                                  <label className="text-xs opacity-75 text-gray-700 uppercase ml-2">
                                    Price
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={item.price}
                                    onChange={(e) =>
                                      updateOutsideItem(index, "price", Number(e.target.value))
                                    }
                                    className="order-input"
                                  />
                                </div>

                                <div className="sm:col-span-4">
                                  <label className="text-xs opacity-75 text-gray-700 uppercase ml-2">
                                    Description
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Optional item details"
                                    value={item.description}
                                    onChange={(e) =>
                                      updateOutsideItem(index, "description", e.target.value)
                                    }
                                    className="order-input"
                                  />
                                </div>

                                <div className="sm:col-span-4 flex justify-between items-center text-sm">
                                  <p>
                                    Line Total:{" "}
                                    <b>${roundToHundredth((Number(item.qty) || 1) * (Number(item.price) || 0))}</b>
                                  </p>

                                  {outsideNetwork.items.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeOutsideItem(index)}
                                      className="text-red-600 font-semibold hover:text-red-700"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Delivery Fee */}
                          <div>
                            <label className="text-xs opacity-75 text-gray-700 uppercase ml-2">
                              Delivery Fee ($)
                            </label>
                            <input
                              type="number"
                              placeholder="Delivery fee"
                              value={outsideNetwork.deliveryFee}
                              onChange={(e) =>
                                setOutsideNetwork({
                                  ...outsideNetwork,
                                  deliveryFee: Number(e.target.value),
                                })
                              }
                              className="order-input"
                            />
                          </div>
                          {/* Tax Amount */}
                          <div>
                            <label className="text-xs opacity-75 text-gray-700 uppercase ml-2">
                              Tax Amount ($)
                            </label>
                            <input
                              type="number"
                              placeholder="Tax amount"
                              value={outsideNetwork.taxAmount}
                              onChange={(e) =>
                                setOutsideNetwork({
                                  ...outsideNetwork,
                                  taxAmount: Number(e.target.value),
                                })
                              }
                              className="order-input"
                            />
                          </div>
                          {/* Order Total */}
                          <div>
                            <label className="text-xs opacity-75 text-gray-700 uppercase ml-2">
                              Order Total ($)
                            </label>
                            <input
                              type="number"
                              placeholder="Order total"
                              value={outsideNetwork.orderTotal}
                              onChange={(e) =>
                                setOutsideNetwork({
                                  ...outsideNetwork,
                                  orderTotal: Number(e.target.value),
                                })
                              }
                              className="order-input"
                            />
                          </div>
                          {/* Contact Person */}
                          <div className="sm:col-span-2">
                            <label className="text-xs opacity-75 text-gray-700 uppercase ml-2">
                              Contact Person
                            </label>
                            <input
                                type="text"
                                placeholder="Contact person at florist"
                                value={outsideNetwork.contactPerson}
                                onChange={(e) =>
                                  setOutsideNetwork({
                                    ...outsideNetwork,
                                    contactPerson: e.target.value,
                                  })
                                }
                                className="order-input"
                              />
                          </div>
                          {/* Notes */}
                          <div className="sm:col-span-2">
                            <label className="text-xs opacity-75 text-gray-700 uppercase ml-2">
                              Notes
                            </label>
                            <textarea
                              placeholder="Manual order notes — product details, delivery info, confirmation number, etc."
                              value={outsideNetwork.notes}
                              onChange={(e) =>
                                setOutsideNetwork({
                                  ...outsideNetwork,
                                  notes: e.target.value,
                                })
                              }
                              className="order-input"
                              rows={4}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`
                          ${orderPageOption === "products" ? "block" : "hidden xl:block"} 
                        order-page-option
                        `}
                      >
                        <h2 className="order-header">Products</h2>
                        {offerings.map((offering) => {
                          const isTierSelected = (offering: any, tier: any) =>
                            selectedProducts.some(
                              (p) =>
                                p.productKey ===
                                `${offering._id}-${tier.label}`,
                            );
                          const isSelected = selectedProducts.some(
                            (p) => p.offeringId === offering._id,
                          );
                          return (
                            <div
                              key={offering._id}
                              className="relative p-4 border border-gray-300 rounded-2xl"
                            >
                              {isSelected && (
                                <CheckBadgeIcon className="h-6 w-6 text-green-500 absolute top-4 right-4" />
                              )}
                              <p className="font-bold">{offering.name}</p>
                              <p>{offering.description}</p>

                              <div className="flex flex-wrap gap-2">
                                {offering.pricingTiers?.map((tier: any) => (
                                  <button
                                    key={tier.label}
                                    type="button"
                                    onClick={() =>
                                      toggleOffering(offering, tier)
                                    }
                                    className="mt-2 rounded-lg bg-purple-500 px-4 py-2 text-white"
                                  >
                                    {isTierSelected(offering, tier) && (
                                      <CheckBadgeIcon className="h-6 w-6 text-green-300" />
                                    )}
                                    Select {tier.label} - ${tier.price}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                          // <div
                          //   key={index}
                          //   className="p-4 border border-gray-300 rounded-2xl shadow-2xl flex flex-col gap-2 relative"
                          // >
                          //   {/* Chosen */}
                          //   <div>
                          //     <CheckBadgeIcon className="h-6 w-6 text-green-500 absolute top-4 right-4" />
                          //   </div>
                          //   {/* Taxable or Not */}
                          //   <div className="font-semibold">
                          //     {product.taxable ? (
                          //       <p className="text-green-700">Taxable</p>
                          //     ) : (
                          //       <p className="text-red-700">Non-Taxable</p>
                          //     )}
                          //   </div>

                          //   <div className="flex flex-col gap-2 sm:flex-row">
                          //     {/* Product Photo */}
                          //     {product.photo ? (
                          //       <div
                          //         className="w-24 h-24 border border-purple-200 rounded-lg overflow-hidden p-4 cursor-zoom-in transition-all flex items-center hover:p-2 hover:opacity-80"
                          //       >
                          //         <img
                          //           src={product.photo}
                          //           alt={product.name}
                          //           onClick={() => setZoomedImage(product.photo)}
                          //         />
                          //       </div>
                          //     ) : (
                          //       <div className="h-24 w-24 flex items-center justify-center shadow-2xl border border-gray-400 rounded-md">
                          //         {product.name}
                          //       </div>
                          //     )}

                          //     {/* Name, Price */}
                          //     <div>
                          //       <p>
                          //         <b>Name: </b>{product.name}
                          //       </p>
                          //       <p>
                          //         <b>Price: </b>${product.price}
                          //       </p>
                          //     </div>
                          //   </div>

                          //   {/* Description */}
                          //   <div className="p-2 border border-gray-200 rounded-lg shadow-lg text-sm">
                          //     {product.description}
                          //   </div>

                          //   {/* Select Button */}
                          //   <button
                          //     className="py-2 rounded-lg shadow-2xl w-full text-white bg-purple-500 hover:bg-purple-600 transition-all"

                          //   >
                          //     Select
                          //   </button>
                          // </div>
                        })}
                        {/* Image Modal / Lightbox */}
                        {zoomedImage && (
                          <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out"
                            onClick={() => setZoomedImage(null)} // Click background to close
                          >
                            <div className="relative max-w-4xl max-h-[90vh]">
                              <button
                                className="absolute -top-12 right-0 text-white hover:text-gray-300 text-xl font-bold"
                                onClick={() => setZoomedImage(null)}
                              >
                                Close [X]
                              </button>
                              <img
                                src={zoomedImage}
                                alt="Enlarged view"
                                className="rounded-2xl max-w-full max-h-[85vh] object-contain shadow-2xl"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Delivery + Customer */}
                  <div
                    className={`
                      ${orderPageOption === "delivery" || orderPageOption === "customer" ? "grid" : "hidden"} 
                      grid-cols-1 xl:grid-cols-2 gap-6 w-full
                    `}
                  >
                    {/* Delivery */}
                    <div
                      className={`
                        ${orderPageOption === "delivery" ? "block" : "hidden xl:block"} 
                      order-page-option
                      `}
                    >
                      <h2 className="order-header">Delivery</h2>
                      {/* Delivery Date */}
                      <div>
                        <label className="order-input-label">
                          Delivery Date
                        </label>
                        <input
                          type="date"
                          value={
                            logistics.deliveryDate
                              ? logistics.deliveryDate
                                  .toISOString()
                                  .split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            setLogistics({
                              ...logistics,
                              deliveryDate: e.target.value
                                ? new Date(e.target.value)
                                : null,
                            })
                          }
                          className="order-input lowercase"
                        />
                      </div>
                      {/* Delivery Time */}
                      <div>
                        <label className="order-input-label">
                          Delivery Time
                        </label>
                        <select
                          value={logistics.timeOption}
                          onChange={(e) =>
                            setLogistics({
                              ...logistics,
                              timeOption: e.target.value as
                                | "anytime"
                                | "specific",
                            })
                          }
                          className="order-input focus:rounded-b-none"
                        >
                          <option value="anytime">Anytime</option>
                          <option value="specific">Specific Time</option>
                        </select>
                        {logistics.timeOption === "specific" && (
                          <div className="mt-4 grid sm:grid-cols-2 gap-4 text-black opacity-100">
                            {/* From Time */}
                            <div>
                              <label className="block text-lg font-bold ml-2">
                                From
                              </label>
                              <input
                                type="time"
                                value={logistics.timeFrom}
                                onChange={(e) =>
                                  setLogistics({
                                    ...logistics,
                                    timeFrom: e.target.value,
                                  })
                                }
                                className="order-input"
                              />
                            </div>
                            {/* To Time */}
                            <div>
                              <label className="block text-lg font-bold ml-2">
                                To
                              </label>
                              <input
                                type="time"
                                value={logistics.timeTo}
                                onChange={(e) =>
                                  setLogistics({
                                    ...logistics,
                                    timeTo: e.target.value,
                                  })
                                }
                                className="order-input"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Special Instructions */}
                      <div>
                        <label className="order-input-label">
                          Special Instructions (optional)
                        </label>
                        <textarea
                          placeholder="Special Instructions (gate code, leave at desk, etc)"
                          value={logistics.specialInstructions}
                          onChange={(e) =>
                            setLogistics({
                              ...logistics,
                              specialInstructions: e.target.value,
                            })
                          }
                          rows={3}
                          className="order-input"
                        />
                      </div>
                    </div>

                    {/* Customer */}
                    <div
                      className={`
                        ${orderPageOption === "customer" ? "block" : "hidden xl:block"} 
                      order-page-option
                      `}
                    >
                      <h2 className="order-header">Customer (Optional)</h2>
                      <p className="text-sm -mt-2 text-red-500">
                        *Adding a customer is recommended
                      </p>
                      <div className="space-y-2">
                        {/* First Name */}
                        <div>
                          <label
                            htmlFor="cust-first-name"
                            className="order-input-label"
                          >
                            First Name
                          </label>
                          <input
                            name="cust-first-name"
                            id="cust-first-name"
                            placeholder="First Name"
                            required
                            value={customer.firstName}
                            onChange={(e) =>
                              setCustomer({
                                ...customer,
                                firstName: e.target.value,
                              })
                            }
                            className="order-input"
                          />
                        </div>
                        {/* Last Name */}
                        <div>
                          <label
                            htmlFor="cust-last-name"
                            className="order-input-label"
                          >
                            Last Name
                          </label>
                          <input
                            name="cust-last-name"
                            id="cust-last-name"
                            placeholder="Last Name"
                            required
                            value={customer.lastName}
                            onChange={(e) =>
                              setCustomer({
                                ...customer,
                                lastName: e.target.value,
                              })
                            }
                            className="text-lg text-black px-3 py-2 border rounded-xl w-full capitalize"
                          />
                        </div>
                        {/* Phone Number */}
                        <div>
                          <label
                            htmlFor="cust-phone"
                            className="order-input-label"
                          >
                            Phone Number
                          </label>
                          <input
                            name="cust-phone"
                            id="cust-phone"
                            placeholder="Phone Number"
                            required
                            value={customer.phone}
                            onChange={(e) =>
                              handlePhoneChange(e, customer, setCustomer)
                            }
                            onBlur={() =>
                              handlePhoneBlur(customer, setCustomer)
                            }
                            onFocus={() =>
                              handlePhoneFocus(customer, setCustomer)
                            }
                            className="order-input"
                          />
                        </div>
                        {/* Email Address */}
                        <div>
                          <label
                            htmlFor="cust-email"
                            className="order-input-label"
                          >
                            Email Address
                          </label>
                          <input
                            name="cust-email"
                            id="cust-email"
                            type="email"
                            placeholder="Email Address"
                            required
                            value={customer.email}
                            onChange={(e) =>
                              setCustomer({
                                ...customer,
                                email: e.target.value,
                              })
                            }
                            className="order-input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Form Organizer */}
                <div className="sticky bottom-0 h-12 bg-emerald-50 rounded-xl border flex overflow-hidden">
                  <button
                    className="w-full h-full border-r border-emerald-200 hover:bg-emerald-200 transition-all"
                    onClick={() => setOrderPageOption("recipient")}
                  >
                    <span className="xl:hidden">Recipient</span>
                    <span className="hidden xl:block">Recipient / Product</span>
                  </button>
                  <button
                    className="w-full h-full border-x border-emerald-200 hover:bg-emerald-200 transition-all xl:hidden"
                    onClick={() => setOrderPageOption("products")}
                  >
                    Products
                  </button>
                  <button
                    className="w-full h-full border-x border-emerald-200 hover:bg-emerald-200 transition-all"
                    onClick={() => setOrderPageOption("delivery")}
                  >
                    <span className="xl:hidden">Delivery Info</span>
                    <span className="hidden xl:block">
                      Delivery Info / Customer
                    </span>
                  </button>
                  <button
                    className="w-full h-full border-l border-emerald-200 hover:bg-emerald-200 transition-all xl:hidden"
                    onClick={() => setOrderPageOption("customer")}
                  >
                    Customer
                  </button>
                </div>
              </div>

              {/* Send Order */}
              <div
                className={
                  (orderPage === "send-order" ? "block" : "hidden") +
                  " bg-purple-400 rounded-b-2xl shadow-lg p-4 md:rounded-tr-2xl"
                }
              >
                <div className="p-4 rounded-2xl shadow-lg bg-white">
                  {/* Order Overview */}
                  <div className="flex flex-col gap-4">
                    {/* Outside Network Warning Card */}
                    {usingGoogleShop && (
                      <div className="mb-4 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-900">
                        <h3 className="font-bold text-lg">Outside-Network Reference Order</h3>

                        <p className="text-sm">
                          This florist is not part of GetBloomDirect. This order will be saved for your records only. No notification, payment workflow, messaging, POS webhook, or review request will be sent.
                        </p>

                        <div className="mt-4 rounded-xl bg-white/70 p-3 border border-amber-200">
                          <p>
                            Want to invite {googleShop.name || "this florist"} to GetBloomDirect?
                          </p>

                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                            <input 
                              type="email"
                              value={toEmail}
                              onChange={(e) => setToEmail(e.target.value)}
                              placeholder="Florist email address"
                              className="rounded-lg border px-3 py-2 text-black w-full"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                setRequestFlorist(true);
                                toast.success("Invite email ready to send.");
                              }}
                              className="rounded-lg bg-purple-600 px-4 py-2 font-bold text-white hover:bg-purple-700"
                            >
                              Invite Florist
                            </button>
                          </div>

                          <p className="mt-2 text-xs text-amber-800">
                            Inviting them helps bring more florists into the network and makes future orders easier.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Send Button */}
                    <div className="border-b pb-4">
                      <button
                        onClick={sendOrder}
                        disabled={
                          (!usingNetworkShop && !usingGoogleShop) ||
                          !logistics.deliveryDate ||
                          sendingOrder ||
                          (usingNetworkShop && selectedProducts.length === 0)
                        }
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white text-xl px-4 py-2 rounded-full w-full transition-all"
                        title="Send Order"
                      >
                        {usingGoogleShop ? "Save Outside-Network Order" : `Send Order & Keep $${pricing.feeCharge} →`}
                      </button>
                    </div>

                    {/* Card Message */}
                    <div className="border-b pb-4 flex flex-col gap-2">
                      <button
                        onClick={() => setAddCard(true)}
                        className={
                          (addCard ? "hidden" : "block") +
                          " bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white text-xl px-4 py-2 rounded-full w-full transition-all"
                        }
                        title="Add Card Message"
                      >
                        Add Card Message
                      </button>
                      <button
                        onClick={() => {
                          setAddCard(false);
                        }}
                        className={
                          (addCard ? "block" : "hidden") +
                          " self-end mr-4 rounded-full bg-red-500 hover:bg-red-600 py-1 px-[0.6rem] text-white text-sm transition-all"
                        }
                        title="Remove Card Message"
                      >
                        X
                      </button>
                      <label
                        className={
                          (addCard ? "block" : "hidden") +
                          " text-xs text-gray-500 uppercase"
                        }
                      >
                        Card Message
                        <textarea
                          placeholder="I love you mom..."
                          onChange={(e) => setCardMessage(e.target.value)}
                          className={
                            (addCard ? "block" : "hidden") +
                            " w-full border rounded-lg p-2 text-base text-black"
                          }
                        ></textarea>
                      </label>
                    </div>

                    {/* Totals */}
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-3xl shadow-2xl p-6 text-center flex flex-col justify-evenly">
                      <h2 className="text-4xl md:text-3xl 2xl:text-4xl font-black mb-4">
                        Customer Pays
                      </h2>
                      <div className="grid md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4 max-w-3xl mx-auto mb-8">
                        {/* Products Total */}
                        <div>
                          <label className="block text-xl opacity-90">
                            Product Total
                          </label>
                          <p className="w-full mt-2 px-6 py-4 text-3xl font-bold text-center bg-white/20 rounded-2xl">
                            {roundToHundredth(pricing.productsTotal)}
                          </p>
                        </div>
                        {/* Delivery Fee */}
                        <div>
                          <div className="relative">
                            <label className="block text-xl opacity-90">
                              Delivery fee
                            </label>
                            <div
                              className={
                                (shops.length < 1 ? "block" : "hidden") +
                                " absolute top-1 right-2"
                              }
                            >
                              <button
                                onClick={() => {
                                  if (editDeliveryFee) {
                                    setEditDeliveryFee(false);
                                  } else {
                                    setEditDeliveryFee(true);
                                  }
                                }}
                                title="Edit Delivery Fee"
                              >
                                {editDeliveryFee ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="size-6 text-emerald-500"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="size-6"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                    />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                          <input
                            type="number"
                            value={pricing?.deliveryFee}
                            readOnly={!editDeliveryFee}
                            onChange={(e) =>
                              setPricing({
                                ...pricing,
                                deliveryFee: Number(e.target.value),
                              })
                            }
                            className={
                              (editDeliveryFee
                                ? "border-2 border-emerald-500"
                                : "border-none") +
                              " w-full mt-2 px-6 py-4 text-3xl font-bold text-center bg-white/20 rounded-2xl"
                            }
                            placeholder="20"
                          />
                        </div>

                        {/* Sales Tax */}
                        <div>
                          <div>
                            <label className="block text-xl opacity-90">
                              <span className="mr-2">Tax</span>
                              <span className="max-w-24 px-2 text-xl font-bold text-center rounded-md bg-white/20 placeholder-white/60">
                                {sendingShop.taxPercentage} %
                              </span>
                            </label>
                          </div>
                          <p className="w-full mt-2 px-6 py-4 text-3xl font-bold text-center bg-white/20 rounded-2xl">
                            {pricing.taxAmount}
                          </p>
                        </div>

                        <div>
                          <div className="relative">
                            <label className="block text-xl opacity-90">
                              Your profit (fee){" "}
                              <span className="text-white text-xl font-bold">
                                {sendingShop.feeType === "%" ? "%" : "$"}
                              </span>
                            </label>
                            <div className="absolute top-1 right-2">
                              <button
                                onClick={() =>
                                  setEditOriginatingFee((prev) => !prev)
                                }
                                title="Edit Originating Fee"
                              >
                                {editOriginatingFee ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="size-6 text-emerald-500"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="size-6"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                                    />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={originatingFeeValue}
                              readOnly={!editOriginatingFee}
                              onChange={(e) =>
                                setOriginatingFeeValue(Number(e.target.value))
                              }
                              className={
                                (editOriginatingFee
                                  ? "border-2 border-emerald-500"
                                  : "border-none") +
                                " w-full mt-2 px-6 py-4 text-3xl font-bold text-center bg-white/20 rounded-2xl text-yellow-300"
                              }
                              placeholder={
                                sendingShop.feeType === "%" ? "15" : "25"
                              }
                              step={
                                sendingShop.feeType === "%" ? "0.01" : "0.01"
                              }
                            />
                          </div>
                        </div>
                      </div>
                      {/* Customer Pays + Fee Charge + Fulfilling Shop Gets */}
                      <div>
                        {/* Customer Pays */}
                        <p className="text-7xl font-black mb-4">
                          ${roundToHundredth(pricing.customerPays)}
                        </p>
                        {/* Fee Charge + Fulfilling Shop Gets */}
                        <p className="text-3xl opacity-90">
                          You keep{" "}
                          <span className="text-yellow-300 font-black">
                            ${roundToHundredth(pricing.feeCharge)}
                          </span>{" "}
                          • Fulfilling shop gets $
                          {roundToHundredth(pricing.fulfillingShopGets)}
                        </p>
                      </div>
                    </div>

                    {/* Products */}
                    <div>
                      <h2 className="text-xl font-semi-bold mb-4">Products</h2>
                      {selectedProducts.map((product, index) => (
                        <div
                          className="flex flex-col gap-4 border-b pb-4 mb-4"
                          key={index}
                        >
                          <div className="flex gap-4">
                            {/* photo */}
                            <div
                              className={
                                !product.photo
                                  ? "border p-1 rounded-md shadow-md w-32 h-32"
                                  : "max-w-32"
                              }
                            >
                              {product.photo && (
                                <img
                                  src={product.photo}
                                  alt={product.name}
                                  className="p-1 rounded-md shadow-md w-full"
                                />
                              )}
                            </div>
                            {/* details */}
                            <div>
                              {/* product name */}
                              <p className="text-lg font-semibold">
                                {product.name}
                              </p>
                              {/* product description */}
                              <p className="max-w-sm">{product.description}</p>
                              {/* product price */}
                              <p className="font-semibold">${product.price}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedProducts((prev) =>
                                prev.filter(
                                  (p) => p.productKey !== product.productKey,
                                ),
                              );
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            title="Remove Product"
                          >
                            <svg
                              xmlns="http://www.w3.org"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-6 h-6"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                              />
                            </svg>
                          </button>

                          {/* ADD THIS LATER FOR QTY */}
                          {/* <div className="rounded-full border shadow-md max-w-32">
                          </div> */}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}




