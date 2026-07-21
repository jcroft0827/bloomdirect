"use client";

import BloomSpinner from "@/components/BloomSpinner";
import AppButton from "@/components/ui/AppButton";
import AppModal from "@/components/ui/AppModal";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { DragControls } from "framer-motion";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

export default function OfferingsClient() {
  const { data: session, status } = useSession();
  const bloomProUpgradePath = "/dashboard/billing";

  const [shopId, setShopId] = useState<string | null>(null);
  const [shopProStatus, setShopProStatus] = useState(false);
  const [shopSlug, setShopSlug] = useState("");
  const [offerings, setOfferings] = useState<any[]>([]);
  const [editingOffering, setEditingOffering] = useState<any | null>(null);
  const [showProModal, setShowProModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [offeringToDelete, setOfferingToDelete] = useState<any | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const editImageInputRef = useRef<HTMLInputElement | null>(null);

  // useEffect to pull user
  useEffect(() => {
    if (status !== "authenticated") return;

    async function loadUser() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/shops/me");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load shop.");
        }

        if (data?.shop) {
          setShopId(data.shop._id);
          setShopProStatus(!!data.shop.isPro);
          setShopSlug(data.shop.slug);

          const offeringsRes = await fetch(
            `/api/shops/${data.shop._id}/offerings`,
          );
          const offeringsData = await offeringsRes.json();

          if (!offeringsRes.ok) {
            throw new Error(offeringsData.error || "Failed to load offerings.");
          }

          setOfferings(offeringsData.offerings || []);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load user: ", error);
        toast.error(
          "Failed to load user data. Refresh the page. If the problem persists, contact GetBloomDirect support.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [status]);

  // Edit Offering
  const editOffering = (offering: any) => {
    setEditingOffering(structuredClone(offering));
  };

  // Save Offering
  const saveOfferingChanges = async () => {
    if (!editingOffering) return;

    try {
      const res = await fetch(`/api/offerings/${editingOffering._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingOffering),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update offering.");
      }

      setOfferings(data.offerings || []);
      setEditingOffering(null);
      toast.success("Offering updated successfully.");
    } catch (error: any) {
      console.error("SAVE OFFERING ERROR:", error);
      toast.error(error.message || "Failed to update offering.");
    }
  };

  // Offering Active/Inactive
  const toggleOfferingActive = async (offering: any) => {
    try {
      const res = await fetch(`/api/offerings/${offering._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...offering,
          isActive: !offering.isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update offering.");
      }

      setOfferings(data.offerings || []);
      toast.success(
        offering.isActive ? "Offering deactivated." : "Offering activated.",
      );
    } catch (error: any) {
      console.error("TOGGLE OFFERING ERROR:", error);
      toast.error(error.message || "Failed to update offering.");
    }
  };

  // Delete Offering
  const deleteOffering = async (offering: any) => {
    try {
      const res = await fetch(`/api/offerings/${offering._id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete offering.");
      }

      setOfferings(data.offerings || []);
      setOfferingToDelete(null);
      toast.success("Offering deleted successfully.");
    } catch (error: any) {
      console.error("DELETE OFFERING ERROR:", error);
      toast.error(error.message || "Failed to delete offering.");
    }
  };

  // Image Upload
  const handleOfferingImageUpload = async (file: File) => {
    if (!editingOffering) return;

    try {
      setUploadingImage(true);

      const uploadRes = await fetch("/api/s3/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to get upload URL.");
      }

      const { uploadUrl, fileKey } = await uploadRes.json();

      const s3Upload = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!s3Upload.ok) {
        throw new Error("Failed to upload image.");
      }

      const cfBase = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
      const imageUrl = `${cfBase}/${fileKey}`;

      setEditingOffering({
        ...editingOffering,
        image: imageUrl,
      });

      toast.success("Image uploaded.");
    } catch (error: any) {
      console.error("OFFERING IMAGE UPLOAD ERROR:", error);
      toast.error(error.message || "Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Update Editing Offering
  const updateEditingOffering = (field: string, value: any) => {
    if (!editingOffering) return;

    setEditingOffering({
      ...editingOffering,
      [field]: value,
    });
  };

  // Update Pricing Tier
  const updatePricingTier = (index: number, field: string, value: any) => {
    if (!editingOffering) return;

    const tiers = [...(editingOffering.pricingTiers || [])];

    tiers[index] = {
      ...tiers[index],
      [field]: value,
    };

    setEditingOffering({
      ...editingOffering,
      pricingTiers: tiers,
    });
  };

  // Add Offering
  const addOffering = async () => {
    try {
      const res = await fetch("/api/offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Offering",
          type: "everyday",
          occasions: ["everyday"],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add offering.");
      }

      setOfferings(data.offerings || []);
      toast.success("Offering added.");

      const newOffering = data.offering;
      if (newOffering) {
        setEditingOffering(JSON.parse(JSON.stringify(newOffering)));
      }
    } catch (error: any) {
      console.error("ADD OFFERING ERROR:", error);
      toast.error(error.message || "Failed to add offering.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      {isLoading ? (
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <h1 className="text-3xl font-black text-purple-700">
              Fulfillment Offerings
            </h1>
            <p className="mt-1 text-gray-600">
              Manage the arrangements other florists can select when sending you
              an order.
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <p className="text-xl font-semibold text-emerald-700">
              Loading Fulfillment Offerings...
            </p>
            <BloomSpinner />
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <Link
              href={`/dashboard/shops/${shopSlug}`}
              className="text-xl text-gray-700 border border-gray-700 rounded-full px-4 py-1 flex items-center gap-1 w-full sm:w-48 hover:bg-gray-100"
            >
              <span>
                <ChevronLeftIcon width={21} />
              </span>
              Back to Profile
            </Link>
          </div>

          <div>
            <h1 className="text-3xl font-black text-purple-700">
              Fulfillment Offerings
            </h1>
            <p className="mt-1 text-gray-600">
              Manage the arrangements other florists can select when sending you
              an order.
            </p>
          </div>

          {!shopProStatus && (
            <div className="rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white shadow-2xl">
              <h2 className="text-2xl font-black">Upgrade to Bloom Pro</h2>
              <p className="mt-2 text-white/90">
                Free shops can manage Designer&apos;s Choice and one Featured
                Arrangement. Bloom Pro unlocks up to 10 total offerings,
                additional arrangement categories, featured offerings, and
                active or inactive controls.
              </p>

              <Link
                href={bloomProUpgradePath}
                className="mt-4 inline-flex rounded-xl bg-white px-5 py-3 font-bold text-purple-700 transition hover:bg-purple-50"
              >
                Upgrade to Bloom Pro
              </Link>
            </div>
          )}

          {/* Heading + Add Offering Button */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Your Offerings</h2>
            {/* Add Offering Button */}
            <AppButton
              type="button"
              variant={shopProStatus ? "success" : "outline"}
              onClick={() => {
                if (!shopProStatus) {
                  setShowProModal(true);
                  return;
                }

                addOffering();
              }}
            >
              {shopProStatus ? "+ Add Offering" : "+ Add Offering 🔒"}
            </AppButton>
          </div>

          {/* Offerings Cards */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 items-stretch">
            {offerings.map((offering: any) => (
              <div
                key={offering._id}
                className="flex h-full min-h-[720px] flex-col overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-xl"
              >
                {offering.image ? (
                  <div className="h-56 p-4 hover:p-2 transition-all w-full bg-purple-50">
                    <img
                      src={offering.image}
                      alt={offering.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-56 items-center justify-center text-center bg-purple-50 text-purple-700 font-bold">
                    <p className="text-lg">
                      <span className="text-4xl">📷</span>
                      <br />
                      No image uploaded
                      <br />
                      Click Edit to upload an image
                    </p>
                  </div>
                )}

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2">
                        {offering.isDesignerChoice && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            Designer&apos;s Choice
                          </span>
                        )}

                        {offering.isFeatured && (
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                            Featured
                          </span>
                        )}

                        {!offering.isActive && (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                            Inactive
                          </span>
                        )}

                        {offering.isDefault && (
                          <span className="px-3 py-1 text-xs font-bold">
                            ⭐ Default
                          </span>
                        )}
                      </div>
                      {/* Offering Name */}
                      <h3 className="mt-3 text-2xl font-black text-gray-900 mb-2">
                        {offering.name}
                      </h3>
                    </div>
                  </div>

                  {/* Offering Description */}
                  <p className="text-gray-600">
                    {offering.description || "No description added yet."}
                  </p>

                  {/* Pricing Tiers & Buttons */}
                  <div className="mt-auto space-y-4">
                    <div className="space-y-2">
                      {offering.pricingTiers?.map((tier: any) => (
                        <div
                          key={tier.label}
                          className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                        >
                          <div>
                            <p className="font-bold text-gray-900">
                              {tier.label}
                            </p>
                            {tier.description && (
                              <p className="text-sm text-gray-500">
                                {tier.description}
                              </p>
                            )}
                          </div>

                          <p className="text-xl font-black text-purple-700">
                            ${Number(tier.price || 0).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                      <div className="flex gap-3">
                        <AppButton
                          variant="primary"
                          onClick={() => editOffering(offering)}
                          className="flex-1"
                        >
                          Edit
                        </AppButton>

                        {shopProStatus && !offering.isDesignerChoice && (
                          <AppButton
                            type="button"
                            variant="outline"
                            onClick={() => toggleOfferingActive(offering)}
                          >
                            {offering.isActive ? "Deactivate" : "Activate"}
                          </AppButton>
                        )}
                      </div>

                      {shopProStatus &&
                        offerings.length > 2 &&
                        !offering.isDesignerChoice && (
                          <AppButton
                            type="button"
                            variant="danger"
                            onClick={() => setOfferingToDelete(offering)}
                          >
                            Delete
                          </AppButton>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {offerings.length === 0 && (
            <div className="rounded-3xl border border-dashed border-purple-300 bg-white p-10 text-center shadow">
              <h2 className="text-2xl font-bold text-purple-700">
                No offerings found
              </h2>
              <p className="mt-2 text-gray-600">
                Your default Designer&apos;s Choice offering should be created
                automatically.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Edit Offering Modal */}
      {editingOffering && (
        <AppModal
          open={true}
          title="Edit Offering"
          description="Update the arrangement details and pricing tiers."
          onClose={() => {
            setEditingOffering(null);
          }}
          maxWidth="lg"
          footer={
            <div className="flex gap-3">
              <AppButton
                type="button"
                variant="success"
                fullWidth
                onClick={saveOfferingChanges}
              >
                Save Changes
              </AppButton>

              <AppButton
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingOffering(null);
                }}
              >
                Cancel
              </AppButton>
            </div>
          }
        >
          <div className="mt-6 space-y-4">
            <div>
              <label className="ml-1 text-xs uppercase text-gray-500">
                Offering Image
              </label>

              <div
                onClick={() => editImageInputRef.current?.click()}
                className="mt-2 flex h-72 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-4 border-dashed border-purple-200 bg-purple-50 transition hover:border-purple-500"
              >
                {editingOffering.image ? (
                  <img
                    src={editingOffering.image}
                    alt={editingOffering.name || "Offering image"}
                    className="h-full w-full object-contain bg-white"
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-700">
                      {uploadingImage
                        ? "Uploading..."
                        : "Click to upload image"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Recommended: square or landscape arrangement photo
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={editImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  if (file) {
                    handleOfferingImageUpload(file);
                  }
                }}
              />

              {editingOffering.image && (
                <button
                  type="button"
                  onClick={() =>
                    setEditingOffering({
                      ...editingOffering,
                      image: "",
                    })
                  }
                  className="mt-2 text-sm font-bold text-red-600 hover:text-red-700"
                >
                  Remove Image
                </button>
              )}
            </div>

            <div>
              <label className="ml-1 text-xs uppercase text-gray-500">
                Offering Name
              </label>
              <input
                value={editingOffering.name || ""}
                onChange={(e) => updateEditingOffering("name", e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div>
              <label className="ml-1 text-xs uppercase text-gray-500">
                Description
              </label>
              <textarea
                value={editingOffering.description || ""}
                onChange={(e) =>
                  updateEditingOffering("description", e.target.value)
                }
                rows={4}
                className="w-full rounded-xl border px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="rounded-2xl border bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Pricing Tiers</h3>

                <div className="flex flex-col justify-end">
                  <AppButton
                    variant="primary"
                    disabled={(editingOffering.pricingTiers?.length || 0) >= 3}
                    onClick={() =>
                      updateEditingOffering("pricingTiers", [
                        ...(editingOffering.pricingTiers || []),
                        { label: "", price: 0, description: "" },
                      ])
                    }
                    className="px-3 py-2 disabled:opacity-50"
                  >
                    + Add Tier
                  </AppButton>

                  {(editingOffering.pricingTiers?.length || 0) >= 3 && (
                    <p className="text-xs text-red-600 font-semibold">
                      Maximum of 3 pricing tiers.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {editingOffering.pricingTiers?.map(
                  (tier: any, index: number) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 gap-3 rounded-xl bg-white p-4 md:grid-cols-4"
                    >
                      <input
                        value={tier.label || ""}
                        placeholder="Standard"
                        onChange={(e) =>
                          updatePricingTier(index, "label", e.target.value)
                        }
                        className="rounded-lg border px-3 py-2"
                      />

                      <input
                        type="number"
                        value={tier.price}
                        placeholder="75"
                        onChange={(e) =>
                          updatePricingTier(
                            index,
                            "price",
                            Number(e.target.value),
                          )
                        }
                        className="rounded-lg border px-3 py-2"
                      />

                      <input
                        value={tier.description || ""}
                        placeholder="Optional description"
                        onChange={(e) =>
                          updatePricingTier(
                            index,
                            "description",
                            e.target.value,
                          )
                        }
                        className="rounded-lg border px-3 py-2 md:col-span-2"
                      />

                      {editingOffering.pricingTiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            updateEditingOffering(
                              "pricingTiers",
                              editingOffering.pricingTiers.filter(
                                (_: any, i: number) => i !== index,
                              ),
                            )
                          }
                          className="rounded-lg bg-red-100 px-3 py-2 font-bold text-red-700 md:col-span-4"
                        >
                          Remove Tier
                        </button>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border p-4">
              <div>
                <p className="font-bold">Default Offering</p>
                <p className="text-sm text-gray-500">
                  This offering will be treated as the shop&apos;s main/default
                  option.
                </p>
              </div>

              <input
                type="checkbox"
                checked={!!editingOffering.isDefault}
                onChange={(e) =>
                  updateEditingOffering("isDefault", e.target.checked)
                }
                className="h-6 w-6"
              />
            </div>
          </div>
        </AppModal>
      )}

      {/* Pro Modal */}
      <AppModal
        open={showProModal}
        title="Bloom Pro Feature"
        description="Additional fulfillment offerings are available with Bloom Pro."
        onClose={() => setShowProModal(false)}
        maxWidth="md"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row">
            <AppButton
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setShowProModal(false)}
            >
              Not Right Now
            </AppButton>

            <Link
              href={bloomProUpgradePath}
              className="flex w-full items-center justify-center rounded-xl bg-purple-600 px-5 py-3 font-bold text-white transition hover:bg-purple-700"
            >
              Upgrade to Bloom Pro
            </Link>
          </div>
        }
      >
        <div className="rounded-2xl bg-purple-50 p-5">
          <h3 className="font-bold text-purple-800">Free shops include:</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>✅ Designer&apos;s Choice</li>
            <li>✅ 1 Featured Arrangement</li>
            <li>✅ Custom pricing tiers</li>
            <li>✅ Image, description, and display name editing</li>
          </ul>
        </div>

        <div className="mt-4 rounded-2xl bg-emerald-50 p-5">
          <h3 className="font-bold text-emerald-800">Bloom Pro unlocks:</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li>🌸 Up to 10 total offerings</li>
            <li>
              🌸 Sympathy, funeral, wedding, holiday, and everyday offerings
            </li>
            <li>🌸 Up to 3 featured offerings</li>
            <li>🌸 Active/inactive controls</li>
            <li>🌸 Internal names and advanced organization</li>
          </ul>
        </div>
      </AppModal>

      {/* Delete Modal */}
      {offeringToDelete && (
        <AppModal
          open={true}
          title="Delete Offering"
          description={`Are you sure you want to delete "${offeringToDelete.name}"? This cannot be undone.`}
          onClose={() => setOfferingToDelete(null)}
          maxWidth="sm"
          footer={
            <div className="flex gap-3">
              <AppButton
                type="button"
                variant="danger"
                fullWidth
                onClick={() => deleteOffering(offeringToDelete)}
              >
                Yes, Delete
              </AppButton>

              <AppButton
                type="button"
                variant="outline"
                fullWidth
                onClick={() => setOfferingToDelete(null)}
              >
                Cancel
              </AppButton>
            </div>
          }
        >
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            This will permanently remove this offering from your fulfillment
            options.
          </div>
        </AppModal>
      )}
    </div>
  );
}
