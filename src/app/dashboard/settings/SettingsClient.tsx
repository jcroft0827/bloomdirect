"use client";

// #region Interfaces

interface PaymentState {
  venmoHandle: string;
  cashAppTag: string;
  zellePhoneOrEmail: string;
  paypalEmail: string;
  defaultPaymentMethod: string;
}

interface ContactState {
  phone: string;
  whatsapp: string;
  emailSecondary: string;
  website: string;
}

interface AddressState {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  timezone: string;
}

interface StripeState {
  status: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date;
}

interface ZipZone {
  name: string;
  zip: string;
  fee: number | string;
}

interface DistanceZone {
  min: number;
  max: number;
  fee: number | string;
}

interface DeliveryState {
  method: "zip" | "distance" | "";
  fallbackFee: number;
  maxRadius: number;
  minProductTotal: number;
  sameDayCutoff: string;
  noMoreOrdersToday: boolean;
  allowSameDay: boolean;
  zipZones: ZipZone[];
  distanceZones: DistanceZone[];
}

interface FinancialsState {
  taxPercentage: number;
  deliveryTaxed: boolean;
  feeTaxed: boolean;
  feeType: string;
  feeValue: number;
}

interface SocialsState {
  instagram: string;
  facebook: string;
  pinterest: string;
  tiktok: string;
}

interface BrandingState {
  logo: string;
  bannerImage: string;
  bio: string;
  primaryColor: string;
  socialLinks: SocialsState;
}

interface FeaturedBouquetState {
  name: string;
  price: number;
  description: string;
  image: string;
}

interface Shop {
  _id: string;
  businessName: string;
  slug: string;
  securityCode: string;
  isVerified: boolean;
  verifiedFlorist: boolean;
  isPublic: boolean;
  isPro: boolean;
  address: AddressState;
  contact: ContactState;
  paymentMethods: PaymentState;
  stripe: StripeState;
  delivery: DeliveryState;
  financials: FinancialsState;
  branding: BrandingState;
  featuredBouquet: FeaturedBouquetState;
}

// #endregion

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useRef } from "react";
import { signOut } from "next-auth/react";
import { set } from "mongoose";
import BloomSpinner from "@/components/BloomSpinner";
import { sign } from "crypto";

// export default function SettingsClient({ initialShop }: { initialShop: any }) {
type SettingsClientProps = {
  initialShop: any;
};

const COUNTRIES = ["US", "CA"];

