// app/dashboard/new-order/NewOrderClient.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import "react-datepicker/dist/react-datepicker.css";
import ToolTip from "@/components/ToolTip";
import { searchGoogleFlorists } from "@/app/actions";
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

  // #region STATES

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

  //Fulfilling Shop
  const [fulfillingShop, setFulfillingShop] = useState<FulfillingShop | null>(
    null,
  );
  const [fulfillShopId, setFulfillShopId] = useState("");

  // Google Shop
  const [googleResults, setGoogleResults] = useState<GoogleFlorist[]>([]);
  const [googleShop, setGoogleShop] = useState<GoogleShop>({
    name: "",
    phone: "",
    address: "",
  });
  const [googleSearch, setGoogleSearch] = useState(false);
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

  const [addCard, setAddCard] = useState(false);
  const [cardMessage, setCardMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Products
  const [products, setProducts] = useState([
    {
      name: "Designer's Choice",
      price: "100.00",
      description: "",
      photo: "",
      taxable: true,
      qty: 1,
      file: null as File | null, // Store the actual File object here
    },
  ]);
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
      } catch (err) {
        console.error("Failed to load shop data", err);
      }
    }
    loadShop();
  }, []);

  // Calculate Totals
  useEffect(() => {
    const { deliveryFee } = pricing;
    const { taxPercentage, feeType, feeValue, deliveryTaxed, feeTaxed } =
      sendingShop;

    // 1. Calculate Product Totals
    const { taxableSubtotal, nonTaxableSubtotal } = products.reduce(
      (acc, p) => {
        const price = parseFloat(p.price as string) || 0;
        p.taxable
          ? (acc.taxableSubtotal += price)
          : (acc.nonTaxableSubtotal += price);
        return acc;
      },
      { taxableSubtotal: 0, nonTaxableSubtotal: 0 },
    );

    const productTotal = taxableSubtotal + nonTaxableSubtotal;

    // 2. Calculate the actual Fee Charge (The dollar amount)
    // If feeType is %, it calculates 35% of $111.16 = $38.91
    const feeCharge =
      feeType === "%" ? productTotal * (feeValue / 100) : feeValue;

    // 3. Determine the Taxable Basis
    let taxableBasis = taxableSubtotal;
    if (taxPercentage > 0) {
      if (deliveryTaxed) taxableBasis += deliveryFee;
      if (feeTaxed) taxableBasis += feeCharge;
    }
    const taxAmount = taxableBasis * (taxPercentage / 100);

    // 4. Final Totals
    const finalTotal = productTotal + deliveryFee + feeCharge + taxAmount;
    const fulfillingShopGets = productTotal + deliveryFee;

    // 5. Update State
    setPricing((prev) => ({
      ...prev,
      productsTotal: productTotal,
      // Store the calculated dollar amount separately from the database feeValue
      feeCharge: parseFloat(roundToHundredth(feeCharge)),
      taxAmount: parseFloat(roundToHundredth(taxAmount)),
      customerPays: parseFloat(roundToHundredth(finalTotal)),
      orderTotal: parseFloat(roundToHundredth(finalTotal)),
      fulfillingShopGets: parseFloat(roundToHundredth(fulfillingShopGets)),
    }));
  }, [
    products,
    pricing.deliveryFee,
    sendingShop.taxPercentage,
    sendingShop.feeType,
    sendingShop.feeValue,
    sendingShop.deliveryTaxed,
    sendingShop.feeTaxed,
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

  const handlePriceBlur = (index: number) => {
    const currentPrice = products[index].price;
    const numValue = parseFloat(currentPrice);

    // If the input is empty or invalid, don't format it
    if (isNaN(numValue)) return;

    // Use your existing rounding function
    const roundedValue = roundToHundredth(numValue);

    // Update only the specific product in the array
    const updatedProducts = products.map((product, i) =>
      i === index ? { ...product, price: roundedValue } : product,
    );

    setProducts(updatedProducts);
  };

  const handlePricingBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);

    // If it's not a number (empty string), don't do anything
    if (isNaN(numValue)) return;

    const roundedValue = roundToHundredth(numValue);

    const custPays =
      pricing.deliveryFee + pricing.productsTotal + pricing.taxAmount;
    const newCustPays = roundToHundredth(custPays);
    setPricing({ ...pricing, customerPays: Number(newCustPays) });

    setPricing((prev) => ({
      ...prev,
      [name]: roundedValue,
    }));
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
    setSearching(true);
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

      console.log(data);

      if (!res.ok) throw new Error(data.error || "Search failed");

      setShops(data || []);
      setFindShopSuccess(data?.length > 0);

      if (!data || data.length === 0) {
        toast.error("No BloomDirect shops in that area yet — invite them!");
        setNoShopsInArea(true);
      }

      // Add ZIP demand for future expansion
      // await fetch("/api/zipDemand", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ zip: recipient.zip }),
      // });
    } catch (err) {
      console.error("Error finding shops", err);
      toast.error(
        "Error finding shops. Please try again. If the problem persists, contact GetBloomDirect support.",
      );
    } finally {
      setSearching(false);
    }
  };

  // Send Order
  const sendOrder = async () => {
    try {
      setSendingOrder(true);
      // Validations
      if (!selectedShop && !googleShop) {
        setSendingOrder(false);
        return toast.error("Select a fulfilling shop!");
      }
      if (!logistics.deliveryDate) {
        setSendingOrder(false);
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
        setSendingOrder(false);
        return toast.error("Enter all recipient information!");
      }

      // Upload images to s3 and get the CloudFront URLs
      const cfBase = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

      // Use Promise.all to upload all product images at once (concurrently)
      const updatedProducts = await Promise.all(
        products.map(async (p) => {
          // If there's no file object, return the product as is (or with existing photo string)
          if (!p.file) return { ...p, photo: p.photo || "" };

          // Get signed URL from your existing API
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

          // Upload the actual file to s3
          await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": p.file.type },
            body: p.file,
          });

          // Return the product with the CloudFront URL
          return {
            ...p,
            photo: `${cfBase}/${fileKey}`,
          };
        })
      );

      const payload = {
        fulfillingShopId: fulfillShopId,
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
        pricing: {
          productsTotal: pricing.productsTotal,
          deliveryFee: pricing.deliveryFee,
          taxAmount: pricing.taxAmount,
          customerPays: pricing.customerPays,
          orderTotal: pricing.orderTotal,
          fulfillingShopGets: pricing.fulfillingShopGets,
          feeCharge: pricing.feeCharge,
        },
        products: products.map((p) => ({
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
      };

      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create order");

      toast.success("Order sent successfully!");

      router.push("/dashboard");
    } catch (error) {
      setSendingOrder(false);
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

  // Add Product
  function addProduct() {
    setProducts([
      ...products,
      {
        name: "",
        price: "",
        description: "",
        photo: "",
        taxable: true,
        qty: 1,
        file: null as File | null,
      },
    ]);
  }

  // Select Shop in Network
  function selectShop(state: any, setter: Function) {
    try {
      setter(state);

      if (!state) return;

      loadFulfillingShop(state._id);

      setPricing({
        ...pricing,
        deliveryFee: state.deliveryCharge || 0,
      });

      const newPhoto = state.featuredBouquet?.image
        ? `${cfBase}/${state.featuredBouquet.image}`
        : "";

      setProducts([
        {
          name: state.featuredBouquet?.name || "",
          price: state.featuredBouquet?.price || "",
          description: state.featuredBouquet?.description || "",
          photo: newPhoto || "",
          taxable: true,
          qty: 1,
          file: null,
        },
      ]);
    } catch (error) {
      console.error("Error selecting shop: ", Error);
      toast.error(
        "There was an error when selecting shop, please try again! If it persists, contact GetBloomDirect support.",
      );
    }
  }

  // Helper to extract zip code from addressComponents
  const getZipFromComponents = (components: any[]) => {
    const zipObj = components?.find((c) => c.types.includes("postal_code"));
    return zipObj?.longText || "";
  };

  // Google Search Function
  const handleGoogleSearch = async () => {
    if (!recipient.zip) return alert("Please enter a zip code first");
    setLastZip(recipient.zip);
    setGoogleSearch(true);
    setLoading(true);
    try {
      if (lastZip === recipient.zip) {
        setGoogleSearch(true);
      } else {
        const data = await searchGoogleFlorists(recipient.zip);

        // Custom sorting logic
        const sortedData = [...data].sort((a, b) => {
          const zipA = getZipFromComponents(a.addressComponents);
          const zipB = getZipFromComponents(b.addressComponents);

          const isAMatch = zipA === recipient.zip;
          const isBMatch = zipB === recipient.zip;

          // Sort by Zip Code Match (Matching zip goes to the top)
          if (isAMatch && !isBMatch) return -1;
          if (!isAMatch && isBMatch) return 1;

          // Secondary Sort: Rating (Higher ratings first)
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;
          return ratingB - ratingA;
        });

        setGoogleResults(sortedData);
      }
    } catch (error) {
      setGoogleSearch(false);
      setLoading(false);
      console.error("Search failed:", error);
      alert("Could not fetch florists from Google.");
    } finally {
      setLoading(false);
    }
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

  const chooseGoogleShop = (name: string, phone: any, address: string) => {};

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
                  <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
                    <div
                      className="grid grid-cols-1 gap-4 pt-4 border-4 border-purple-600 rounded-lg overflow-hidden max-w-xl 2xl:max-h-96"
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
                      <div className="px-4 grid gap-x-4 gap-y-1 grid-cols-1 md:grid-cols-3">
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
                      <button
                        onClick={searchShops}
                        disabled={searching}
                        className="px-4 py-2 bg-purple-600 text-white text-2xl font-bold hover:bg-purple-700 transition-all"
                      >
                        {searching ? "Searching..." : "Find Shops"}
                      </button>
                    </div>
                    {/* Didn't find shop in network */}
                    {/* Search Google + screen is greater or equal to 1536px */}
                    {googleSearch && window.innerWidth >= 1536 ? (
                      <div className="gap-4 w-full max-w-2xl hidden 2xl:grid max-h-96 overflow-scroll">
                        {googleResults.map((shop) => (
                          <div
                            key={shop.id}
                            className={
                              (googleShop.name === shop.displayName.text
                                ? "bg-purple-300"
                                : "bg-white") +
                              " p-4 border rounded-xl shadow-sm flex justify-between"
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
                                {shop.formattedAddress || "No Address listed"}
                              </p>
                              {shop.rating && (
                                <div className="text-yellow-500 font-medium">
                                  ★ {shop.rating}{" "}
                                  <span className="text-gray-400 text-sm">
                                    (Google Rating)
                                  </span>
                                </div>
                              )}
                            </div>
                            <div>
                              <button
                                className="rounded-lg px-4 py-1 shadow-lg bg-emerald-600 text-white font-semibold transition-all hover:shadow-none hover:bg-emerald-700"
                                onClick={() => {
                                  setGoogleShop({
                                    ...googleShop,
                                    name: shop.displayName.text,
                                    phone: shop.nationalPhoneNumber,
                                    address: shop.formattedAddress,
                                  });
                                }}
                              >
                                Select
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div></div>
                    )}
                  </div>
                  {/* Found shop in network */}
                  {findShopSuccess && (
                    <div className="text-center sm:text-start">
                      <p className="my-6 text-2xl font-bold text-white">
                        Shops found! Please select below. <br />
                      </p>
                    </div>
                  )}
                  {/* No Shops Found */}
                  {noShopsInArea && (
                    <div className="space-y-4">
                      <p className="text-lg mt-4 text-center sm:text-start md:max-w-lg">
                        GetBloomDirect is expanding quickly. We don't currently
                        have a partner florist this ZIP code - but we'd love to
                        change that!
                      </p>
                      <div className="flex flex-col space-y-4">
                        <div className="grid grid-cols-1 gap-4 w-full sm:max-w-md md:max-w-lg lg:max-w-xl">
                          <div
                            className={
                              (requestFlorist ? "border-4" : "border-none") +
                              " border-purple-600"
                            }
                          >
                            <button
                              onClick={() => {
                                if (requestFlorist) {
                                  setRequestFlorist(false);
                                } else {
                                  setRequestFlorist(true);
                                }
                              }}
                              className={
                                (requestFlorist
                                  ? "rounded-none"
                                  : "rounded-2xl") +
                                " bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 font-bold text-xl shadow-xl w-full transition-all"
                              }
                            >
                              Request a florist in this area
                            </button>
                            {requestFlorist ? (
                              <form className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end my-4 px-2 transition-all">
                                <label className="flex flex-col font-semibold">
                                  From
                                  <input
                                    type="text"
                                    name="shopName"
                                    value={sendingShop.shopName}
                                    readOnly
                                    className="text-lg px-4 py-1 rounded-lg shadow-md"
                                  />
                                </label>
                                <label
                                  htmlFor="to"
                                  className="flex flex-col font-semibold"
                                >
                                  To (Email Address)
                                  <input
                                    type="email"
                                    name="to"
                                    id="to"
                                    value={toEmail}
                                    onChange={(e) => setToEmail(e.target.value)}
                                    className="text-lg px-4 py-1 rounded-lg shadow-md"
                                  />
                                </label>
                                {/* Need to set this up to send email */}
                                <button className="bg-emerald-600 text-white rounded-lg py-1 border-2 border-emerald-600 transition-all hover:bg-emerald-700 hover:border-emerald-700">
                                  Send Request
                                </button>
                              </form>
                            ) : (
                              <div></div>
                            )}
                          </div>
                          {/* Search for florists in zip that aren't part of GetBloomDirect */}
                          <button
                            onClick={handleGoogleSearch}
                            disabled={googleSearch}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-2xl font-bold text-xl shadow-xl w-full transition-all"
                          >
                            Show More Shops Outside Our Network
                          </button>
                        </div>

                        {googleSearch ? (
                          <div className="grid gap-4 mt-8 w-full max-w-2xl 2xl:hidden">
                            <h2 className="text-xl font-semibold -mb-4">
                              Shops pulled from Google Search
                            </h2>
                            <p className="text-gray-600">
                              Shops not part of <b>GetBloomDirect</b> network
                              yet.
                            </p>
                            {googleResults.map((shop) => (
                              <div
                                key={shop.id}
                                className={
                                  (googleShop.name === shop.displayName.text
                                    ? "bg-purple-300"
                                    : "bg-white") +
                                  " p-4 border rounded-xl shadow-sm flex justify-between"
                                }
                              >
                                <div>
                                  <h3 className="font-bold text-lg text-emerald-900">
                                    {shop.displayName.text}
                                  </h3>
                                  <p className="text-gray-600">
                                    {shop.nationalPhoneNumber ||
                                      "No phone listed"}
                                  </p>
                                  <p className="text-gray-600">
                                    {shop.formattedAddress ||
                                      "No Address listed"}
                                  </p>
                                  {shop.rating && (
                                    <div className="text-yellow-500 font-medium">
                                      ★ {shop.rating}{" "}
                                      <span className="text-gray-400 text-sm">
                                        (Google Rating)
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <button
                                    className="rounded-lg px-4 py-1 shadow-lg bg-emerald-600 text-white font-semibold transition-all hover:shadow-none hover:bg-emerald-700"
                                    onClick={() => {
                                      setGoogleShop({
                                        ...googleShop,
                                        name: shop.displayName.text,
                                        phone: shop.nationalPhoneNumber,
                                        address: shop.formattedAddress,
                                      });
                                    }}
                                  >
                                    Select
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div></div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Shop Picker */}
                  {shops.length > 0 && (
                    <div className="max-h-90 overflow-scroll">
                      <div className="space-y-6">
                        {shops.map((shop) => (
                          <label
                            key={shop._id}
                            className={`flex flex-col sm:flex-row gap-4 sm:gap-0 items-center justify-between p-6 border-4 rounded-3xl cursor-pointer transition-all relative ${
                              selectedShop?._id === shop._id
                                ? "border-emerald-600 bg-emerald-50 shadow-2xl text-black"
                                : "border-gray-300 hover:border-purple-700 text-gray-800"
                            }`}
                          >
                            <div
                              className={
                                (shop.verifiedFlorist ? "flex" : "hidden") +
                                " sm:absolute top-2 left-2 gap-1"
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className={
                                  (selectedShop?._id === shop._id
                                    ? "text-purple-600"
                                    : "text-white") + " size-6"
                                }
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
                                />
                              </svg>
                              <p
                                className={
                                  selectedShop?._id === shop._id
                                    ? "text-purple-600"
                                    : "text-white"
                                }
                              >
                                Verified Florist
                              </p>
                            </div>
                            <div className="text-center sm:text-start sm:mt-2">
                              {/* Shop Name & Phone Number */}
                              <div className="flex flex-col sm:flex-row items-center sm:gap-2 text-xl font-bold">
                                <h3 className="sm:flex">
                                  {shop.businessName}{" "}
                                  <span className="hidden ml-2 sm:block">
                                    •
                                  </span>{" "}
                                </h3>
                                <p>{shop.contact?.phone}</p>
                              </div>
                              {/* Address */}
                              <div>
                                <p className="text-sm capitalize">
                                  {shop.address?.street} • {shop.address?.city},{" "}
                                  {shop.address?.state}
                                </p>
                              </div>
                              {/* Delivery Charge & Holiday Surcharge */}
                              <div className="flex flex-col sm:flex-row sm:gap-2 text-lg">
                                <p>
                                  <span className="font-semibold mr-1">
                                    Delivery Charge:
                                  </span>
                                  ${shop.deliveryCharge}
                                </p>
                                <p
                                  className={
                                    shop.holidaySurcharge ? "block" : "hidden"
                                  }
                                >
                                  •
                                  <span className="font-semibold">
                                    Holiday Surharge:
                                  </span>
                                  {shop.holidaySurcharge}
                                </p>
                              </div>
                              {/* Rating & Stats --> ADD LATER */}
                            </div>
                            <input
                              type="radio"
                              name="shop"
                              checked={selectedShop?._id === shop._id}
                              onChange={(e) =>
                                selectShop(shop, setSelectedShop)
                              }
                              className="w-8 h-8 text-emerald-600"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
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
                    <div
                      className={`
                        ${orderPageOption === "products" ? "block" : "hidden xl:block"} 
                      order-page-option
                      `}
                    >
                      <h2 className="order-header">Products</h2>
                      {products.map((product, index) => (
                        <div
                          key={index}
                          className="border border-gray-100 rounded-2xl px-4 pb-4 shadow-sm mb-4"
                        >
                          <div className="flex items-center justify-between gap-4">
                            {/* Photo Preview: Only shows if a photo exists */}
                            <div className="flex items-center gap-3">
                              <h3 className="font-bold text-gray-700">
                                Product #{index + 1}
                              </h3>
                              {/* Taxable */}
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    const newProducts = [...products];
                                    if (newProducts[index].taxable === true) {
                                      newProducts[index].taxable = false;
                                    } else {
                                      newProducts[index].taxable = true;
                                    }
                                    setProducts(newProducts);
                                  }}
                                >
                                  {products[index].taxable === true ? (
                                    <svg
                                      width="30"
                                      height="20"
                                      viewBox="0 0 50 30"
                                      fill="none"
                                      xmlns="http://www.w3.org"
                                    >
                                      <rect
                                        width="50"
                                        height="30"
                                        rx="15"
                                        fill="#4ADE80"
                                      />
                                      <circle
                                        cx="35"
                                        cy="15"
                                        r="11"
                                        fill="white"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      width="30"
                                      height="20"
                                      viewBox="0 0 50 30"
                                      fill="none"
                                      xmlns="http://www.w3.org"
                                    >
                                      <rect
                                        width="50"
                                        height="30"
                                        rx="15"
                                        fill="#F87171"
                                      />

                                      <circle
                                        cx="15"
                                        cy="15"
                                        r="11"
                                        fill="white"
                                      />
                                    </svg>
                                  )}
                                </button>
                                <label>Taxable</label>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Add Photo */}
                              <ToolTip text="Add Product Photo">
                                <label
                                  htmlFor={`photo-upload-${index}`}
                                  className="cursor-pointer p-2 text-purple-600 rounded-xl transition"
                                >
                                  <input
                                    type="file"
                                    accept="image/*"
                                    id={`photo-upload-${index}`}
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        // Create a temporary local URL for the preview
                                        const localPreviewUrl =
                                          URL.createObjectURL(file);

                                        const newProducts = [...products];
                                        newProducts[index].photo =
                                          localPreviewUrl;
                                        // Store the actual file object somewhere so you can upload it later
                                        newProducts[index].file = file;

                                        setProducts(newProducts);
                                      }
                                    }}
                                  />
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="w-6 h-6"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375 0 1 1-.75 0 .375 .375 0 0 1 .75 0Z"
                                    />
                                  </svg>
                                </label>
                              </ToolTip>
                            </div>
                          </div>

                          {/* Text Inputs */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Product Name */}
                            <div>
                              <label className="order-input-label">
                                Product Name
                              </label>
                              <input
                                placeholder="Product Name"
                                value={product.name}
                                onChange={(e) => {
                                  const newProducts = [...products];
                                  newProducts[index].name = e.target.value;
                                  setProducts(newProducts);
                                }}
                                className="order-input"
                              />
                            </div>
                            {/* Price */}
                            <div>
                              <label className="order-input-label">Price</label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="$0.00"
                                value={product.price}
                                onChange={(e) => {
                                  const newProducts = [...products];
                                  newProducts[index].price = e.target.value;
                                  setProducts(newProducts);
                                }}
                                onBlur={() => handlePriceBlur(index)}
                                className="order-input"
                              />
                            </div>
                            {/* Description */}
                            <div>
                              <label className="order-input-label">
                                Description
                              </label>
                              <textarea
                                placeholder="Description"
                                value={product.description}
                                onChange={(e) => {
                                  const newProducts = [...products];
                                  newProducts[index].description =
                                    e.target.value;
                                  setProducts(newProducts);
                                }}
                                rows={2}
                                className="order-input"
                              />
                            </div>
                            <div className="flex justify-between">
                              {product.photo && (
                                <div className="relative group self-end mb-1">
                                  <img
                                    src={product.photo}
                                    alt={product.name}
                                    className="w-24 h-24 p-1 rounded-lg object-cover border border-purple-200 cursor-zoom-in hover:opacity-80 transition"
                                    onClick={() =>
                                      setZoomedImage(product.photo)
                                    }
                                  />
                                  {/* Optional: Clear photo button */}
                                  <button
                                    onClick={() => {
                                      const newProducts = [...products];
                                      newProducts[index].photo = "";
                                      setProducts(newProducts);
                                    }}
                                    className="absolute -top-2 -right-2 bg-white rounded-full shadow-md text-red-500 hover:text-red-700 p-0.5 opacity-0 group-hover:opacity-100 transition"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={2}
                                      stroke="currentColor"
                                      className="w-4 h-4"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              )}
                              {/* Remove Product */}
                              <button
                                disabled={products.length <= 1} // Logic check
                                onClick={() => {
                                  const newProducts = products.filter(
                                    (_, i) => i !== index,
                                  );
                                  setProducts(newProducts);
                                }}
                                className="p-2 text-red-500"
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

                              {/* THIS IS FOR QTY --> ADD LATER */}
                              {/* <div className="rounded-full border shadow-md flex justify-evenly items-center gap-2 px-2">
                                <p className="font-semibold text-xl hidden">
                                  {product.qty}
                                </p>
                                <button
                                  className="p-2 text-emerald-600 hidden"
                                  onChange={() => {}}
                                >
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
                                      d="M12 4.5v15m7.5-7.5h-15"
                                    />
                                  </svg>
                                </button>
                              </div> */}
                            </div>
                          </div>
                        </div>
                      ))}
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
                      <button
                        onClick={addProduct}
                        className="bg-purple-600 text-white py-2 px-4 rounded-xl hover:bg-purple-700 transition-colors"
                      >
                        Add Product
                      </button>
                    </div>
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
                  {/* Mobile */}
                  <div className="flex flex-col gap-4">
                    {/* Send Button */}
                    <div className="border-b pb-4">
                      <button
                        onClick={sendOrder}
                        disabled={
                          !selectedShop ||
                          !logistics.deliveryDate ||
                          !googleShop ||
                          sendingOrder
                        }
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white text-xl px-4 py-2 rounded-full w-full transition-all"
                        title="Send Order"
                      >
                        Send Order & Keep ${pricing.feeCharge} →
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
                        {/* Originating Fee */}
                        <div>
                          <div className="relative">
                            <label className="block text-xl opacity-90">
                              Your profit (fee)
                            </label>
                            <div
                              className={
                                (shops.length < 1 ? "block" : "block") +
                                " absolute top-1 right-2"
                              }
                            >
                              {sendingShop.feeType === "flat" && (
                                <button
                                  onClick={() => {
                                    if (editOriginatingFee) {
                                      setEditOriginatingFee(false);
                                    } else {
                                      setEditOriginatingFee(true);
                                    }
                                  }}
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
                              )}
                            </div>
                          </div>
                          <input
                            type="number"
                            value={pricing.feeCharge}
                            readOnly={!editOriginatingFee}
                            onChange={(e) =>
                              setPricing({
                                ...pricing,
                                feeCharge: Number(e.target.value),
                              })
                            }
                            className={
                              (editOriginatingFee
                                ? "border-2 border-emerald-500"
                                : "border-none") +
                              " w-full mt-2 px-6 py-4 text-3xl font-bold text-center bg-white/20 rounded-2xl text-yellow-300"
                            }
                            placeholder="25"
                          />
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
                      {products.map((product, index) => (
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
                            disabled={products.length <= 1} // Logic check
                            onClick={() => {
                              const newProducts = products.filter(
                                (_, i) => i !== index,
                              );
                              setProducts(newProducts);
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

                  {/* Desktop */}
                  <div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
