"use client";

import { useBloomWebsiteCart } from "@/components/websites/storefront/BloomWebsiteCartProvider";
import BloomWebsiteCheckoutSteps from "@/components/websites/storefront/BloomWebsiteCheckoutSteps";
import BloomWebsiteSameDayCountdown from "@/components/websites/storefront/BloomWebsiteSameDayCountdown";
import {
  type BloomWebsiteValidatedDelivery,
  type BloomWebsiteValidatedPickup,
  useBloomWebsiteCheckout,
} from "@/components/websites/storefront/BloomWebsiteCheckoutProvider";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Phone,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type Props = { previewSlug: string; basePath?: string };
type ApiFailure = { eligible?: false; message?: string; error?: string };
type DeliverySuccess = {
  eligible: true;
  address: { formattedAddress: string; address1: string; address2: string; city: string; state: string; zip: string; country: string; lat: number; lng: number; placeId: string };
  delivery: { requestedDate: string; sameDay: boolean; distanceMiles: number | null; feeCents: number };
  cart: { subtotalCents: number };
  totals: { totalBeforeTaxCents: number };
};
type PickupInfo = {
  enabled: boolean;
  policy: { allowsSameDay: boolean; preparationMinutes: number; instructions: string };
  location: { businessName: string; address1: string; city: string; state: string; zip: string; country: string; formattedAddress: string };
};
type PickupSuccess = {
  eligible: true;
  pickup: { requestedDate: string; sameDay: boolean; preparationMinutes: number; instructions: string };
  location: PickupInfo["location"];
  cart: { subtotalCents: number };
  totals: { totalBeforeTaxCents: number };
};