export default function SettingsClient({ initialShop }: SettingsClientProps) {

  type ZoneError = {
    name?: string; // For Zip
    zip?: string; // For Zip
    min?: string; // For Distance
    max?: string; // For Distance
    overlap?: string; // For Distance
    fields?: string; // For Both
    gap?: string;
  };

  // #region States

  const [zoneErrors, setZoneErrors] = useState<Record<number, ZoneError>>({});

  const [shop, setShop] = useState<Shop>({
    _id: "",
    businessName: "",
    slug: "",
    securityCode: "",
    isVerified: false,
    verifiedFlorist: false,
    isPublic: false,
    isPro: false,
    contact: {
      phone: "",
      whatsapp: "",
      emailSecondary: "",
      website: "",
    },
    address: {
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      timezone: "",
    },
    paymentMethods: {
      venmoHandle: "",
      cashAppTag: "",
      zellePhoneOrEmail: "",
      paypalEmail: "",
      defaultPaymentMethod: "",
    },
    stripe: {
      status: "",
      cancelAtPeriodEnd: false,
      trialEndsAt: new Date(),
    },
    delivery: {
      method: "zip",
      fallbackFee: 0,
      maxRadius: 0,
      minProductTotal: 0,
      sameDayCutoff: "14:00",
      noMoreOrdersToday: false,
      allowSameDay: true,
      zipZones: [],
      distanceZones: [],
    },
    financials: {
      taxPercentage: 0.0,
      deliveryTaxed: true,
      feeTaxed: true,
      feeType: "flat",
      feeValue: 0.0,
    },
    branding: {
      logo: "",
      bannerImage: "",
      bio: "",
      primaryColor: "#000000",
      socialLinks: {
        instagram: "",
        facebook: "",
        pinterest: "",
        tiktok: "",
      },
    },
    featuredBouquet: {
      name: "",
      price: 0.0,
      description: "",
      image: "",
    },
  });
  const [loading, setLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [passwordUpdate, setPasswordUpdate] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");

  // Socials
  const [showFB, setShowFB] = useState(false);
  const [showInsta, setShowInsta] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showTik, setShowTik] = useState(false);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bouquetInputRef = useRef<HTMLInputElement | null>(null);

  const [securityCodeInfo, setSecurityCodeInfo] = useState(false);

  // Edit Data States
  const [backupShop, setBackupShop] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionNames: Record<string, string> = {
    paymentMethods: "Payment Methods",
    shopInfo: "Shop Info",
    delivery: "Delivery Settings",
    financials: "Taxes & Fees",
    branding: "Public Profile",
    featuredBouquet: "Featured Bouquet",
    securityCode: "Security Code",
  };

  const [isSaving, setIsSaving] = useState<string | null>(null);

  const [isUpdatingPw, setIsUpdatingPw] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [uploadingImg, setUploadingImg] = useState(false);

  // #endregion

  // #region useEffects
  
  useEffect(() => {
    async function fetchShop() {
      try {
        const res = await fetch("/api/shops/me"); // Return current shop
        if (res.ok) {
          const data = await res.json();
          setShop(data.shop);
        } else {
          toast.error("Failed to load shop settings");
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load shop settings");
      } finally {
        setLoading(false);
      }
    }
    fetchShop();
  }, []);

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  // #endregion

  if (loading || !shop) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center">
        <BloomSpinner />
      </div>
    );
  }

  // #region Functions

  // Save Data
  const handleSave = async (sectionKey: string) => {
    if (!shop) return;

    setIsSaving(sectionKey);

    try {
      let payload: any;

      if (sectionKey === "shopInfo") {
        // Manually bundle the fields that the 'shopInfo' case in the API needs
        payload = {
          businessName: shop.businessName,
          slug: shop.slug,
          contact: shop.contact, // includes phone, whatsapp, etc.
          address: shop.address, // includes street, city, state, zip, etc.
        };
      } else if (sectionKey === "paymentMethods") {
        payload = {
          paymentMethods: shop.paymentMethods,
        };
      } else if (sectionKey === "delivery") {
        payload = shop.delivery;
      } else if (sectionKey === "financials") {
        payload = {
          financials: shop.financials,
        };
      } else if (sectionKey === "branding") {
        payload = {
          ...shop.branding,
          socialLinks: shop.branding.socialLinks || {},
        };
      } else if (sectionKey === "featuredBouquet") {
        payload = {
          featuredBouquet: shop.featuredBouquet,
        };
      } else if (sectionKey === "securityCode") {
        payload = {
          securityCode: shop.securityCode,
        };
      } else if (sectionKey === "noMoreOrdersToday") {
        payload = {
          noMoreOrdersToday: !shop.delivery.noMoreOrdersToday,
        };

        const res = await fetch("/api/shops/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "delivery",
            data: payload,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setShop(data.shop);
          toast.success("Settings saved successfully!");
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to save settings");
        }
        return;
      }

      const res = await fetch("/api/shops/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: sectionKey,
          data: payload,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShop(data.shop);
        toast.success("Settings saved successfully!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save settings");
      }

      // Success! Turn off edit mode
      setActiveSection(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(null);
    }
  };

  // Update Password
  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsUpdatingPw(true); // Start loading indicator

    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        toast.success("Password updated. Logging out...");
        setShowPasswordForm(false);
        setTimeout(() => signOut({ callbackUrl: "/login" }), 1500);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update password");
      }
    } catch (error) {
      toast.error("A network error occurred");
    } finally {
      setIsUpdatingPw(false);
    }
  };

  // Edit Click
  const handleEditClick = (sectionKey: string) => {
    if (activeSection && activeSection !== sectionKey) {
      toast.error(`Finish editing ${sectionNames[activeSection]} first!`, {
        icon: "⚠️",
        style: { borderRadius: "10px", background: "#333", color: "#fff" },
      });
      return;
    }
    // Take a full snapshot of the entire shop object
    setBackupShop(JSON.parse(JSON.stringify(shop)));
    setActiveSection(sectionKey);
  };

  // Cancel Edit
  const handleEditCancel = () => {
    if (backupShop) {
      // Restore the entire shop object exactly as it was
      setShop(backupShop);
    }
    // Close everything
    setActiveSection(null);
    setBackupShop(null);
  };

  // Upload Logo
  const handleLogoUpload = async (file: File) => {
    try {
      console.log("Starting upload...");
      setUploadingImg(true);

      // 1️⃣ Request signed upload URL from backend
      const uploadRes = await fetch("/api/s3/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to get upload URL");
        setUploadingImg(false);
      }

      const { uploadUrl, fileKey } = await uploadRes.json();

      // 2️⃣ Upload the file directly to S3
      const s3Upload = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!s3Upload.ok) {
        throw new Error("Failed to upload file to S3");
        setUploadingImg(false);
      }

      console.log("Uploaded to S3");

      // 4️⃣ Save fileKey to database
      await fetch("/api/shops/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: fileKey }),
      });

      const cfBase = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
      const cloudFrontUrl = `${cfBase}/${fileKey}`;

      // 6️⃣ Update UI with signed URL
      setShop((prev) => ({
        ...prev,
        branding: { ...prev.branding, logo: cloudFrontUrl },
      }));
    } catch (err) {
      console.error("Logo upload error:", err);
      setUploadingImg(false);
    } finally {
      setUploadingImg(false);
    }
  };

  // Upload Featured Bouquet
  const handleBouquetUpload = async (file: File) => {
    try {
      console.log("Starting upload...");
      setUploadingImg(true);

      // 1️⃣ Request signed upload URL from backend
      const uploadRes = await fetch("/api/s3/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to get upload URL");
        setUploadingImg(false);
      }

      const { uploadUrl, fileKey } = await uploadRes.json();

      // 2️⃣ Upload the file directly to S3
      const s3Upload = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!s3Upload.ok) {
        throw new Error("Failed to upload file to S3");
        setUploadingImg(false);
      }

      console.log("Uploaded to S3");

      // 4️⃣ Save fileKey to database
      await fetch("/api/shops/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: fileKey }),
      });

      const cfBase = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
      const cloudFrontUrl = `${cfBase}/${fileKey}`;

      // 6️⃣ Update UI with signed URL
      setShop((prev) => ({
        ...prev,
        featuredBouquet: { ...prev.featuredBouquet, image: cloudFrontUrl },
      }));
    } catch (err) {
      console.error("Logo upload error:", err);
      setUploadingImg(false);
    } finally {
      setUploadingImg(false);
    }
  };

  // Format Phone Number
  const formatDynamicPhone = (value: string) => {
    // 1. Strip everything except numbers
    const digits = value.replace(/\D/g, "").slice(0, 10);

    // 2. No formatting if less than 7 digits
    if (digits.length < 7) {
      return digits;
    }

    // 3. Format 888-8888 (7 to 9 digits)
    if (digits.length < 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }

    // 4. Format 888-888-8888 (exactly 10 digits)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  // Format Featured Bouquet Price
  const handlePriceBlur = () => {
    // 1. Get the value (TypeScript knows this is a number)
    const rawPrice = shop.featuredBouquet.price;
    console.log(rawPrice);

    // 2. Validation: check if it exists
    if (rawPrice === undefined || rawPrice === null) return;

    // 3. Round it (your helper returns a string like "10.00")
    const rounded = Math.round(rawPrice * 100) / 100;

    const newRounded = Number(rounded).toFixed(2);

    // 4. Update State (convert back to number for your interface)
    setShop((prev) => ({
      ...prev,
      featuredBouquet: {
        ...prev.featuredBouquet,
        price: Number(newRounded), // Convert back to number
      },
    }));
  };

  // Handle Checkbox Changes
  const handleCBChange = (e: any) => {
    const { name, checked } = e.target;

    const { id } = e.target.id;

    if (e.target.id) {
      // Update Delivery Checkboxes
      setShop((prev) => ({
        ...prev,
        delivery: { ...prev.delivery, [name]: checked },
      }));
    } else {
      // Update Financials Checkboxes
      setShop((prev) => ({
        ...prev,
        financials: { ...prev.financials, [name]: checked },
      }));
    }
  };

  // Update Payment Methods
  const updatePaymentMethods = (field: keyof PaymentState, value: string) => {
    setShop((prev) => ({
      ...prev,
      paymentMethods: {
        ...prev.paymentMethods,
        [field]: value,
      },
    }));
  };

  // Update Contact Info
  const updateContact = (field: keyof ContactState, value: string) => {
    setShop((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value,
      },
    }));
  };

  // Update Address Info
  const updateAddress = (field: keyof AddressState, value: string) => {
    setShop((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  // Update Delivery Info
  const updateDelivery = (field: keyof DeliveryState, value: string) => {
    setShop((prev) => ({
      ...prev,
      delivery: { ...prev.delivery, [field]: value },
    }));
  };

  // Update Financials Info
  const updateFinancials = (field: keyof FinancialsState, value: any) => {
    console.log(value);
    setShop((prev) => ({
      ...prev,
      financials: { ...prev.financials, [field]: value },
    }));
  };

  // Update Branding Info (Not Social Links)
  const updateBranding = (field: keyof BrandingState, value: string) => {
    setShop((prev) => ({
      ...prev,
      branding: { ...prev.branding, [field]: value },
    }));
  };

  // Update Social Links Info
  const updateSocials = (field: keyof SocialsState, value: string) => {
    setShop((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        socialLinks: {
          ...prev.branding.socialLinks,
          [field]: value,
        },
      },
    }));
  };

  // Update Featured Bouquet Info
  const updateBouquet = (field: keyof FeaturedBouquetState, value: any) => {
    setShop((prev) => ({
      ...prev,
      featuredBouquet: { ...prev.featuredBouquet, [field]: value },
    }));
  };

  // #region Delivery Zones

  // Add Zone
  const addZone = () => {
    if (shop.delivery.method === "zip") {
      const newZip: ZipZone = { name: "", zip: "", fee: "" };
      setShop((prev) => ({
        ...prev,
        delivery: {
          ...prev.delivery,
          zipZones: [...prev.delivery.zipZones, newZip],
        },
      }));
    } else {
      // Logic for Distance: Find the last zone's max to use as the new min
      const lastZone =
        shop.delivery.distanceZones[shop.delivery.distanceZones.length - 1];
      const nextMin = lastZone ? lastZone.max : 0; // Default to 0 if first zone

      const newDist: DistanceZone = { min: nextMin, max: 0, fee: "" };

      setShop((prev) => ({
        ...prev,
        delivery: {
          ...prev.delivery,
          distanceZones: [...prev.delivery.distanceZones, newDist],
        },
      }));
    }
  };

  // Validate Distance Zones
  const validateDistanceZones = (zones: DistanceZone[]) => {
    setZoneErrors({});
    const newErrors: Record<number, ZoneError> = {};

    // 1. Create a sorted map of indices based on 'min' values
    // This allows us to check for gaps and overlaps sequentially
    const sortedIndices = zones
      .map((_, i) => i)
      .sort((a, b) => Number(zones[a].min) - Number(zones[b].min));

    sortedIndices.forEach((currentIndex, i) => {
      const zone = zones[currentIndex];
      const errors: ZoneError = {};

      const zMin = Number(zone.min);
      const zMax = Number(zone.max);
      const zFee = zone.fee;

      // --- BASIC FIELD VALIDATION ---
      // Check for empty/zero fields
      if (zMin === undefined || zMax === undefined || !zFee || zFee === 0) {
        errors.fields = "All distance fields are required.";
      }

      // Logic Check: Min cannot be greater than or equal to Max
      if (zMin >= zMax && zMax !== 0) {
        errors.max = "Max distance must be greater than Min.";
      }

      // --- OVERLAP & GAP LOGIC (SEQUENTIAL) ---
      // If there is a "next" zone in the sorted list, check the boundary
      if (i < sortedIndices.length - 1) {
        const nextIndex = sortedIndices[i + 1];
        const nextZone = zones[nextIndex];
        const nextMin = Number(nextZone.min);

        // Check for Gaps: e.g., Zone A ends at 5, Zone B starts at 6
        if (zMax < nextMin) {
          errors.gap = `Gap between ${zMax} and ${nextMin} miles (Fallback fee applies).`;
        }

        // Check for Overlaps: e.g., Zone A ends at 7, Zone B starts at 5
        if (zMax > nextMin) {
          errors.overlap = `This range overlaps with the next zone starting at ${nextMin} miles.`;
        }
      }

      // Save errors for this specific index if any were found
      if (Object.keys(errors).length > 0) {
        newErrors[currentIndex] = errors;
      }
    });

    setZoneErrors(newErrors);

    // Return true only if the errors object is completely empty
    return Object.keys(newErrors).length === 0;
  };

  // Validate Zip Zones
  const validateZipZones = (updatedZones: ZipZone[]) => {
    setZoneErrors({});
    const newErrors: Record<number, ZoneError> = {};

    updatedZones.forEach((zone, index) => {
      const errors: ZoneError = {};

      // 1. Check for Empty Fields
      if (!zone.name.trim() || !zone.zip.trim() || zone.fee === "") {
        errors.fields = "All fields are required for this zone.";
      }

      // 2. Check for Duplicate Names
      const isDuplicateName = updatedZones.some(
        (other, i) =>
          i !== index &&
          other.name.trim().toLowerCase() === zone.name.trim().toLowerCase() &&
          zone.name !== "",
      );
      if (isDuplicateName) errors.name = "This zone name is already in use.";

      // 3. Check for Duplicate ZIPs
      const isDuplicateZip = updatedZones.some(
        (other, i) =>
          i !== index &&
          other.zip.trim() === zone.zip.trim() &&
          zone.zip !== "",
      );
      if (isDuplicateZip)
        errors.zip = "This ZIP code is already assigned to another zone.";

      if (Object.keys(errors).length > 0) {
        newErrors[index] = errors;
      }
    });

    setZoneErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Returns true if valid
  };

  // Remove Zone
  const removeZone = (index: number) => {
    if (window.confirm("Are you sure you want to remove this zone?")) {
      const isZip = shop.delivery.method === "zip";
      const listKey = isZip ? "zipZones" : "distanceZones";

      setShop((prev) => {
        // 1. Create the new filtered list
        let updatedList = (prev.delivery[listKey] as any[]).filter(
          (_, i) => i !== index,
        );

        // 2. HEAL GAPS (Distance only)
        // If we deleted a zone in the middle, the "new" zone at this index
        // needs its 'min' updated to the previous zone's 'max'.
        if (!isZip && updatedList.length > 0 && index < updatedList.length) {
          const prevZoneMax = index > 0 ? updatedList[index - 1].max : 0;
          updatedList[index] = { ...updatedList[index], min: prevZoneMax };
        }

        // 3. Trigger validation with the fresh list
        if (isZip) validateZipZones(updatedList as ZipZone[]);
        else validateDistanceZones(updatedList as DistanceZone[]);

        // 4. Update state (Correctly nested under delivery)
        return {
          ...prev,
          delivery: {
            ...prev.delivery,
            [listKey]: updatedList,
          },
        };
      });
    }
  };

  // Update Zone
  const updateZone = (index: number, field: string, value: any) => {
    const isZip = shop.delivery.method === "zip";
    const listKey = isZip ? "zipZones" : "distanceZones";

    setShop((prev) => {
      const newList = [...(prev.delivery[listKey] as any[])];
      newList[index] = { ...newList[index], [field]: value };

      if (!isZip && field === "max" && index < newList.length - 1) {
        newList[index + 1] = { ...newList[index + 1], min: value };
      }

      if (isZip) validateZipZones(newList);
      else validateDistanceZones(newList);

      return {
        ...prev,
        delivery: {
          ...prev.delivery,
          [listKey]: newList,
        },
      };
    });
  };

  // #endregion

  // Format Delivery Fee
  const handleFeeBlur = () => {
    // 1. Get the value (TypeScript knows this is a number)
    const rawPrice = shop.delivery.fallbackFee;
    console.log(rawPrice);

    // 2. Validation: check if it exists
    if (rawPrice === undefined || rawPrice === null) return;

    // 3. Round it (your helper returns a string like "10.00")
    const rounded = Math.round(rawPrice * 100) / 100;

    const newRounded = Number(rounded).toFixed(2);

    // 4. Update State (convert back to number for your interface)
    setShop((prev) => ({
      ...prev,
      delivery: {
        ...prev.delivery,
        fallbackFee: Number(newRounded), // Convert back to number
      },
    }));
  };

  // Create Slug
  const updateSlug = (value: string) => {
    return value
      .toLowerCase() // 1. Convert to lowercase
      .trim() // 2. Remove leading/trailing spaces
      .replace(/[^\w\s-]/g, "") // 3. Remove non-word chars (except spaces/hyphens)
      .replace(/[\s_-]+/g, "-") // 4. Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, ""); // 5. Remove extra hyphens from ends
  };

  // #endregion

  // Label + Input
  const normalLabel = "text-black opacity-75 xl:text-lg";
  const normalInput =
    "w-full px-4 py-2 text-xl border-2 rounded-xl text-center";
  const normalH2 = "text-2xl font-bold text-purple-600 text-center";
  const normalSection =
    "bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl space-y-4 shadow-2xl p-5 border-4 border-purple-200 relative flex flex-col items-center";
  const previewP = "text-xl font-semibold capitalize xl:text-2xl";
  const paymentMethodInput = "px-6 py-3 text-xl rounded-xl bg-white/20 placeholder-white/60 text-white text-center sm:px-4 sm:text-lg";

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen space-y-4 px-2">
        {/* Mobile Header */}
        <div className="lg:hidden">
          <h2 className="text-3xl font-bold text-purple-600 text-center">
            Settings
          </h2>
        </div>

        {/* Verified */}
        {shop.verifiedFlorist ? (
          <div className="text-emerald-600 flex gap-1 items-center font-semibold justify-center lg:justify-start">
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
                d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
              />
            </svg>
            <p className="">Verified Florist</p>
          </div>
        ) : (
          <div>
            <button className="px-2 py-1 bg-emerald-600 text-white rounded-lg w-full hover:bg-emerald-700">
              Get Verified Today!
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-4 text-center lg:grid-cols-2">

          {/* No More Orders Today -- UPDATE DATABASE WHEN THIS IS CLICKED */}
          <div className="lg:col-span-2">
            <label className="grid grid-cols-1 gap-1 text-center w-40 mx-auto lg:mx-0 lg:grid-cols-2 lg:w-96 lg:items-center cursor-pointer group">
              <input
                type="checkbox"
                id="delivery"
                name="noMoreOrdersToday"
                checked={shop.delivery.noMoreOrdersToday}
                onChange={() => {
                  setShop((prev) => ({
                    ...prev,
                    delivery: {
                      ...prev.delivery,
                      noMoreOrdersToday: !prev.delivery.noMoreOrdersToday,
                    },
                  }));
                  handleSave("noMoreOrdersToday");
                }}
                className="hidden" // Hide the default box
              />
              <span className="font-medium text-gray-700 sm:text-lg">
                Stop Orders Today
              </span>
              <div
                className={`
                        px-6 py-2 rounded-lg font-bold transition-all duration-200 uppercase tracking-wider text-center
                        ${
                          shop.delivery.noMoreOrdersToday
                            ? "bg-green-500 text-white shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-1"
                            : "bg-red-500 text-white shadow-inner translate-y-1 opacity-80 ring-2 ring-red-700/20"
                        }
                      `}
              >
                {shop.delivery.noMoreOrdersToday ? "Yes" : "No"}
              </div>
            </label>
          </div>

          {/* Payment Methods */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl shadow-2xl p-5 space-y-4 relative">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-white text-center">
                How shops pay you
              </h2>
              <button
                onClick={() => handleEditClick("paymentMethods")}
                className={
                  (activeSection === "paymentMethods" ? "hidden" : "block") +
                  " absolute top-2 right-2"
                }
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
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </button>
            </div>
            {activeSection === "paymentMethods" ? (
              <div className="grid grid-cols-1 gap-y-4 text-center sm:grid-cols-2 sm:gap-y-6 sm:gap-x-8 lg:grid-cols-1">
                {/* Venmo */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <label>Venmo Handle</label>
                    <label className="text-xs uppercase text-white font-bold flex items-center gap-1 mr-2">
                      <input
                        type="radio"
                        name="defaultPaymentMethod"
                        value="venmo"
                        tabIndex={-1}
                        checked={
                          shop.paymentMethods.defaultPaymentMethod === "venmo"
                        }
                        onChange={(e) =>
                          updatePaymentMethods("defaultPaymentMethod", "venmo")
                        }
                        className="w-3"
                      />{" "}
                      Set Default
                    </label>
                  </div>
                  <input
                    type="text"
                    name="venmoHandle"
                    value={shop.paymentMethods.venmoHandle || ""}
                    onChange={(e) =>
                      updatePaymentMethods("venmoHandle", e.target.value)
                    }
                    placeholder="@YourShopName"
                    className={paymentMethodInput}
                  />
                </div>
                {/* Zelle */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <label>Zelle (Phone/Email)</label>
                    <label className="text-xs uppercase text-white font-bold flex items-center gap-1 mr-2">
                      <input
                        type="radio"
                        name="defaultPaymentMethod"
                        value="zelle"
                        tabIndex={-1}
                        checked={
                          shop.paymentMethods.defaultPaymentMethod === "zelle"
                        }
                        onChange={(e) =>
                          updatePaymentMethods("defaultPaymentMethod", "zelle")
                        }
                        className="w-3"
                      />{" "}
                      Set Default
                    </label>
                  </div>
                  <input
                    type="text"
                    name="zellePhoneOrEmail"
                    value={shop.paymentMethods.zellePhoneOrEmail || ""}
                    onChange={(e) =>
                      updatePaymentMethods("zellePhoneOrEmail", e.target.value)
                    }
                    placeholder="555-123-4567"
                    className={paymentMethodInput}
                  />
                </div>
                {/* Cash App */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <label>Cash App Tag</label>
                    <label className="text-xs uppercase text-white font-bold flex items-center gap-1 mr-2">
                      <input
                        type="radio"
                        name="defaultPaymentMethod"
                        value="cashapp"
                        tabIndex={-1}
                        checked={
                          shop.paymentMethods.defaultPaymentMethod === "cashapp"
                        }
                        onChange={(e) =>
                          updatePaymentMethods(
                            "defaultPaymentMethod",
                            "cashapp",
                          )
                        }
                        className="w-3"
                      />{" "}
                      Set Default
                    </label>
                  </div>
                  <input
                    type="text"
                    name="cashAppTag"
                    value={shop.paymentMethods.cashAppTag || ""}
                    onChange={(e) =>
                      updatePaymentMethods("cashAppTag", e.target.value)
                    }
                    placeholder="$YourShopName"
                    className={paymentMethodInput}
                  />
                </div>
                {/* PayPal */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <label>PayPal Email</label>
                    <label className="text-xs uppercase text-white font-bold flex items-center gap-1 mr-2">
                      <input
                        type="radio"
                        name="defaultPaymentMethod"
                        value="paypal"
                        tabIndex={-1}
                        checked={
                          shop.paymentMethods.defaultPaymentMethod === "paypal"
                        }
                        onChange={(e) =>
                          updatePaymentMethods("defaultPaymentMethod", "paypal")
                        }
                        className="w-3"
                      />{" "}
                      Set Default
                    </label>
                  </div>
                  <input
                    type="text"
                    name="paypalEmail"
                    value={shop.paymentMethods.paypalEmail || ""}
                    onChange={(e) =>
                      updatePaymentMethods("paypalEmail", e.target.value)
                    }
                    placeholder="example@email.com"
                    className={paymentMethodInput}
                  />
                </div>
                {/* Buttons */}
                <div className="grid grid-cols-1 gap-4 w-full sm:grid-cols-2 sm:col-span-2 lg:col-span-1">
                  <button
                    onClick={() => handleSave("paymentMethods")}
                    disabled={isSaving === "paymentMethods"}
                    className="bg-emerald-600 text-white text-xl px-10 py-2 rounded-xl transition-all hover:bg-emerald-700"
                  >
                    {isSaving === "paymentMethods" ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="bg-red-500 text-white text-xl px-10 py-2 rounded-xl transition-all hover:bg-red-600"
                    onClick={handleEditCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-y-4 text-center max-w-[40rem] mx-auto sm:grid-cols-2 sm:gap-y-6 lg:grid-cols-1">
                {/* Venmo */}
                <div>
                  <div className="flex gap-1 justify-center">
                    <label className="text-white opacity-75">
                      Venmo Handle
                    </label>
                    {shop.paymentMethods.defaultPaymentMethod === "venmo" && (
                      <p className="font-semibold text-emerald-500">
                        - Default
                      </p>
                    )}
                  </div>
                  {shop.paymentMethods.venmoHandle ? (
                    <p
                      className={
                        (shop.paymentMethods.defaultPaymentMethod === "venmo"
                          ? "text-emerald-500"
                          : "text-white") + " text-xl font-semibold capitalize"
                      }
                    >
                      {shop.paymentMethods.venmoHandle}
                    </p>
                  ) : (
                    <p>No Venmo Handle set up yet!</p>
                  )}
                </div>
                {/* Zelle */}
                <div>
                  <div className="flex gap-1 justify-center">
                    <label className="text-white opacity-75">
                      Zelle (Phone/Email)
                    </label>
                    {shop.paymentMethods.defaultPaymentMethod === "zelle" && (
                      <p className="font-semibold text-emerald-500">
                        - Default
                      </p>
                    )}
                  </div>
                  {shop.paymentMethods.zellePhoneOrEmail ? (
                    <p
                      className={
                        (shop.paymentMethods.defaultPaymentMethod === "zelle"
                          ? "text-emerald-500"
                          : "text-white") + " text-xl font-semibold capitalize"
                      }
                    >
                      {shop.paymentMethods.zellePhoneOrEmail}
                    </p>
                  ) : (
                    <p>No Zelle Phone/Email set up yet!</p>
                  )}
                </div>
                {/* Cash App */}
                <div>
                  <div className="flex gap-1 justify-center">
                    <label className="text-white opacity-75">
                      Cash App Tag
                    </label>
                    {shop.paymentMethods.defaultPaymentMethod === "cashapp" && (
                      <p className="font-semibold text-emerald-500">
                        - Default
                      </p>
                    )}
                  </div>
                  {shop.paymentMethods.cashAppTag ? (
                    <p
                      className={
                        (shop.paymentMethods.defaultPaymentMethod === "cashapp"
                          ? "text-emerald-500"
                          : "text-white") + " text-xl font-semibold capitalize"
                      }
                    >
                      {shop.paymentMethods.cashAppTag}
                    </p>
                  ) : (
                    <p>No Cash App Tag set up yet!</p>
                  )}
                </div>
                {/* PayPal */}
                <div>
                  <div className="flex gap-1 justify-center">
                    <label className="text-white opacity-75">
                      PayPal Email
                    </label>
                    {shop.paymentMethods.defaultPaymentMethod === "paypal" && (
                      <p className="font-semibold text-emerald-500">
                        - Default
                      </p>
                    )}
                  </div>
                  {shop.paymentMethods.paypalEmail ? (
                    <p
                      className={
                        (shop.paymentMethods.defaultPaymentMethod === "paypal"
                          ? "text-emerald-500"
                          : "text-white") + " text-xl font-semibold capitalize"
                      }
                    >
                      {shop.paymentMethods.paypalEmail}
                    </p>
                  ) : (
                    <p>No PayPal Email set up yet!</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Shop Info */}
          <div className={normalSection}>
            {/* Header */}
            <div>
              <h2 className={normalH2}>Shop Info</h2>
              <button
                onClick={() => handleEditClick("shopInfo")}
                className={
                  (activeSection === "shopInfo" ? "hidden" : "block") +
                  " absolute top-2 right-2"
                }
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
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </button>
            </div>
            {activeSection === "shopInfo" ? (
              // {/* Edit */}
              <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4 lg:grid-cols-2">
                {/* Shop Name */}
                <div className="col-span-2">
                  <label className={normalLabel}>Shop Name</label>
                  <input
                    type="text"
                    value={shop.businessName}
                    onChange={(e) => {
                      const newName = e.target.value;
                      const newSlug = updateSlug(newName);

                      setShop((prev) => ({
                        ...prev,
                        businessName: newName,
                        slug: newSlug,
                      }));
                    }}
                    className={normalInput}
                  />
                </div>
                {/* Shop Phone */}
                <div className="col-span-2">
                  <label className={normalLabel}>Shop Phone (Public)</label>
                  <input
                    type="phone"
                    placeholder="888-888-8888"
                    maxLength={12}
                    value={shop.contact.phone}
                    onChange={(e) =>
                      updateContact("phone", formatDynamicPhone(e.target.value))
                    }
                    className={normalInput}
                  />
                </div>
                {/* Shop Address */}
                <div className="col-span-2">
                  <label className={normalLabel}>Shop Address</label>
                  <input
                    type="text"
                    placeholder="123 Flower Lane"
                    value={shop.address.street}
                    onChange={(e) => updateAddress("street", e.target.value)}
                    className={normalInput}
                  />
                </div>
                  {/* Shop City */}
                  <div className="col-span-2">
                    <label className={normalLabel}>Shop City</label>
                    <input
                      type="text"
                      placeholder="Flower City"
                      value={shop.address.city}
                      onChange={(e) => updateAddress("city", e.target.value)}
                      className={normalInput}
                    />
                  </div>
                  {/* Shop State */}
                  <div className="col-span-1">
                    <label className={normalLabel}>Shop State</label>
                    <input
                      type="text"
                      placeholder="NY"
                      value={shop.address.state}
                      onChange={(e) => {
                        updateAddress("state", e.target.value);
                      }}
                      className={normalInput}
                    />
                  </div>
                  {/* Shop Zip */}
                  <div className="col-span-1">
                    <label className={normalLabel}>Shop Zip</label>
                    <input
                      type="text"
                      placeholder="14036"
                      value={shop.address.zip}
                      maxLength={5}
                      onChange={(e) => {
                        updateAddress("zip", e.target.value);
                      }}
                      className={normalInput}
                    />
                  </div>
                {/* Shop Country */}
                <div className="col-span-2">
                  <label className={normalLabel}>Shop Country</label>
                  <select
                    name="country"
                    value={shop.address.country}
                    onChange={(e) => updateAddress("country", e.target.value)}
                    className={normalInput}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c === "US" ? "United States" : "Canada"}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Buttons */}
                <div className="grid grid-cols-1 gap-4 col-span-2 sm:col-span-4 sm:grid-cols-2 lg:col-span-2">
                  <button
                    onClick={() => handleSave("shopInfo")}
                    disabled={isSaving === "shopInfo"}
                    className="bg-emerald-600 text-white text-xl px-10 py-2 rounded-xl transition-all hover:bg-emerald-700"
                  >
                    {isSaving === "shopInfo" ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="bg-red-500 text-white text-xl px-10 py-2 rounded-xl transition-all hover:bg-red-600"
                    onClick={handleEditCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // {/* Preview */}
              <div className="grid grid-cols-1 text-center gap-4 sm:grid-cols-2 sm:max-w-[40rem] sm:gap-x-10 lg:gap-x-4">
                {/* Shop Name */}
                <div className="lg:col-span-2">
                  <label className={normalLabel}>Name</label>
                  <p className={previewP}>{shop.businessName}</p>
                </div>
                {/* Shop Phone */}
                <div className="lg:col-span-2">
                  <label className={normalLabel}>Phone</label>
                  <p className={previewP}>{shop.contact.phone}</p>
                </div>
                {/* Shop Address */}
                <div className="lg:col-span-2">
                  <label className={normalLabel}>Address</label>
                  <p className={previewP}>{shop.address.street}</p>
                </div>
                <div className="flex gap-4 justify-center lg:col-span-2">
                  {/* Shop City */}
                  <div>
                    <label className={normalLabel}>City</label>
                    <p className={previewP}>{shop.address.city}</p>
                  </div>
                  {/* Shop State */}
                  <div>
                    <label className={normalLabel}>State</label>
                    <p className={previewP}>{shop.address.state}</p>
                  </div>
                  {/* Shop Zip */}
                  <div>
                    <label className={normalLabel}>Zip</label>
                    <p className={previewP}>{shop.address.zip}</p>
                  </div>
                </div>
                {/* Country */}
                <div className="sm:col-span-2">
                  <label className={normalLabel}>Country</label>
                  <p className={previewP}>{shop.address.country}</p>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Settings */}
          <div className={normalSection}>
            {/* Header */}
            <div>
              <h2 className={normalH2}>Delivery Settings</h2>
              <button
                onClick={() => handleEditClick("delivery")}
                className={
                  (activeSection === "delivery" ? "hidden" : "block") +
                  " absolute top-2 right-2"
                }
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
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </button>
            </div>
            {activeSection === "delivery" ? (
              <>
                <div>
                  <h3 className="mb-2 text-center">
                    Choose Delivery Method
                    <br /> (
                    <span className="text-emerald-700 font-semibold">
                      Zip
                    </span>{" "}
                    or
                    <span className="text-emerald-700 font-semibold">
                      {" "}
                      Distance
                    </span>
                    )
                  </h3>
                  <div className="px-2 flex items-center justify-center gap-8 text-xl">
                    {/* Zip */}
                    <label>
                      <input
                        type="radio"
                        name="method"
                        value="zip"
                        tabIndex={-1}
                        checked={shop.delivery.method === "zip"}
                        onChange={(e) => updateDelivery("method", "zip")}
                      />{" "}
                      Zip
                    </label>
                    {/* Distance */}
                    <label>
                      <input
                        type="radio"
                        name="method"
                        value="distance"
                        tabIndex={-1}
                        checked={shop.delivery.method === "distance"}
                        onChange={(e) => updateDelivery("method", "distance")}
                      />{" "}
                      Distance
                    </label>
                  </div>
                </div>

                {/* Dynamic Zone Section */}
                <div className="border p-4 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium capitalize">
                      {shop.delivery.method} Zones
                    </h3>
                    <button
                      type="button"
                      onClick={addZone}
                      className="text-xs bg-emerald-600 text-white px-2 py-1 rounded"
                    >
                      + Add{" "}
                      {shop.delivery.method === "zip" ? "Zip" : "Distance"}{" "}
                      Option
                    </button>
                  </div>

                  {shop.delivery.method === "zip" ? (
                    // Zip
                    <div className="space-y-2">
                      {shop.delivery.zipZones.map((zone, index) => (
                        <div
                          key={index}
                          className="space-y-1 border-b pb-4 mb-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start gap-2 lg:flex-col">
                            <div className="grid grid-cols-1 gap-2 flex-1">
                              {/* Name */}
                              <div>
                                <input
                                  className={`w-full p-2 border-rounded ${zoneErrors[index]?.name ? "border-red-500" : "border-gray-300"}`}
                                  value={zone.name}
                                  onChange={(e) =>
                                    updateZone(index, "name", e.target.value)
                                  }
                                  placeholder="Zone Name"
                                />
                                {zoneErrors[index]?.name && (
                                  <p className="text-[10px] text-red-500 mt-1">
                                    {zoneErrors[index].name}
                                  </p>
                                )}
                              </div>
                              {/* Zip */}
                              <div>
                                <input
                                  className={`w-full p-2 border rounded ${zoneErrors[index]?.zip ? "border-red-500" : "border-gray-300"}`}
                                  value={zone.zip}
                                  onChange={(e) =>
                                    updateZone(index, "zip", e.target.value)
                                  }
                                  placeholder="ZIP Code"
                                />
                                {zoneErrors[index]?.zip && (
                                  <p className="text-[10px] text-red-500 mt-1">
                                    {zoneErrors[index].zip}
                                  </p>
                                )}
                              </div>
                              {/* Fee */}
                              <input
                                type="number"
                                className="w-full p-2 border rounded border-gray-300"
                                value={zone.fee}
                                onChange={(e) =>
                                  updateZone(index, "fee", e.target.value)
                                }
                                onBlur={() =>
                                  updateZone(
                                    index,
                                    "fee",
                                    parseFloat(zone.fee.toString()).toFixed(2),
                                  )
                                }
                                placeholder="Fee ($)"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeZone(index)}
                              className="px-4 py-1 w-full bg-red-500 text-white rounded-md sm:text-red-500 sm:p-2 sm:w-auto sm:bg-transparent sm:rounded-none lg:bg-red-500 lg:px-4 lg:py-1 lg:w-full lg:text-white lg:rounded-md"
                            >
                              <span className="hidden sm:block lg:hidden">X</span>
                              <span className="sm:hidden lg:block">Remove Zone</span>
                            </button>
                          </div>
                          {zoneErrors[index]?.fields && (
                            <p className="text-[10px] text-red-600 font-bold">
                              {zoneErrors[index].fields}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Distance
                    <div className="space-y-2">
                      {shop.delivery.distanceZones.map((zone, index) => (
                        <React.Fragment key={index}>
                          <div
                            className={`p-3 rounded-lg border ${zoneErrors[index]?.gap ? "bg-amber-50 border-amber-200" : "bg-white"}`}
                          >
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
                              <div>
                                <label className="text-[10px] text-gray-400">
                                  Min Miles
                                </label>
                                <input
                                  type="number"
                                  step={0.1}
                                  className="w-full p-2 border rounded border-gray-300"
                                  value={zone.min}
                                  onChange={(e) =>
                                    updateZone(index, "min", e.target.value)
                                  }
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-400">
                                  Max Miles
                                </label>
                                <input
                                  type="number"
                                  step={0.1}
                                  className={`w-full p-2 border rounded ${zoneErrors[index]?.max ? "border-red-500" : "border-gray-300"}`}
                                  value={zone.max}
                                  onChange={(e) =>
                                    updateZone(index, "max", e.target.value)
                                  }
                                />
                                {zoneErrors[index]?.max && (
                                  <p className="text-[10px] text-red-500 mt-1">
                                    {zoneErrors[index].max}
                                  </p>
                                )}
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-400">
                                  Fee ($)
                                </label>
                                <input
                                  type="number"
                                  className="w-full p-2 border rounded border-gray-300"
                                  value={zone.fee}
                                  onChange={(e) =>
                                    updateZone(index, "fee", e.target.value)
                                  }
                                  onBlur={() =>
                                    updateZone(
                                      index,
                                      "fee",
                                      parseFloat(zone.fee.toString()).toFixed(
                                        2,
                                      ),
                                    )
                                  }
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeZone(index)}
                                className="px-4 py-1 w-full col-span-3 bg-red-500 text-white rounded-md sm:p-2 sm:col-span-1 sm:max-h-11 sm:self-end sm:mb-[0.05rem] lg:col-span-3"
                              >
                                Remove Zone
                              </button>
                            </div>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fallback Fee + Max Radius */}
                <div className="grid grid-cols-1 gap-4 text-center md:grid-cols-2">
                  {/* Fallback Fee */}
                  <div>
                    <label className={normalLabel}>Fallback Fee</label>
                    <input
                      name="fallbackFee"
                      type="number"
                      step="0.01"
                      placeholder="$0.00"
                      value={shop.delivery.fallbackFee}
                      onChange={(e) =>
                        updateDelivery("fallbackFee", e.target.value)
                      }
                      onBlur={handleFeeBlur}
                      className={normalInput}
                    />
                  </div>
                  {/* Max Radius */}
                  <div>
                    <label className={normalLabel}>Max Radius (mi.)</label>
                    <input
                      name="maxRadius"
                      type="number"
                      placeholder="0"
                      value={shop.delivery.maxRadius}
                      onChange={(e) =>
                        updateDelivery("maxRadius", e.target.value)
                      }
                      className={normalInput}
                    />
                  </div>
                </div>

                {/* Allow Same Day Delivery*/}
                <div className="space-y-4 text-center">
                  <div>
                    <label className="flex flex-col items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        id="delivery"
                        name="allowSameDay"
                        checked={shop.delivery.allowSameDay}
                        onChange={handleCBChange}
                        className="hidden" // Hide the default box
                      />
                      <span className="font-medium text-gray-700 mb-2">
                        Allow Same Day Delivery
                      </span>
                      <div
                        className={`
                        px-6 py-2 rounded-lg font-bold transition-all duration-200 uppercase tracking-wider text-center
                        ${
                          shop.delivery.allowSameDay
                            ? "bg-green-500 text-white shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-1"
                            : "bg-red-500 text-white shadow-inner translate-y-1 opacity-80 ring-2 ring-red-700/20"
                        }
                      `}
                      >
                        {shop.delivery.allowSameDay ? "Allow" : "Don't Allow"}
                      </div>
                    </label>
                  </div>
                  {shop.delivery.allowSameDay && (
                    <div>
                      <label className={normalLabel}>Same Day Cutoff</label>
                      <input
                        type="time"
                        name="sameDayCutoff"
                        value={shop.delivery.sameDayCutoff}
                        onChange={(e) =>
                          updateDelivery("sameDayCutoff", e.target.value)
                        }
                        className={normalInput}
                      />
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-1 gap-4 w-full sm:grid-cols-2">
                  <button
                    onClick={() => handleSave("delivery")}
                    disabled={isSaving === "delivery"}
                    className="bg-emerald-600 text-white text-xl px-10 py-2 rounded-xl transition-all hover:bg-emerald-700"
                  >
                    {isSaving === "delivery" ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="bg-red-500 text-white text-xl px-10 py-2 rounded-xl transition-all hover:bg-red-600"
                    onClick={handleEditCancel}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 gap-y-4 items-center justify-center text-center">
                {/* Delivery Method */}
                <div>
                  <label className={normalLabel}>Delivery Method</label>
                  <p className={previewP}>{shop.delivery.method} Zones</p>
                </div>
                {shop.delivery.method === "distance" ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {shop.delivery.distanceZones.map((zone, index) => (
                      <React.Fragment key={index}>
                        <div
                          className="p-3 rounded-lg border bg-white"
                        >
                          <div className="grid grid-cols-3 gap-10">
                            <div>
                              <label className={normalLabel}>Min</label>
                              <p className={previewP}>{zone.min} mi.</p>
                            </div>
                            <div>
                              <label className={normalLabel}>Max</label>
                              <p className={previewP}>{zone.max} mi.</p>
                            </div>
                            <div>
                              <label className={normalLabel}>Fee</label>
                              <p className={previewP}>${zone.fee}</p>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                ) : (
                  // Zip Zones
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-1 lg:gap-y-4">
                    {shop.delivery.zipZones.map((zone, index) => (
                      <div key={index} className="border-b pb-4 sm:border-0 sm:pb-0">
                        <div className="grid grid-cols-2 gap-y-4 gap-x-8 flex-1 bg-white rounded-lg p-5">
                          {/* Zone Name */}
                          <div className="col-span-2">
                            <p className={previewP}>{zone.name}</p>
                          </div>
                          {/* Zip */}
                          <div>
                            <label className={normalLabel}>Zip Code</label>
                            <p className={previewP}>{zone.zip}</p>
                          </div>
                          {/* Fee */}
                          <div>
                            <label className={normalLabel}>Zone Fee</label>
                            <p className={previewP}>${zone.fee}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fallback Fee + Max Radius */}
                <div className="flex justify-evenly items-center w-full">
                  <div>
                    <label className={normalLabel}>Fallback Fee</label>
                    <p className={previewP}>${shop.delivery.fallbackFee}</p>
                  </div>
                  <div>
                    <label className={normalLabel}>Max Radius</label>
                    <p className={previewP}>{shop.delivery.maxRadius} mi.</p>
                  </div>
                </div>

                {/* Allow Same Day Delivery + Same Day Cutoff */}
                {shop.delivery.allowSameDay ? (
                  <div>
                    <p className={previewP + " text-emerald-500"}>
                      Allow Same Day Delivery
                    </p>
                    <p className={previewP}>
                      {new Date(
                        `1970-01-01T${shop.delivery.sameDayCutoff}:00`,
                      ).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className={previewP + " text-red-500"}>
                      Don't Allow Same Day Delivery
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Holidays */}
          {/* ADD THIS LATER -- Possibly allow them to add a holiday and check google on the order screen for the date of that holiday for that year + auto-generate for set holidays (V-day 2/14) */}

          {/* Taxes & Fees */}
          <div className={normalSection}>
            {/* Header */}
            <div>
              <h2 className={normalH2}>Taxes & Fees</h2>
              <button
                onClick={() => handleEditClick("financials")}
                className={
                  (activeSection === "financials" ? "hidden" : "block") +
                  " absolute top-2 right-2"
                }
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
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </button>
            </div>
            {activeSection === "financials" ? (
              <div className="grid grid-cols-1 gap-4 text-center sm:gap-2 md:grid-cols-2 lg:grid-cols-1">
                {/* Tax Percent */}
                <div>
                  <label className={normalLabel}>Tax Percent</label>
                  <input
                    type="number"
                    step={0.001}
                    placeholder="8.250%"
                    value={shop.financials.taxPercentage}
                    onChange={(e) =>
                      updateFinancials(
                        "taxPercentage",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    className={normalInput}
                  />
                </div>
                {/* Fee Type & Value */}
                <div>
                  <label className={normalLabel}>Service Fee</label>
                  <div className="relative flex items-center mt-1">
                    {/* The Input */}
                    <input
                      type="number"
                      step={0.01}
                      placeholder="0.00"
                      value={shop.financials.feeValue}
                      onChange={(e) =>
                        updateFinancials(
                          "feeValue",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className={`${normalInput} pr-24`} // Add padding-right to make room for the toggle
                    />

                    {/* The Floating Toggle */}
                    <div className="absolute right-1 flex bg-gray-100 rounded-md p-1 shadow-inner border border-gray-200">
                      <button
                        type="button"
                        title="Flat Fee ($)"
                        onClick={() => updateFinancials("feeType", "flat")}
                        className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                          shop.financials.feeType === "flat"
                            ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        $
                      </button>
                      <button
                        type="button"
                        title="Percentage Fee (%)"
                        onClick={() => updateFinancials("feeType", "%")}
                        className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                          shop.financials.feeType === "%"
                            ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                </div>
                {/* Delivery + Fee Taxed? */}
                <div className="grid grid-cols-2 gap-6 mb-4 md:col-span-2 lg:col-span-1">
                  {/* Deliveries Taxed */}
                  <div>
                    <label className="flex flex-col items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        name="deliveryTaxed"
                        checked={shop.financials.deliveryTaxed}
                        onChange={handleCBChange}
                        className="hidden" // Hide the default box
                      />
                      <span className="font-medium text-gray-700">
                        Tax Deliveries
                      </span>
                      <div
                        className={`
                        px-6 py-2 rounded-lg font-bold transition-all duration-200 uppercase tracking-wider text-center
                        ${
                          shop.financials.deliveryTaxed
                            ? "bg-green-500 text-white shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-1"
                            : "bg-red-500 text-white shadow-inner translate-y-1 opacity-80 ring-2 ring-red-700/20"
                        }
                      `}
                      >
                        {shop.financials.deliveryTaxed
                          ? "Tax Enabled"
                          : "Tax Disabled"}
                      </div>
                    </label>
                  </div>
                  {/* Fee Taxed */}
                  <div>
                    <label className="flex flex-col items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        name="feeTaxed"
                        checked={shop.financials.feeTaxed}
                        onChange={handleCBChange}
                        className="hidden" // Hide the default box
                      />
                      <span className="font-medium text-gray-700">Tax Fee</span>
                      <div
                        className={`
                        px-6 py-2 rounded-lg font-bold transition-all duration-200 uppercase tracking-wider text-center
                        ${
                          shop.financials.feeTaxed
                            ? "bg-green-500 text-white shadow-[0_4px_0_0_#15803d] active:shadow-none active:translate-y-1"
                            : "bg-red-500 text-white shadow-inner translate-y-1 opacity-80 ring-2 ring-red-700/20"
                        }
                      `}
                      >
                        {shop.financials.feeTaxed
                          ? "Tax Enabled"
                          : "Tax Disabled"}
                      </div>
                    </label>
                  </div>
                </div>
                {/* Buttons */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2 lg:col-span-1">
                  <button
                    onClick={() => handleSave("financials")}
                    disabled={isSaving === "financials"}
                    className="bg-emerald-600 text-white text-xl px-10 py-2 rounded-xl transition-all hover:bg-emerald-700"
                  >
                    {isSaving === "financials" ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="bg-red-500 text-white text-xl px-10 py-2 rounded-xl transition-all hover:bg-red-600"
                    onClick={handleEditCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-2 sm:gap-y-6 sm:gap-x-10 lg:grid-cols-1">
                {/* Tax Percentage */}
                <div>
                  <label className={normalLabel}>Tax Percentage</label>
                  <p className={previewP}>{shop.financials.taxPercentage}</p>
                </div>
                {/* Service Fee */}
                <div>
                  <label className={normalLabel}>Service Fee</label>
                  {shop.financials.feeType === "flat" ? (
                    <p className={previewP}>${shop.financials.feeValue}</p>
                  ) : (
                    <p className={previewP}>{shop.financials.feeValue}%</p>
                  )}
                </div>
                {/* Taxed Services */}
                <div className="grid grid-cols-2 gap-10 sm:col-span-2 lg:col-span-1">
                  {/* Delivery Taxed */}
                  <div>
                    {shop.financials.deliveryTaxed ? (
                      <label className="text-emerald-600 text-xl">
                        Delivery<br/> Taxed
                      </label>
                    ) : (
                      <label className="text-red-600 text-xl">
                        Delivery<br/> Not Taxed
                      </label>
                    )}
                  </div>
                  {/* Fee Taxed */}
                  <div>
                    {shop.financials.feeTaxed ? (
                      <label className="text-emerald-600 text-xl">
                        Fee<br/> Taxed
                      </label>
                    ) : (
                      <label className="text-red-600 text-xl">
                        Fee<br/> Not Taxed
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Public Profile Section */}
          <div className={normalSection}>
            {/* Header */}
            <div>
              <h2 className={normalH2}>Public Profile</h2>
              <button
                onClick={() => handleEditClick("branding")}
                className={
                  (activeSection === "branding" ? "hidden" : "block") +
                  " absolute top-2 right-2"
                }
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
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </button>
            </div>
            {activeSection === "branding" ? (
              <div className="grid grid-cols-1 gap-4 text-center md:grid-cols-2 lg:grid-cols-1">
                {/* Shop Logo / Photo */}
                <div>
                  <label className={normalLabel}>Shop Logo / Photo</label>
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="border-4 border-dashed border-purple-300 rounded-3xl h-64 flex flex-col items-center justify-center bg-white cursor-pointer hover:border-purple-500 transition"
                  >
                    {shop.branding.logo ? (
                      <img
                        src={shop.branding.logo}
                        alt="Logo"
                        className="max-h-full rounded-2xl"
                      />
                    ) : (
                      <>
                        <svg
                          className="w-16 h-16 text-purple-600 mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-2xl font-bold text-purple-600">
                          {uploadingImg ? "Uploading..." : "Click to upload logo"}
                        </p>
                        <p className="text-lg text-gray-600">
                          Square image recommended
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleLogoUpload(file);
                      }
                    }}
                  />
                </div>
                {/* Shop Bio */}
                <div>
                  <label className={normalLabel}>
                    Shop Bio (2-3 sentences)
                  </label>
                  <textarea
                    name="bio"
                    placeholder="Add your bio here..."
                    value={shop.branding.bio}
                    onChange={(e) => updateBranding("bio", e.target.value)}
                    className="w-full border-4 rounded-md px-2 py-1 h-24 md:h-40"
                  ></textarea>
                </div>
                {/* Social Links */}
                <div className="flex flex-col gap-4 items-start sm:gap-2 pb-4 md:pb-0 lg:pb-4 xl:pb-0">
                  {/* Facebook */}
                  <div className="w-full">
                    {showFB ? (
                      <div className="w-full flex flex-col items-center gap-2 sm:flex-row">
                        <div className="w-full flex gap-2 items-center sm:gap-1">
                          <div className="w-10 h-10 p-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="32"
                              height="32"
                              viewBox="0 0 32 32"
                              className="bg-[#0866FF] rounded-full"
                            >
                              <path
                                fill="white"
                                d="M16,2c-7.732,0-14,6.268-14,14,0,6.566,4.52,12.075,10.618,13.588v-9.31h-2.887v-4.278h2.887v-1.843c0-4.765,2.156-6.974,6.835-6.974,.887,0,2.417,.174,3.043,.348v3.878c-.33-.035-.904-.052-1.617-.052-2.296,0-3.183,.87-3.183,3.13v1.513h4.573l-.786,4.278h-3.787v9.619c6.932-.837,12.304-6.74,12.304-13.897,0-7.732-6.268-14-14-14Z"
                              />
                            </svg>
                          </div>
                          <input
                            type="text"
                            name="facebook"
                            placeholder="https://www.facebook.com/flower-shop"
                            value={shop.branding.socialLinks.facebook}
                            onChange={(e) =>
                              updateSocials("facebook", e.target.value)
                            }
                            className="px-2 py-1 border-2 rounded-xl w-full text-center sm:text-sm"
                          />
                        </div>
                        <div className="w-full flex gap-4 justify-center sm:w-auto sm:gap-3">
                          <button
                            type="button"
                            onClick={() => setShowFB(false)}
                            className="w-full flex"
                          >
                            <span className="hidden text-red-500 hover:text-red-600 text-lg sm:block">X</span>
                            <span 
                              className="text-red-500 bg-transparent border border-red-500 hover:bg-red-600 hover:border-none transition-all px-4 py-1 rounded-md w-full sm:hidden"
                            >
                              Cancel Edit
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setShop((prev) => ({
                                ...prev,
                                branding: {
                                  ...prev.branding,
                                  socialLinks: {
                                    ...prev.branding.socialLinks,
                                    facebook: "",
                                  },
                                },
                              }));
                            }}
                            className="w-full flex"
                          >
                            <span className="hidden sm:block">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 text-red-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </span>
                            <span 
                              className="text-white bg-red-500 hover:bg-red-600 transition-all px-4 py-1 rounded-md border border-red-500 hover:border-red-600 w-full sm:hidden"
                            >
                              Remove
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 sm:flex-row md:flex-col md:gap-1 xl:flex-row xl:gap-2 xl:justify-between">
                        <div className="flex items-center gap-2 sm:w-full md:w-auto">
                          <div className="w-10 h-10 p-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 32 32"
                        className="bg-[#0866FF] rounded-full"
                      >
                        <path
                          fill="white"
                          d="M16,2c-7.732,0-14,6.268-14,14,0,6.566,4.52,12.075,10.618,13.588v-9.31h-2.887v-4.278h2.887v-1.843c0-4.765,2.156-6.974,6.835-6.974,.887,0,2.417,.174,3.043,.348v3.878c-.33-.035-.904-.052-1.617-.052-2.296,0-3.183,.87-3.183,3.13v1.513h4.573l-.786,4.278h-3.787v9.619c6.932-.837,12.304-6.74,12.304-13.897,0-7.732-6.268-14-14-14Z"
                        />
                      </svg>
                          </div>
                          <p className="text-black opacity-75 font-semibold md:text-sm">
                          {shop.branding.socialLinks.facebook ? shop.branding.socialLinks.facebook : "Add Your Facebook Profile!"}
                          </p>
                        </div>
                        <div className="w-full sm:w-auto md:w-full xl:w-auto">
                          <button
                            type="button"
                            onClick={() => setShowFB(true)}
                            className="uppercase font-medium bg-emerald-500 hover:bg-emerald-700 transition-colors text-white w-full py-1 rounded-md sm:w-auto sm:px-2 md:w-full md:px-0 xl:px-2"
                          >
                            {shop.branding.socialLinks.facebook ? "Edit" : "Add"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Instagram */}
                  <div className="w-full">
                    {showInsta ? (
                      <div className="w-full flex flex-cl items-center gap-2 sm:flex-row">
                        <div className="w-full flex gap-2 items-center sm:gap-1">
                          <div className="w-10 h-10 p-1">
                            <svg
                              xmlns="http://www.w3.org"
                              width="30"
                              height="30"
                              viewBox="0 0 32 32"
                              className="rounded-lg"
                            >
                              <defs>
                                <linearGradient
                                  id="instagram-gradient"
                                  x1="0%"
                                  y1="100%"
                                  x2="100%"
                                  y2="0%"
                                >
                                  <stop offset="0%" stopColor="#f9ce34" />
                                  <stop offset="50%" stopColor="#ee2a7b" />
                                  <stop offset="100%" stopColor="#6228d7" />
                                </linearGradient>
                              </defs>

                              {/* The Background Square */}
                              <rect
                                width="32"
                                height="32"
                                rx="8"
                                fill="url(#instagram-gradient)"
                              />

                              {/* The White Instagram Path */}
                              <path
                                fill="white"
                                d="M10.202,2.098c-1.49,.07-2.507,.308-3.396,.657-.92,.359-1.7,.84-2.477,1.619-.776,.779-1.254,1.56-1.61,2.481-.345,.891-.578,1.909-.644,3.4-.066,1.49-.08,1.97-.073,5.771s.024,4.278,.096,5.772c.071,1.489,.308,2.506,.657,3.396,.359,.92,.84,1.7,1.619,2.477,.779,.776,1.559,1.253,2.483,1.61,.89,.344,1.909,.579,3.399,.644,1.49,.065,1.97,.08,5.771,.073,3.801-.007,4.279-.024,5.773-.095s2.505-.309,3.395-.657c.92-.36,1.701-.84,2.477-1.62s1.254-1.561,1.609-2.483c.345-.89,.579-1.909,.644-3.398,.065-1.494,.081-1.971,.073-5.773s-.024-4.278-.095-5.771-.308-2.507-.657-3.397c-.36-.92-.84-1.7-1.619-2.477s-1.561-1.254-2.483-1.609c-.891-.345-1.909-.58-3.399-.644s-1.97-.081-5.772-.074-4.278,.024-5.771,.096m.164,25.309c-1.365-.059-2.106-.286-2.6-.476-.654-.252-1.12-.557-1.612-1.044s-.795-.955-1.05-1.608c-.192-.494-.423-1.234-.487-2.599-.069-1.475-.084-1.918-.092-5.656s.006-4.18,.071-5.656c.058-1.364,.286-2.106,.476-2.6,.252-.655,.556-1.12,1.044-1.612s.955-.795,1.608-1.05c.493-.193,1.234-.422,2.598-.487,1.476-.07,1.919-.084,5.656-.092,3.737-.008,4.181,.006,5.658,.071,1.364,.059,2.106,.285,2.599,.476,.654,.252,1.12,.555,1.612,1.044s.795,.954,1.051,1.609c.193,.492,.422,1.232,.486,2.597,.07,1.476,.086,1.919,.093,5.656,.007,3.737-.006,4.181-.071,5.656-.06,1.365-.286,2.106-.476,2.601-.252,.654-.556,1.12-1.045,1.612s-.955,.795-1.608,1.05c-.493,.192-1.234,.422-2.597,.487-1.476,.069-1.919,.084-5.657,.092s-4.18-.007-5.656-.071M21.779,8.517c.002,.928,.755,1.679,1.683,1.677s1.679-.755,1.677-1.683c-.002-.928-.755-1.679-1.683-1.677,0,0,0,0,0,0-.928,.002-1.678,.755-1.677,1.683m-12.967,7.496c.008,3.97,3.232,7.182,7.202,7.174s7.183-3.232,7.176-7.202c-.008-3.97-3.233-7.183-7.203-7.175s-7.182,3.233-7.174,7.203m2.522-.005c-.005-2.577,2.08-4.671,4.658-4.676,2.577-.005,4.671,2.08,4.676,4.658,.005,2.577-2.08,4.671-4.658,4.676-2.577,.005,4.671-2.079-4.676-4.656h0"
                              />
                            </svg>
                          </div>
                          <input
                            type="text"
                            name="instagram"
                            placeholder="https://www.instagram.com/flower-shop"
                            value={shop.branding.socialLinks.instagram}
                            onChange={(e) =>
                              updateSocials("instagram", e.target.value)
                            }
                            className="px-2 py-1 border-2 rounded-xl w-full text-center sm:text-sm"
                          />
                        </div>
                        <div className="w-full flex gap-4 justify-center sm:w-auto sm:gap-3">
                          <button
                            type="button"
                            onClick={() => setShowInsta(false)}
                            className="w-full flex"
                          >
                            <span className="hidden text-red-500 hover:text-red-600 text-lg sm:block">X</span>
                            <span 
                              className="text-red-500 bg-transparent border border-red-500 hover:bg-red-600 hover:border-none transition-all px-4 py-1 rounded-md w-full sm:hidden"
                            >
                              Cancel Edit
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setShop((prev) => ({
                                ...prev,
                                branding: {
                                  ...prev.branding,
                                  socialLinks: {
                                    ...prev.branding.socialLinks,
                                    instagram: "",
                                  },
                                },
                              }));
                            }}
                            className="w-full flex"
                          >
                            <span className="hidden sm:block">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 text-red-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </span>
                            <span 
                              className="text-white bg-red-500 hover:bg-red-600 transition-all px-4 py-1 rounded-md border border-red-500 hover:border-red-600 w-full sm:hidden"
                            >
                              Remove
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 sm:flex-row md:flex-col md:gap-1 xl:flex-row xl:gap-2 xl:justify-between">
                        <div className="flex items-center gap-2 sm:w-full md:w-auto">
                          <div className="w-10 h-10 p-1">
                            <svg
                              xmlns="http://www.w3.org"
                              width="30"
                              height="30"
                              viewBox="0 0 32 32"
                              className="rounded-lg"
                            >
                              <defs>
                                <linearGradient
                                  id="instagram-gradient"
                                  x1="0%"
                                  y1="100%"
                                  x2="100%"
                                  y2="0%"
                                >
                                  <stop offset="0%" stopColor="#f9ce34" />
                                  <stop offset="50%" stopColor="#ee2a7b" />
                                  <stop offset="100%" stopColor="#6228d7" />
                                </linearGradient>
                              </defs>

                              {/* The Background Square */}
                              <rect
                                width="32"
                                height="32"
                                rx="8"
                                fill="url(#instagram-gradient)"
                              />

                              {/* The White Instagram Path */}
                              <path
                                fill="white"
                                d="M10.202,2.098c-1.49,.07-2.507,.308-3.396,.657-.92,.359-1.7,.84-2.477,1.619-.776,.779-1.254,1.56-1.61,2.481-.345,.891-.578,1.909-.644,3.4-.066,1.49-.08,1.97-.073,5.771s.024,4.278,.096,5.772c.071,1.489,.308,2.506,.657,3.396,.359,.92,.84,1.7,1.619,2.477,.779,.776,1.559,1.253,2.483,1.61,.89,.344,1.909,.579,3.399,.644,1.49,.065,1.97,.08,5.771,.073,3.801-.007,4.279-.024,5.773-.095s2.505-.309,3.395-.657c.92-.36,1.701-.84,2.477-1.62s1.254-1.561,1.609-2.483c.345-.89,.579-1.909,.644-3.398,.065-1.494,.081-1.971,.073-5.773s-.024-4.278-.095-5.771-.308-2.507-.657-3.397c-.36-.92-.84-1.7-1.619-2.477s-1.561-1.254-2.483-1.609c-.891-.345-1.909-.58-3.399-.644s-1.97-.081-5.772-.074-4.278,.024-5.771,.096m.164,25.309c-1.365-.059-2.106-.286-2.6-.476-.654-.252-1.12-.557-1.612-1.044s-.795-.955-1.05-1.608c-.192-.494-.423-1.234-.487-2.599-.069-1.475-.084-1.918-.092-5.656s.006-4.18,.071-5.656c.058-1.364,.286-2.106,.476-2.6,.252-.655,.556-1.12,1.044-1.612s.955-.795,1.608-1.05c.493-.193,1.234-.422,2.598-.487,1.476-.07,1.919-.084,5.656-.092,3.737-.008,4.181,.006,5.658,.071,1.364,.059,2.106,.285,2.599,.476,.654,.252,1.12,.555,1.612,1.044s.795,.954,1.051,1.609c.193,.492,.422,1.232,.486,2.597,.07,1.476,.086,1.919,.093,5.656,.007,3.737-.006,4.181-.071,5.656-.06,1.365-.286,2.106-.476,2.601-.252,.654-.556,1.12-1.045,1.612s-.955,.795-1.608,1.05c-.493,.192-1.234,.422-2.597,.487-1.476,.069-1.919,.084-5.657,.092s-4.18-.007-5.656-.071M21.779,8.517c.002,.928,.755,1.679,1.683,1.677s1.679-.755,1.677-1.683c-.002-.928-.755-1.679-1.683-1.677,0,0,0,0,0,0-.928,.002-1.678,.755-1.677,1.683m-12.967,7.496c.008,3.97,3.232,7.182,7.202,7.174s7.183-3.232,7.176-7.202c-.008-3.97-3.233-7.183-7.203-7.175s-7.182,3.233-7.174,7.203m2.522-.005c-.005-2.577,2.08-4.671,4.658-4.676,2.577-.005,4.671,2.08,4.676,4.658,.005,2.577-2.08,4.671-4.658,4.676-2.577,.005,4.671-2.079-4.676-4.656h0"
                              />
                            </svg>
                          </div>
                          <p className="text-black opacity-75 font-semibold md:text-sm">
                            {shop.branding.socialLinks.instagram ? shop.branding.socialLinks.instagram : "Add Your Instagram Profile!"}
                          </p>
                        </div>
                        <div className="w-full sm:w-auto md:w-full xl:w-auto">
                          <button
                            type="button"
                            onClick={() => setShowInsta(true)}
                            className="uppercase font-medium bg-emerald-500 hover:bg-emerald-700 transition-colors text-white w-full py-1 rounded-md sm:w-auto sm:px-2 md:w-full md:px-0 xl:px-2"
                          >
                            {shop.branding.socialLinks.instagram ? "Edit" : "Add"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Pinterest */}
                  <div className="w-full">
                    {showPin ? (
                      <div className="w-full flex flex-cl items-center gap-2 sm:flex-row">
                        <div className="w-full flex gap-2 items-center sm:gap-1">
                          <div className="w-10 h-10 p-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="32"
                              height="32"
                              viewBox="0 0 32 32"
                              className="bg-[#BD081C] rounded-full w-full"
                            >
                              <path
                                fill="white"
                                d="M16,2C8.268,2,2,8.268,2,16c0,5.931,3.69,11.001,8.898,13.041-.122-1.108-.233-2.811,.049-4.02,.254-1.093,1.642-6.959,1.642-6.959,0,0-.419-.839-.419-2.079,0-1.947,1.128-3.4,2.533-3.4,1.194,0,1.771,.897,1.771,1.972,0,1.201-.765,2.997-1.16,4.661-.33,1.393,.699,2.53,2.073,2.53,2.488,0,4.401-2.624,4.401-6.411,0-3.352-2.409-5.696-5.848-5.696-3.983,0-6.322,2.988-6.322,6.076,0,1.203,.464,2.494,1.042,3.195,.114,.139,.131,.26,.097,.402-.106,.442-.342,1.393-.389,1.588-.061,.256-.203,.311-.468,.187-1.749-.814-2.842-3.37-2.842-5.424,0-4.416,3.209-8.472,9.25-8.472,4.857,0,8.631,3.461,8.631,8.086,0,4.825-3.042,8.708-7.265,8.708-1.419,0-2.752-.737-3.209-1.608,0,0-.702,2.673-.872,3.328-.316,1.216-1.169,2.74-1.74,3.67,1.31,.406,2.702,.624,4.145,.624,7.732,0,14-6.268,14-14S23.732,2,16,2Z"
                              />
                            </svg>
                          </div>
                          <input
                            type="text"
                            name="pinterest"
                            placeholder="https://www.pinterest.com/flower-shop"
                            value={shop.branding.socialLinks.pinterest}
                            onChange={(e) =>
                              updateSocials("pinterest", e.target.value)
                            }
                            className="px-2 py-1 border-2 rounded-xl w-full text-center sm:text-sm"
                          />
                        </div>
                        <div className="w-full flex gap-4 justify-center sm:w-auto sm:gap-3">
                          <button
                            type="button"
                            onClick={() => setShowPin(false)}
                            className="w-full flex"
                          >
                            <span className="hidden text-red-500 hover:text-red-600 text-lg sm:block">X</span>
                            <span 
                              className="text-red-500 bg-transparent border border-red-500 hover:bg-red-600 hover:border-none transition-all px-4 py-1 rounded-md w-full sm:hidden"
                            >
                              Cancel Edit
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setShop((prev) => ({
                                ...prev,
                                branding: {
                                  ...prev.branding,
                                  socialLinks: {
                                    ...prev.branding.socialLinks,
                                    pinterest: "",
                                  },
                                },
                              }));
                            }}
                            className="w-full flex"
                          >
                            <span className="hidden sm:block">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 text-red-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </span>
                            <span 
                              className="text-white bg-red-500 hover:bg-red-600 transition-all px-4 py-1 rounded-md border border-red-500 hover:border-red-600 w-full sm:hidden"
                            >
                              Remove
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 sm:flex-row md:flex-col md:gap-1 xl:flex-row xl:gap-2 xl:justify-between">
                        <div className="flex items-center gap-2 sm:w-full md:w-auto">
                          <div className="w-10 h-10 p-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="32"
                              height="32"
                              viewBox="0 0 32 32"
                              className="bg-[#BD081C] rounded-full w-full"
                            >
                              <path
                                fill="white"
                                d="M16,2C8.268,2,2,8.268,2,16c0,5.931,3.69,11.001,8.898,13.041-.122-1.108-.233-2.811,.049-4.02,.254-1.093,1.642-6.959,1.642-6.959,0,0-.419-.839-.419-2.079,0-1.947,1.128-3.4,2.533-3.4,1.194,0,1.771,.897,1.771,1.972,0,1.201-.765,2.997-1.16,4.661-.33,1.393,.699,2.53,2.073,2.53,2.488,0,4.401-2.624,4.401-6.411,0-3.352-2.409-5.696-5.848-5.696-3.983,0-6.322,2.988-6.322,6.076,0,1.203,.464,2.494,1.042,3.195,.114,.139,.131,.26,.097,.402-.106,.442-.342,1.393-.389,1.588-.061,.256-.203,.311-.468,.187-1.749-.814-2.842-3.37-2.842-5.424,0-4.416,3.209-8.472,9.25-8.472,4.857,0,8.631,3.461,8.631,8.086,0,4.825-3.042,8.708-7.265,8.708-1.419,0-2.752-.737-3.209-1.608,0,0-.702,2.673-.872,3.328-.316,1.216-1.169,2.74-1.74,3.67,1.31,.406,2.702,.624,4.145,.624,7.732,0,14-6.268,14-14S23.732,2,16,2Z"
                              />
                            </svg>
                          </div>
                          <p className="text-black opacity-75 font-semibold md:text-sm">
                            {shop.branding.socialLinks.pinterest ? shop.branding.socialLinks.pinterest : "Add Your Pinterest Profile!"}
                          </p>
                        </div>
                        <div className="w-full sm:w-auto md:w-full xl:w-auto">
                          <button
                            type="button"
                            onClick={() => setShowPin(true)}
                            className="uppercase font-medium bg-emerald-500 hover:bg-emerald-700 transition-colors text-white w-full py-1 rounded-md sm:w-auto sm:px-2 md:w-full md:px-0 xl:px-2"
                          >
                            {shop.branding.socialLinks.pinterest ? "Edit" : "Add"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* TikTok */}
                  <div className="w-full">
                    {showTik ? (
                      <div className="w-full flex flex-cl items-center gap-2 sm:flex-row">
                        <div className="w-full flex gap-2 items-center sm:gap-1">
                          <div className="w-10 h-10 p-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="32"
                              height="32"
                              viewBox="0 0 32 32"
                              className="w-full"
                            >
                              <path d="M24.562,7.613c-1.508-.983-2.597-2.557-2.936-4.391-.073-.396-.114-.804-.114-1.221h-4.814l-.008,19.292c-.081,2.16-1.859,3.894-4.039,3.894-.677,0-1.315-.169-1.877-.465-1.288-.678-2.169-2.028-2.169-3.582,0-2.231,1.815-4.047,4.046-4.047,.417,0,.816,.069,1.194,.187v-4.914c-.391-.053-.788-.087-1.194-.087-4.886,0-8.86,3.975-8.86,8.86,0,2.998,1.498,5.65,3.783,7.254,1.439,1.01,3.19,1.606,5.078,1.606,4.886,0,8.86-3.975,8.86-8.86V11.357c1.888,1.355,4.201,2.154,6.697,2.154v-4.814c-1.345,0-2.597-.4-3.647-1.085Z"></path>
                            </svg>
                          </div>
                          <input
                            type="text"
                            name="tiktok"
                            placeholder="https://www.tiktok.com/flower-shop"
                            value={shop.branding.socialLinks.tiktok}
                            onChange={(e) =>
                              updateSocials("tiktok", e.target.value)
                            }
                            className="px-2 py-1 border-2 rounded-xl w-full text-center sm:text-sm"
                          />
                        </div>
                        <div className="w-full flex gap-4 justify-center sm:w-auto sm:gap-3">
                          <button
                            type="button"
                            onClick={() => setShowTik(false)}
                            className="w-full flex"
                          >
                            <span className="hidden text-red-500 hover:text-red-600 text-lg sm:block">X</span>
                            <span 
                              className="text-red-500 bg-transparent border border-red-500 hover:bg-red-600 hover:border-none transition-all px-4 py-1 rounded-md w-full sm:hidden"
                            >
                              Cancel Edit
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              setShop((prev) => ({
                                ...prev,
                                branding: {
                                  ...prev.branding,
                                  socialLinks: {
                                    ...prev.branding.socialLinks,
                                    tiktok: "",
                                  },
                                },
                              }));
                            }}
                            className="w-full flex"
                          >
                             <span className="hidden sm:block">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 text-red-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </span>
                            <span 
                              className="text-white bg-red-500 hover:bg-red-600 transition-all px-4 py-1 rounded-md border border-red-500 hover:border-red-600 w-full sm:hidden"
                            >
                              Remove
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 sm:flex-row md:flex-col md:gap-1 xl:flex-row xl:gap-2 xl:justify-between">
                        <div className="flex items-center gap-2 sm:w-full md:w-auto">
                          <div className="w-10 h-10 p-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="32"
                              height="32"
                              viewBox="0 0 32 32"
                              className="w-full"
                            >
                              <path d="M24.562,7.613c-1.508-.983-2.597-2.557-2.936-4.391-.073-.396-.114-.804-.114-1.221h-4.814l-.008,19.292c-.081,2.16-1.859,3.894-4.039,3.894-.677,0-1.315-.169-1.877-.465-1.288-.678-2.169-2.028-2.169-3.582,0-2.231,1.815-4.047,4.046-4.047,.417,0,.816,.069,1.194,.187v-4.914c-.391-.053-.788-.087-1.194-.087-4.886,0-8.86,3.975-8.86,8.86,0,2.998,1.498,5.65,3.783,7.254,1.439,1.01,3.19,1.606,5.078,1.606,4.886,0,8.86-3.975,8.86-8.86V11.357c1.888,1.355,4.201,2.154,6.697,2.154v-4.814c-1.345,0-2.597-.4-3.647-1.085Z"></path>
                            </svg>
                          </div>
                          <p className="text-black opacity-75 font-semibold md:text-sm">
                            {shop.branding.socialLinks.tiktok ? shop.branding.socialLinks.tiktok : "Add Your TikTok Profile!"}
                          </p>
                        </div>
                        <div className="w-full sm:w-auto md:w-full xl:w-auto">
                          <button
                            type="button"
                            onClick={() => setShowTik(true)}
                            className="uppercase font-medium bg-emerald-500 hover:bg-emerald-700 transition-colors text-white w-full py-1 rounded-md sm:w-auto sm:px-2 md:w-full md:px-0 xl:px-2"
                          >
                            {shop.branding.socialLinks.tiktok ? "Edit" : "Add"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Buttons */}
                <div className="flex flex-col gap-4 md:self-end lg:flex-row lg:justify-center">
                  <button
                    onClick={() => handleSave("branding")}
                    disabled={isSaving === "branding"}
                    className="bg-emerald-600 text-white text-xl px-10 py-2 rounded-xl transition-all hover:bg-emerald-700"
                  >
                    {isSaving === "branding" ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="bg-red-500 text-white text-xl px-10 py-2 rounded-xl transition-all hover:bg-red-600"
                    onClick={handleEditCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 text-center">
                {/* SHop Logo / photo */}
                {shop.branding?.logo ? (
                  <div className="mx-auto">
                    <label className={normalLabel}>Shop Logo / Photo</label>
                    <div className="w-72 h-72 border-4 border-purple-400 rounded-xl p-2 flex justify-center bg-white">
                      <img
                        src={shop.branding?.logo}
                        alt="Logo"
                        className="object-fill"
                      />
                    </div>
                  </div>
                ) : (
                  <p>No Logo or Shop photo added yet!</p>
                )}
                {/* Shop Bio */}
                {shop.branding?.bio ? (
                  <div className="pb-4 border-b border-opacity-75">
                    <label className={normalLabel}>Shop Bio</label>
                    <p className="font-semibold sm:text-lg sm:max-w-lg">{shop.branding.bio}</p>
                  </div>
                ) : (
                  <p>No Bio set yet!</p>
                )}
                {/* Socials */}
                {shop.branding?.socialLinks ? (
                  <div className="grid grid-cols-1 gap-4">
                    {shop.branding.socialLinks.facebook ? (
                      <div className="flex items-center justify-center gap-4 pb-4 border-b-2 border-opacity-75">
                        <div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 32 32"
                            className="bg-[#0866FF] rounded-full"
                          >
                            <path
                              fill="white"
                              d="M16,2c-7.732,0-14,6.268-14,14,0,6.566,4.52,12.075,10.618,13.588v-9.31h-2.887v-4.278h2.887v-1.843c0-4.765,2.156-6.974,6.835-6.974,.887,0,2.417,.174,3.043,.348v3.878c-.33-.035-.904-.052-1.617-.052-2.296,0-3.183,.87-3.183,3.13v1.513h4.573l-.786,4.278h-3.787v9.619c6.932-.837,12.304-6.74,12.304-13.897,0-7.732-6.268-14-14-14Z"
                            />
                          </svg>
                        </div>
                        <a href={shop.branding.socialLinks.facebook} target="_blank" className="font-medium">{shop.branding.socialLinks.facebook}</a>
                      </div>
                    ) : (
                      <p className="font-medium text-red-500">No Facebook link set up yet!</p>
                    )}
                    {shop.branding.socialLinks.instagram ? (
                      <div className="flex items-center justify-center gap-4 pb-4 border-b-2 border-opacity-75">
                        <div>
                          <svg
                            xmlns="http://www.w3.org"
                            width="42"
                            height="42"
                            viewBox="0 0 32 32"
                            className="rounded-lg p-1.5"
                          >
                            <defs>
                              <linearGradient
                                id="instagram-gradient"
                                x1="0%"
                                y1="100%"
                                x2="100%"
                                y2="0%"
                              >
                                <stop offset="0%" stopColor="#f9ce34" />
                                <stop offset="50%" stopColor="#ee2a7b" />
                                <stop offset="100%" stopColor="#6228d7" />
                              </linearGradient>
                            </defs>

                            {/* The Background Square */}
                            <rect
                              width="32"
                              height="32"
                              rx="8"
                              fill="url(#instagram-gradient)"
                            />

                            {/* The White Instagram Path */}
                            <path
                              fill="white"
                              d="M10.202,2.098c-1.49,.07-2.507,.308-3.396,.657-.92,.359-1.7,.84-2.477,1.619-.776,.779-1.254,1.56-1.61,2.481-.345,.891-.578,1.909-.644,3.4-.066,1.49-.08,1.97-.073,5.771s.024,4.278,.096,5.772c.071,1.489,.308,2.506,.657,3.396,.359,.92,.84,1.7,1.619,2.477,.779,.776,1.559,1.253,2.483,1.61,.89,.344,1.909,.579,3.399,.644,1.49,.065,1.97,.08,5.771,.073,3.801-.007,4.279-.024,5.773-.095s2.505-.309,3.395-.657c.92-.36,1.701-.84,2.477-1.62s1.254-1.561,1.609-2.483c.345-.89,.579-1.909,.644-3.398,.065-1.494,.081-1.971,.073-5.773s-.024-4.278-.095-5.771-.308-2.507-.657-3.397c-.36-.92-.84-1.7-1.619-2.477s-1.561-1.254-2.483-1.609c-.891-.345-1.909-.58-3.399-.644s-1.97-.081-5.772-.074-4.278,.024-5.771,.096m.164,25.309c-1.365-.059-2.106-.286-2.6-.476-.654-.252-1.12-.557-1.612-1.044s-.795-.955-1.05-1.608c-.192-.494-.423-1.234-.487-2.599-.069-1.475-.084-1.918-.092-5.656s.006-4.18,.071-5.656c.058-1.364,.286-2.106,.476-2.6,.252-.655,.556-1.12,1.044-1.612s.955-.795,1.608-1.05c.493-.193,1.234-.422,2.598-.487,1.476-.07,1.919-.084,5.656-.092,3.737-.008,4.181,.006,5.658,.071,1.364,.059,2.106,.285,2.599,.476,.654,.252,1.12,.555,1.612,1.044s.795,.954,1.051,1.609c.193,.492,.422,1.232,.486,2.597,.07,1.476,.086,1.919,.093,5.656,.007,3.737-.006,4.181-.071,5.656-.06,1.365-.286,2.106-.476,2.601-.252,.654-.556,1.12-1.045,1.612s-.955,.795-1.608,1.05c-.493,.192-1.234,.422-2.597,.487-1.476,.069-1.919,.084-5.657,.092s-4.18-.007-5.656-.071M21.779,8.517c.002,.928,.755,1.679,1.683,1.677s1.679-.755,1.677-1.683c-.002-.928-.755-1.679-1.683-1.677,0,0,0,0,0,0-.928,.002-1.678,.755-1.677,1.683m-12.967,7.496c.008,3.97,3.232,7.182,7.202,7.174s7.183-3.232,7.176-7.202c-.008-3.97-3.233-7.183-7.203-7.175s-7.182,3.233-7.174,7.203m2.522-.005c-.005-2.577,2.08-4.671,4.658-4.676,2.577-.005,4.671,2.08,4.676,4.658,.005,2.577-2.08,4.671-4.658,4.676-2.577,.005,4.671-2.079-4.676-4.656h0"
                            />
                          </svg>
                        </div>
                        <a href={shop.branding.socialLinks.instagram} target="_blank" className="font-medium">{shop.branding.socialLinks.instagram}</a>
                      </div>
                    ) : (
                      <p className="font-medium text-red-500">No Instagram link set up yet!</p>
                    )}
                    {shop.branding.socialLinks.pinterest ? (
                      <div className="flex items-center justify-center gap-4 pb-4 border-b-2 border-opacity-75">
                        <div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 32 32"
                            className="bg-[#BD081C] rounded-full"
                          >
                            <path
                              fill="white"
                              d="M16,2C8.268,2,2,8.268,2,16c0,5.931,3.69,11.001,8.898,13.041-.122-1.108-.233-2.811,.049-4.02,.254-1.093,1.642-6.959,1.642-6.959,0,0-.419-.839-.419-2.079,0-1.947,1.128-3.4,2.533-3.4,1.194,0,1.771,.897,1.771,1.972,0,1.201-.765,2.997-1.16,4.661-.33,1.393,.699,2.53,2.073,2.53,2.488,0,4.401-2.624,4.401-6.411,0-3.352-2.409-5.696-5.848-5.696-3.983,0-6.322,2.988-6.322,6.076,0,1.203,.464,2.494,1.042,3.195,.114,.139,.131,.26,.097,.402-.106,.442-.342,1.393-.389,1.588-.061,.256-.203,.311-.468,.187-1.749-.814-2.842-3.37-2.842-5.424,0-4.416,3.209-8.472,9.25-8.472,4.857,0,8.631,3.461,8.631,8.086,0,4.825-3.042,8.708-7.265,8.708-1.419,0-2.752-.737-3.209-1.608,0,0-.702,2.673-.872,3.328-.316,1.216-1.169,2.74-1.74,3.67,1.31,.406,2.702,.624,4.145,.624,7.732,0,14-6.268,14-14S23.732,2,16,2Z"
                            />
                          </svg>
                        </div>
                        <a href={shop.branding.socialLinks.pinterest} target="_blank" className="font-medium">{shop.branding.socialLinks.pinterest}</a>
                      </div>
                    ) : (
                      <p className="font-medium text-red-500">No Pinterest link set up yet!</p>
                    )}
                    {shop.branding.socialLinks.tiktok ? (
                      <div className="flex items-center justify-center gap-4">
                        <div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 32 32"
                          >
                            <path d="M24.562,7.613c-1.508-.983-2.597-2.557-2.936-4.391-.073-.396-.114-.804-.114-1.221h-4.814l-.008,19.292c-.081,2.16-1.859,3.894-4.039,3.894-.677,0-1.315-.169-1.877-.465-1.288-.678-2.169-2.028-2.169-3.582,0-2.231,1.815-4.047,4.046-4.047,.417,0,.816,.069,1.194,.187v-4.914c-.391-.053-.788-.087-1.194-.087-4.886,0-8.86,3.975-8.86,8.86,0,2.998,1.498,5.65,3.783,7.254,1.439,1.01,3.19,1.606,5.078,1.606,4.886,0,8.86-3.975,8.86-8.86V11.357c1.888,1.355,4.201,2.154,6.697,2.154v-4.814c-1.345,0-2.597-.4-3.647-1.085Z"></path>
                          </svg>
                        </div>
                        <a href={shop.branding.socialLinks.tiktok} target="_blank" className="font-medium">{shop.branding.socialLinks.tiktok}</a>
                      </div>
                    ) : (
                      <p className="font-medium text-red-500">No TikTok link set up yet!</p>
                    )}
                  </div>
                ) : (
                  <p>No social links set yet!</p>
                )}
              </div>
            )}
          </div>

          {/* Featured Bouquet */}
          <div className={normalSection}>
            {/* Header */}
            <div>
              <h2 className={normalH2}>Featured Bouquet</h2>
              <button
                onClick={() => handleEditClick("featuredBouquet")}
                className={
                  (activeSection === "featuredBouquet" ? "hidden" : "block") +
                  " absolute top-2 right-2"
                }
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
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </button>
            </div>
            {activeSection === "featuredBouquet" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-center lg:grid-cols-1">
                {/* Bouquet Name */}
                <div>
                  <label className={normalLabel}>Bouquet Name</label>
                  <input
                    type="text"
                    value={shop.featuredBouquet.name}
                    onChange={(e) => updateBouquet("name", e.target.value)}
                    className={normalInput}
                  />
                </div>
                {/* Bouquet Price */}
                <div>
                  <label className={normalLabel}>Bouquet Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="$0.00"
                    value={shop.featuredBouquet.price}
                    onChange={(e) => updateBouquet("price", e.target.value)}
                    onBlur={handlePriceBlur}
                    className={normalInput}
                  />
                </div>
                {/* Bouquet Description */}
                <div>
                  <label className={normalLabel}>Bouquet Description</label>
                  <textarea
                    placeholder="12 Roses vased..."
                    value={shop.featuredBouquet.description}
                    onChange={(e) =>
                      updateBouquet("description", e.target.value)
                    }
                    className="w-full border-4 rounded-md px-2 py-1 md:h-40"
                  ></textarea>
                </div>
                {/* Bouquet Image */}
                <div>
                  <label className={normalLabel}>Bouquet Image</label>
                  <div
                    onClick={() => bouquetInputRef.current?.click()}
                    className="border-4 border-dashed border-purple-300 rounded-3xl h-64 flex flex-col items-center justify-center bg-white cursor-pointer hover:border-purple-500 transition p-2"
                  >
                    {shop.featuredBouquet.image ? (
                      <img
                        src={shop.featuredBouquet.image}
                        alt="Bouquet Image"
                        className="max-h-full rounded-2xl"
                      />
                    ) : (
                      <>
                        <svg
                          className="w-16 h-16 text-purple-600 mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-2xl font-bold text-purple-600">
                          Click to upload image
                        </p>
                        <p className="text-lg text-gray-600">
                          Square image recommended
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    ref={bouquetInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleBouquetUpload(file);
                      }
                    }}
                  />
                </div>
                {/* Buttons */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2 lg:col-span-1">
                  <button
                    onClick={() => handleSave("featuredBouquet")}
                    disabled={isSaving === "featuredBouquet"}
                    className="bg-emerald-600 text-white text-xl px-10 py-2 rounded-xl transition-all hover:bg-emerald-700"
                  >
                    {isSaving === "featuredBouquet" ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="bg-red-500 text-white text-xl px-10 py-2 rounded-xl transition-all hover:bg-red-600"
                    onClick={handleEditCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 text-center gap-4 sm:grid-cols-2 lg:grid-cols-1">
                {/* Bouquet Name */}
                <div>
                  <label className={normalLabel}>Bouquet Name</label>
                  <p className={previewP}>{shop.featuredBouquet.name}</p>
                </div>
                {/* Bouquet Price */}
                <div>
                  <label className={normalLabel}>Bouquet Price</label>
                  <p className={previewP}>${shop.featuredBouquet.price}</p>
                </div>
                {/* Bouquet Description */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className={normalLabel}>Bouquet Description</label>
                  <p className="font-semibold">
                    {shop.featuredBouquet.description}
                  </p>
                </div>
                {shop.featuredBouquet.image ? (
                  <div className="rounded-xl w-40 h-40 p-1 sm:col-span-2 mx-auto flex justify-center border-4 border-purple-400 bg-white lg:col-span-1">
                    <img
                      src={shop.featuredBouquet.image}
                      alt={`${shop.businessName}'s Featured Bouquet`}
                      className="max-w-full max-h-full"
                    />
                  </div>
                ) : (
                  <p className="sm:col-span-2 lg:col-span-1">No featured bouquet image added yet!</p>
                )}
              </div>
            )}
          </div>

          {/* Email History */}
          <div className="flex flex-col items-center gap-4 bg-gradient-to-br from-blue-100 to-white rounded-3xl shadow-xl p-10 text-center">
            <p className="font-semibold text-2xl text-gray-900 flex gap-2 items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
              Email History
            </p>

            <p className="text-gray-600 max-w-md text-center">
              View all emails sent from your shop, including invites and system
              notifications.
            </p>

            <Link
              href="/email-history"
              className="inline-flex items-center justify-center bg-purple-600 hover:bg-purple-700 transition-colors text-white font-semibold text-lg px-10 py-2 rounded-2xl shadow-md"
            >
              View Email History
            </Link>
          </div>

          {/* Security Code & Credentials */}
          <div className="flex flex-col items-center gap-4 bg-gradient-to-br from-blue-100 to-white rounded-3xl shadow-xl p-10 text-center relative">
            {/* Header */}
            <div>
              <h2 className="font-semibold text-2xl text-gray-900">
                Password Management
              </h2>
              <button
                onClick={() => handleEditClick("securityCode")}
                className={
                  (activeSection === "securityCode" ? "hidden" : "block") +
                  " absolute top-2 right-2"
                }
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
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                  />
                </svg>
              </button>
            </div>
            {/* Security Code */}
            {activeSection === "securityCode" ? (
              <div>
                <div className="flex items-center justify-center gap-2">
                  <label className={normalLabel}>Security Code</label>
                  <button
                    className="hover:text-purple-600 transition-all"
                    onClick={() => {
                      if (securityCodeInfo) {
                        setSecurityCodeInfo(false);
                      } else {
                        setSecurityCodeInfo(true);
                      }
                    }}
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
                        d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                      />
                    </svg>
                  </button>
                </div>
                <div>
                  <input
                    type="text"
                    name="securityCode"
                    value={shop.securityCode ?? ""}
                    maxLength={4}
                    onChange={(e) => {
                      setShop({ ...shop, securityCode: e.target.value });
                    }}
                    className={normalInput}
                  />
                </div>
                {securityCodeInfo && (
                  <p className="max-w-sm text-sm text-red-500">
                    This security code will be used to reset your password on
                    the login screen if you forget it.
                  </p>
                )}

                {/* Buttons */}
                <div className="flex gap-2 mt-4 mb-4">
                  <button
                    onClick={() => handleSave("securityCode")}
                    disabled={isSaving === "securityCode"}
                    className="bg-emerald-600 text-white text-xl px-10 py-2 rounded-xl transition-all hover:bg-emerald-700"
                  >
                    {isSaving === "securityCode" ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="bg-red-500 text-white text-xl px-10 py-2 rounded-xl transition-all hover:bg-red-600"
                    onClick={handleEditCancel}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-2">
                  <label className={normalLabel}>Security Code</label>
                  <button
                    className="hover:text-purple-600 transition-all"
                    onClick={() => {
                      if (securityCodeInfo) {
                        setSecurityCodeInfo(false);
                      } else {
                        setSecurityCodeInfo(true);
                      }
                    }}
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
                        d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                      />
                    </svg>
                  </button>
                </div>
                <p className={previewP}>{shop.securityCode}</p>
                {securityCodeInfo && (
                  <p className="max-w-sm text-sm text-red-500">
                    This security code will be used to reset your password on
                    the login screen if you forget it.
                  </p>
                )}
              </div>
            )}
            {/* Update Login Information */}
            <div>
              {/* Update Password */}
              <div className="text-center">
                {!showPasswordForm ? (
                  <button
                    onClick={() => {
                      setShowEmailForm(false);
                      setShowPasswordForm(true);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-black text-xl px-10 py-2 rounded-2xl"
                  >
                    Change Password
                  </button>
                ) : (
                  <div className="max-w-md mx-auto bg-red-50 border-4 border-red-200 rounded-2xl p-4 flex flex-col gap-4">
                    <h2 className="text-2xl text-red-700 font-bold text-center">
                      Change Password
                    </h2>
                    {/* Current Password */}
                    <div>
                      <label className={normalLabel}>Current Password</label>
                      <div className="relative flex items-center w-full">
                        <input
                          type={showCurrentPw ? "text" : "password"}
                          placeholder="Current password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className={`${normalInput} w-full pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          className="absolute right-3 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {showCurrentPw ? (
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
                                d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
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
                                d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    {/* New Password */}
                    <div>
                      <label className={normalLabel}>New Password</label>
                      <div className="relative flex items-center w-full">
                        <input
                          type={showNewPw ? "text" : "password"}
                          placeholder="New password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className={`${normalInput} w-full pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute right-3 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {showNewPw ? (
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
                                d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
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
                                d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    {/* Confirm New Password */}
                    <div>
                      <label className={normalLabel}>
                        Confirm New Password
                      </label>
                      <div className="relative flex items-center w-full">
                      <input
                        type={showConfirmPw ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`${normalInput} w-full pr-10`}
                      />
                                              <button
                          type="button"
                          onClick={() => setShowConfirmPw(!showConfirmPw)}
                          className="absolute right-3 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {showConfirmPw ? (
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
                                d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
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
                                d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 justify-center">
                      <button
                        onClick={handlePasswordUpdate}
                        disabled={isUpdatingPw}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-10 py-2 rounded-xl"
                      >
                        {isUpdatingPw ? (
                          <span className="flex items-center gap-2">
                            Updating...
                          </span>
                        ) : (
                          "Update"
                        )}
                      </button>

                      <button
                        onClick={() => setShowPasswordForm(false)}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold px-10 py-2 rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Update Email */}
            </div>
          </div>

          {/* Update Login Information */}
          <div className="hidden flex-col gap-4 items-center justify-center bg-gradient-to-br from-blue-100 to-white rounded-3xl shadow-xl p-10 text-center">
            {/* Update Password */}

            {/* Update Email */}
            {/* <div className="text-center">
              {!showEmailForm ? (
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setShowEmailForm(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xl px-12 py-6 rounded-2xl"
                >
                  Change Email Address
                </button>
              ) : (
                <div className="max-w-md mx-auto bg-blue-50 border-4 border-blue-200 rounded-3xl p-8 space-y-6">
                  <h2 className="text-2xl font-black text-blue-700">
                    Change Email
                    <br /> <span className="text-sm">(Requires Re-login)</span>
                  </h2>

                  <label className="flex flex-col text-start text-lg font-bold mb-2">
                    Current Email
                    <input
                      type="email"
                      value={initialShop.email}
                      disabled
                      className="w-full px-6 py-4 text-lg border-4 rounded-xl bg-gray-100 text-gray-700"
                    />
                  </label>

                  <input
                    type="email"
                    placeholder="New email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-6 py-4 text-lg border-4 rounded-xl"
                  />

                  <input
                    type="password"
                    placeholder="Confirm with password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="w-full px-6 py-4 text-lg border-4 rounded-xl"
                  />

                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={async () => {
                        const res = await fetch("/api/auth/change-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            newEmail,
                            password: emailPassword,
                          }),
                        });

                        if (res.ok) {
                          toast.success("Email updated. Please log in again.");
                          setTimeout(() => {
                            signOut({ callbackUrl: "/login" });
                          }, 1000);
                        } else {
                          const err = await res.json();
                          toast.error(err.error);
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl"
                    >
                      Update
                    </button>

                    <button
                      onClick={() => setShowEmailForm(false)}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold px-6 py-3 rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div> */}
          </div>

        </div>
      </div>
    </>
  );
}