const inputClassName = "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-4 focus:ring-gray-100";
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const dateLabel = (value: string) => {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(date);
};
const browserToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export default function BloomWebsiteDeliveryCheckout({
  previewSlug,
  basePath,
}: Props) {
  const storefrontBasePath =
    basePath ?? `/websites/preview/${encodeURIComponent(previewSlug)}`;

  const router = useRouter();
  const { items, itemCount, openCart } = useBloomWebsiteCart();
  const checkout = useBloomWebsiteCheckout();
  const {
    fulfillmentType, recipient, deliveryAddress, requestedDate, pickupRequestedDate,
    deliveryInstructions, validatedDelivery, validatedPickup,
    setFulfillmentType, setRecipient, setDeliveryAddress, setRequestedDate,
    setPickupRequestedDate, setDeliveryInstructions, setValidatedDelivery, setValidatedPickup,
  } = checkout;
  const [pickupInfo, setPickupInfo] = useState<PickupInfo | null>(null);
  const [pickupInfoLoading, setPickupInfoLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState("");
  const minimumDate = useMemo(browserToday, []);
  const messageHref = `${storefrontBasePath}/checkout/message`;

  useEffect(() => {
    let active = true;
    async function loadPickup() {
      try {
        const response = await fetch(`/api/websites/storefront/${encodeURIComponent(previewSlug)}/pickup`, { cache: "no-store" });
        const data = (await response.json()) as PickupInfo & { error?: string };
        if (active && response.ok) setPickupInfo(data);
      } catch (error) {
        console.error("BloomWebsite pickup availability failed:", error);
      } finally {
        if (active) setPickupInfoLoading(false);
      }
    }
    void loadPickup();
    return () => { active = false; };
  }, [previewSlug]);

  useEffect(() => {
    if (!pickupInfoLoading && pickupInfo?.enabled !== true && fulfillmentType === "pickup") {
      setFulfillmentType("delivery");
    }
  }, [fulfillmentType, pickupInfo, pickupInfoLoading, setFulfillmentType]);

  const cartPayload = items.map((item) => ({
    productId: item.productId,
    tier: item.tier.label,
    addonIds: item.addons.map((addon) => addon.id),
    quantity: item.quantity,
  }));

  function chooseFulfillment(type: "delivery" | "pickup") {
    setValidationError("");
    setFulfillmentType(type);
  }

  async function validateDelivery() {
    const normalizedRecipient = { firstName: recipient.firstName.trim(), lastName: recipient.lastName.trim(), phone: recipient.phone.trim() };
    const normalizedAddress = {
      address1: deliveryAddress.address1.trim(), address2: deliveryAddress.address2.trim(), city: deliveryAddress.city.trim(),
      state: deliveryAddress.state.trim().toUpperCase(), zip: deliveryAddress.zip.trim(),
    };
    if (!normalizedRecipient.firstName || !normalizedRecipient.lastName) throw new Error("Please enter the recipient's first and last name.");
    if (!normalizedRecipient.phone) throw new Error("Please enter a phone number for the delivery recipient.");
    if (!normalizedAddress.address1 || !normalizedAddress.city || !normalizedAddress.state || !normalizedAddress.zip) throw new Error("Please enter the complete delivery address.");
    if (!requestedDate) throw new Error("Please choose a delivery date.");
    setRecipient(normalizedRecipient);
    setDeliveryAddress(normalizedAddress);
    const response = await fetch(`/api/websites/storefront/${encodeURIComponent(previewSlug)}/delivery`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cartPayload, address: normalizedAddress, requestedDate }),
    });
    const data = (await response.json()) as DeliverySuccess | ApiFailure;
    if (!response.ok || data.eligible !== true) throw new Error((data as ApiFailure).message || (data as ApiFailure).error || "We couldn't verify delivery for that address and date.");
    const success = data as DeliverySuccess;
    setDeliveryAddress({ address1: success.address.address1, address2: success.address.address2, city: success.address.city, state: success.address.state, zip: success.address.zip });
    const validation: BloomWebsiteValidatedDelivery = {
      address: success.address, requestedDate: success.delivery.requestedDate, sameDay: success.delivery.sameDay,
      distanceMiles: success.delivery.distanceMiles, feeCents: success.delivery.feeCents,
      cartSubtotalCents: success.cart.subtotalCents, totalBeforeTaxCents: success.totals.totalBeforeTaxCents,
    };
    setValidatedDelivery(validation);
  }

  async function validatePickup() {
    if (!pickupRequestedDate) throw new Error("Please choose a pickup date.");
    const response = await fetch(`/api/websites/storefront/${encodeURIComponent(previewSlug)}/pickup`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cartPayload, requestedDate: pickupRequestedDate }),
    });
    const data = (await response.json()) as PickupSuccess | ApiFailure;
    if (!response.ok || data.eligible !== true) throw new Error((data as ApiFailure).message || (data as ApiFailure).error || "We couldn't verify pickup for that date.");
    const success = data as PickupSuccess;
    const validation: BloomWebsiteValidatedPickup = {
      requestedDate: success.pickup.requestedDate, sameDay: success.pickup.sameDay,
      cartSubtotalCents: success.cart.subtotalCents, totalBeforeTaxCents: success.totals.totalBeforeTaxCents,
      preparationMinutes: success.pickup.preparationMinutes, instructions: success.pickup.instructions, location: success.location,
    };
    setValidatedPickup(validation);
  }

  async function handleValidate() {
    setValidationError("");
    if (items.length === 0) return setValidationError("Your cart is empty. Add an arrangement before continuing.");
    setIsValidating(true);
    try {
      if (fulfillmentType === "pickup") await validatePickup(); else await validateDelivery();
      router.push(messageHref);
    } catch (error) {
      if (fulfillmentType === "pickup") setValidatedPickup(null); else setValidatedDelivery(null);
      setValidationError(error instanceof Error ? error.message : "We couldn't validate fulfillment right now. Please try again.");
    } finally { setIsValidating(false); }
  }

  const activeValidation = fulfillmentType === "pickup" ? validatedPickup : validatedDelivery;

  if (items.length === 0) {
    return <main className="min-h-screen bg-gray-50 px-5 py-12 sm:px-8"><div className="mx-auto max-w-xl rounded-[2rem] border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-12"><ShoppingBag size={30} className="mx-auto text-gray-300"/><h1 className="mt-6 text-2xl font-black text-gray-950">Your cart is empty</h1><p className="mt-3 text-sm text-gray-500">Choose an arrangement before starting checkout.</p><Link href={storefrontBasePath || "/"} className="mt-7 inline-flex rounded-full px-6 py-3.5 text-sm font-black" style={{backgroundColor:"var(--bloom-primary)",color:"var(--bloom-primary-foreground)"}}>Return to Shop</Link></div></main>;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-100 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-8"><Link href={storefrontBasePath || "/"} className="inline-flex items-center gap-2 text-sm font-black text-gray-700"><ArrowLeft size={17}/>Back to Shop</Link><button type="button" onClick={openCart} className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-black"><ShoppingBag size={17}/>Cart ({itemCount})</button></div></div>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
        <BloomWebsiteCheckoutSteps currentStep="delivery" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <section className="space-y-6">
            <div><p className="text-sm font-black uppercase tracking-[0.16em]" style={{color:"var(--bloom-accent)"}}>Fulfillment</p><h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">How would you like to receive your flowers?</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">Choose delivery to a recipient or pickup directly from the florist.</p></div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => chooseFulfillment("delivery")} className={`rounded-[1.5rem] border p-5 text-left transition ${fulfillmentType === "delivery" ? "shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`} style={fulfillmentType === "delivery" ? {borderColor:"var(--bloom-primary)",backgroundColor:"color-mix(in srgb, var(--bloom-primary) 5%, white)"}:undefined}><div className="flex items-center gap-3"><Truck size={22} style={{color:"var(--bloom-primary)"}}/><div><p className="font-black text-gray-950">Delivery</p><p className="mt-1 text-sm text-gray-500">Send flowers to a recipient.</p></div></div></button>
              <button type="button" disabled={pickupInfoLoading || pickupInfo?.enabled !== true} onClick={() => chooseFulfillment("pickup")} className={`rounded-[1.5rem] border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${fulfillmentType === "pickup" ? "shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}`} style={fulfillmentType === "pickup" ? {borderColor:"var(--bloom-primary)",backgroundColor:"color-mix(in srgb, var(--bloom-primary) 5%, white)"}:undefined}><div className="flex items-center gap-3"><Store size={22} style={{color:"var(--bloom-primary)"}}/><div><p className="font-black text-gray-950">Pickup</p><p className="mt-1 text-sm text-gray-500">{pickupInfoLoading ? "Checking availability…" : pickupInfo?.enabled ? "Pick up at the flower shop." : "Pickup is not currently available."}</p></div></div></button>
            </div>

            {fulfillmentType === "delivery" ? <>
              <div><BloomWebsiteSameDayCountdown previewSlug={previewSlug}/></div>
              <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon={<UserRound size={20}/>} title="Recipient" text="Who should the florist ask for at the delivery location?"/><div className="mt-6 grid gap-5 sm:grid-cols-2"><Field label="First Name" value={recipient.firstName} onChange={(value)=>setRecipient({...recipient,firstName:value})}/><Field label="Last Name" value={recipient.lastName} onChange={(value)=>setRecipient({...recipient,lastName:value})}/><Field label="Phone" value={recipient.phone} onChange={(value)=>setRecipient({...recipient,phone:value})} className="sm:col-span-2" icon={<Phone size={15}/>} required/></div></div>
              <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon={<MapPin size={20}/>} title="Delivery Address" text="We'll securely verify this address against the florist's delivery area."/><div className="mt-6 grid gap-5 sm:grid-cols-2"><Field label="Street Address" value={deliveryAddress.address1} onChange={(value)=>setDeliveryAddress({...deliveryAddress,address1:value})} className="sm:col-span-2"/><Field label="Apartment / Suite" value={deliveryAddress.address2} onChange={(value)=>setDeliveryAddress({...deliveryAddress,address2:value})} className="sm:col-span-2" optional/><Field label="City" value={deliveryAddress.city} onChange={(value)=>setDeliveryAddress({...deliveryAddress,city:value})}/><Field label="State" value={deliveryAddress.state} onChange={(value)=>setDeliveryAddress({...deliveryAddress,state:value})}/><Field label="ZIP Code" value={deliveryAddress.zip} onChange={(value)=>setDeliveryAddress({...deliveryAddress,zip:value})}/></div></div>
              <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon={<CalendarDays size={20}/>} title="Delivery Date" text="Choose when you would like the arrangement delivered."/><input type="date" min={minimumDate} value={requestedDate} onChange={(e)=>setRequestedDate(e.target.value)} className={inputClassName}/><label className="mt-5 block text-sm font-black text-gray-800">Delivery Instructions <span className="font-semibold text-gray-400">Optional</span><textarea value={deliveryInstructions} onChange={(e)=>setDeliveryInstructions(e.target.value)} rows={3} maxLength={300} className={inputClassName} placeholder="Gate code, front desk, special directions…"/></label></div>
            </> : <>
              <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-7"><SectionTitle icon={<CalendarDays size={20}/>} title="Pickup Date" text="Choose the day you would like to pick up your order."/><input type="date" min={minimumDate} value={pickupRequestedDate} onChange={(e)=>setPickupRequestedDate(e.target.value)} className={inputClassName}/>{pickupInfo && <div className="mt-6 grid gap-4 sm:grid-cols-2"><Info icon={<MapPin size={18}/>} title={pickupInfo.location.businessName || "Pickup Location"} text={pickupInfo.location.formattedAddress || "Pickup address unavailable"}/><Info icon={<Clock3 size={18}/>} title="Preparation" text={`Allow about ${pickupInfo.policy.preparationMinutes} minutes for preparation after your order is confirmed.`}/></div>}{pickupInfo?.policy.instructions && <div className="mt-5 rounded-2xl bg-gray-50 p-4"><p className="text-xs font-black uppercase tracking-[0.12em] text-gray-400">Pickup Instructions</p><p className="mt-2 text-sm leading-6 text-gray-600">{pickupInfo.policy.instructions}</p></div>}</div>
            </>}

            {validationError && <div className="flex gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertCircle size={19} className="shrink-0"/><span>{validationError}</span></div>}
            <button type="button" onClick={handleValidate} disabled={isValidating} className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60" style={{backgroundColor:"var(--bloom-primary)",color:"var(--bloom-primary-foreground)"}}>{isValidating ? <><Loader2 size={18} className="animate-spin"/>Checking {fulfillmentType === "pickup" ? "Pickup" : "Delivery"}...</> : <>Continue to Card Message</>}</button>
          </section>

          <aside className="lg:sticky lg:top-6"><div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm"><h2 className="text-lg font-black text-gray-950">Fulfillment Summary</h2>{activeValidation ? <div className="mt-5"><div className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4"><CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-600"/><div><p className="text-sm font-black text-gray-950">{fulfillmentType === "pickup" ? "Pickup verified" : "Delivery verified"}</p><p className="mt-1 text-sm leading-6 text-gray-500">{fulfillmentType === "pickup" ? validatedPickup?.location.formattedAddress : validatedDelivery?.address.formattedAddress}</p><p className="mt-1 text-sm font-bold text-gray-700">{dateLabel(activeValidation.requestedDate)}</p></div></div><div className="mt-5 space-y-3 text-sm"><Row label="Subtotal" value={money(activeValidation.cartSubtotalCents)}/><Row label="Delivery" value={fulfillmentType === "pickup" ? "$0.00" : money(validatedDelivery?.feeCents || 0)}/><div className="border-t border-gray-100 pt-3"><Row label="Total before tax" value={money(activeValidation.totalBeforeTaxCents)} strong/></div></div></div> : <p className="mt-3 text-sm leading-6 text-gray-500">Choose a fulfillment method and verify it to continue.</p>}</div></aside>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({icon,title,text}:{icon:ReactNode;title:string;text:string}) { return <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{backgroundColor:"color-mix(in srgb, var(--bloom-primary) 10%, white)",color:"var(--bloom-primary)"}}>{icon}</div><div><h2 className="text-lg font-black text-gray-950">{title}</h2><p className="mt-1 text-sm leading-6 text-gray-500">{text}</p></div></div>; }
function Field({label,value,onChange,className="",optional=false,required=false,icon}:{label:string;value:string;onChange:(value:string)=>void;className?:string;optional?:boolean;required?:boolean;icon?:ReactNode}) { return <label className={`text-sm font-black text-gray-800 ${className}`}><span className="flex items-center gap-2">{icon}{label}{optional && <span className="font-semibold text-gray-400">Optional</span>}{required && <span className="font-semibold text-red-500">Required</span>}</span><input type="text" value={value} onChange={(e)=>onChange(e.target.value)} className={inputClassName}/></label>; }
function Info({icon,title,text}:{icon:ReactNode;title:string;text:string}) { return <div className="flex gap-3 rounded-2xl border border-gray-100 p-4"><div style={{color:"var(--bloom-primary)"}}>{icon}</div><div><p className="text-sm font-black text-gray-950">{title}</p><p className="mt-1 text-sm leading-6 text-gray-500">{text}</p></div></div>; }
function Row({label,value,strong=false}:{label:string;value:string;strong?:boolean}) { return <div className="flex items-center justify-between gap-4"><span className={strong?"font-black text-gray-950":"font-semibold text-gray-500"}>{label}</span><span className="font-black text-gray-950">{value}</span></div>; }
