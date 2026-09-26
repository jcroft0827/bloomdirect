"use client";

import { AlertTriangle, Loader2, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

type Address = {
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type EditState = {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  recipient: {
    firstName: string;
    lastName: string;
    phone: string;
    company: string;
    deliveryInstructions: string;
  };
  fulfillment: {
    requestedDate: string;
    window: {
      type: "anytime" | "morning" | "afternoon" | "custom";
      from: string;
      to: string;
    };
    deliveryAddress: Address;
  };
  cardMessage: string;
  floristInternalNote: string;
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-950 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100";

function cloneState(value: EditState): EditState {
  return JSON.parse(JSON.stringify(value)) as EditState;
}

export default function BloomWebsiteOrderEditButton({
  orderId,
  fulfillmentType,
  initial,
}: {
  orderId: string;
  fulfillmentType: "delivery" | "pickup";
  initial: EditState;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [form, setForm] = useState<EditState>(() => cloneState(initial));

  function openEditor() {
    setForm(cloneState(initial));
    setReason("");
    setOpen(true);
  }

  function closeEditor() {
    if (saving) return;
    setOpen(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reason.trim()) {
      toast.error("Enter a reason for the order change.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `/api/websites/orders/${orderId}/adjustments`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            fulfillment:
              fulfillmentType === "delivery"
                ? form.fulfillment
                : {
                    requestedDate: form.fulfillment.requestedDate,
                    window: form.fulfillment.window,
                  },
            reason: reason.trim(),
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Unable to update order.");
      }

      toast.success(
        data?.financialReviewRequired
          ? "Order updated. Review the original tax/charges because the delivery address changed."
          : "Order updated and added to order history.",
      );
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update order.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-black text-purple-800 transition hover:border-purple-300 hover:bg-purple-100"
      >
        <Pencil size={16} />
        Edit Order
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-gray-950/50 p-4 sm:p-6">
          <div className="mx-auto my-4 max-w-4xl rounded-3xl bg-white shadow-2xl sm:my-8">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-3xl border-b border-gray-200 bg-white px-5 py-4 sm:px-7">
              <div>
                <h2 className="text-xl font-black text-gray-950">Edit order</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Every saved change is permanently recorded in Order History.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="Close order editor"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-7 p-5 sm:p-7">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <div className="flex gap-3">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-black">Paid financial history stays locked.</p>
                    <p className="mt-1">
                      Products, quantities, prices, delivery charge, tax, tip, and the paid total are not rewritten here. Use the existing Refund action for reductions or credits. Changes do not automatically resend an order that was already exported to a POS.
                    </p>
                  </div>
                </div>
              </div>

              <section>
                <h3 className="text-base font-black text-gray-950">Customer contact</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold text-gray-700">
                    First name
                    <input
                      className={inputClass}
                      value={form.customer.firstName}
                      maxLength={120}
                      required
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          customer: { ...current.customer, firstName: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="text-sm font-bold text-gray-700">
                    Last name
                    <input
                      className={inputClass}
                      value={form.customer.lastName}
                      maxLength={120}
                      required
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          customer: { ...current.customer, lastName: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="text-sm font-bold text-gray-700">
                    Email
                    <input
                      type="email"
                      className={inputClass}
                      value={form.customer.email}
                      maxLength={320}
                      required
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          customer: { ...current.customer, email: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="text-sm font-bold text-gray-700">
                    Phone
                    <input
                      className={inputClass}
                      value={form.customer.phone}
                      maxLength={50}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          customer: { ...current.customer, phone: event.target.value },
                        }))
                      }
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="text-base font-black text-gray-950">Recipient</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold text-gray-700">
                    First name
                    <input
                      className={inputClass}
                      value={form.recipient.firstName}
                      maxLength={120}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          recipient: { ...current.recipient, firstName: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="text-sm font-bold text-gray-700">
                    Last name
                    <input
                      className={inputClass}
                      value={form.recipient.lastName}
                      maxLength={120}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          recipient: { ...current.recipient, lastName: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="text-sm font-bold text-gray-700">
                    Phone
                    <input
                      className={inputClass}
                      value={form.recipient.phone}
                      maxLength={50}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          recipient: { ...current.recipient, phone: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="text-sm font-bold text-gray-700">
                    Business / company
                    <input
                      className={inputClass}
                      value={form.recipient.company}
                      maxLength={160}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          recipient: { ...current.recipient, company: event.target.value },
                        }))
                      }
                    />
                  </label>
                </div>
              </section>

              {fulfillmentType === "delivery" && (
                <section>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-black text-gray-950">Delivery address</h3>
                    <span className="text-xs font-bold text-amber-700">
                      Address changes do not recalculate the paid tax or delivery charge.
                    </span>
                  </div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-bold text-gray-700 sm:col-span-2">
                      Address line 1
                      <input
                        className={inputClass}
                        value={form.fulfillment.deliveryAddress.address1}
                        maxLength={240}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            fulfillment: {
                              ...current.fulfillment,
                              deliveryAddress: {
                                ...current.fulfillment.deliveryAddress,
                                address1: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="text-sm font-bold text-gray-700 sm:col-span-2">
                      Address line 2
                      <input
                        className={inputClass}
                        value={form.fulfillment.deliveryAddress.address2}
                        maxLength={240}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            fulfillment: {
                              ...current.fulfillment,
                              deliveryAddress: {
                                ...current.fulfillment.deliveryAddress,
                                address2: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="text-sm font-bold text-gray-700">
                      City
                      <input
                        className={inputClass}
                        value={form.fulfillment.deliveryAddress.city}
                        maxLength={160}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            fulfillment: {
                              ...current.fulfillment,
                              deliveryAddress: {
                                ...current.fulfillment.deliveryAddress,
                                city: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="text-sm font-bold text-gray-700">
                      State
                      <input
                        className={inputClass}
                        value={form.fulfillment.deliveryAddress.state}
                        maxLength={120}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            fulfillment: {
                              ...current.fulfillment,
                              deliveryAddress: {
                                ...current.fulfillment.deliveryAddress,
                                state: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="text-sm font-bold text-gray-700">
                      Postal code
                      <input
                        className={inputClass}
                        value={form.fulfillment.deliveryAddress.postalCode}
                        maxLength={40}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            fulfillment: {
                              ...current.fulfillment,
                              deliveryAddress: {
                                ...current.fulfillment.deliveryAddress,
                                postalCode: event.target.value,
                              },
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="text-sm font-bold text-gray-700">
                      Country
                      <input
                        className={inputClass}
                        value={form.fulfillment.deliveryAddress.country}
                        maxLength={2}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            fulfillment: {
                              ...current.fulfillment,
                              deliveryAddress: {
                                ...current.fulfillment.deliveryAddress,
                                country: event.target.value.toUpperCase(),
                              },
                            },
                          }))
                        }
                      />
                    </label>
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-base font-black text-gray-950">Fulfillment</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <label className="text-sm font-bold text-gray-700">
                    Date
                    <input
                      type="date"
                      className={inputClass}
                      value={form.fulfillment.requestedDate}
                      required
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          fulfillment: { ...current.fulfillment, requestedDate: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="text-sm font-bold text-gray-700 sm:col-span-2">
                    Window
                    <select
                      className={inputClass}
                      value={form.fulfillment.window.type}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          fulfillment: {
                            ...current.fulfillment,
                            window: {
                              ...current.fulfillment.window,
                              type: event.target.value as EditState["fulfillment"]["window"]["type"],
                            },
                          },
                        }))
                      }
                    >
                      <option value="anytime">Anytime</option>
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>

                  {form.fulfillment.window.type === "custom" && (
                    <>
                      <label className="text-sm font-bold text-gray-700">
                        From
                        <input
                          type="time"
                          className={inputClass}
                          value={form.fulfillment.window.from}
                          required
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              fulfillment: {
                                ...current.fulfillment,
                                window: { ...current.fulfillment.window, from: event.target.value },
                              },
                            }))
                          }
                        />
                      </label>
                      <label className="text-sm font-bold text-gray-700">
                        To
                        <input
                          type="time"
                          className={inputClass}
                          value={form.fulfillment.window.to}
                          required
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              fulfillment: {
                                ...current.fulfillment,
                                window: { ...current.fulfillment.window, to: event.target.value },
                              },
                            }))
                          }
                        />
                      </label>
                    </>
                  )}
                </div>
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold text-gray-700">
                  Card message
                  <textarea
                    className={`${inputClass} min-h-32 resize-y`}
                    value={form.cardMessage}
                    maxLength={1000}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, cardMessage: event.target.value }))
                    }
                  />
                </label>
                <label className="text-sm font-bold text-gray-700">
                  Fulfillment instructions
                  <textarea
                    className={`${inputClass} min-h-32 resize-y`}
                    value={form.recipient.deliveryInstructions}
                    maxLength={1000}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        recipient: {
                          ...current.recipient,
                          deliveryInstructions: event.target.value,
                        },
                      }))
                    }
                  />
                </label>
              </section>

              <label className="block text-sm font-bold text-gray-700">
                Florist internal note
                <textarea
                  className={`${inputClass} min-h-28 resize-y`}
                  value={form.floristInternalNote}
                  maxLength={5000}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      floristInternalNote: event.target.value,
                    }))
                  }
                />
                <span className="mt-1 block text-xs font-normal text-gray-500">
                  Internal only. This is not shown to the customer.
                </span>
              </label>

              <label className="block text-sm font-black text-gray-900">
                Why are you changing this order? <span className="text-red-600">*</span>
                <textarea
                  className={`${inputClass} min-h-24 resize-y`}
                  value={reason}
                  maxLength={1000}
                  required
                  placeholder="Example: Customer called to correct the delivery address."
                  onChange={(event) => setReason(event.target.value)}
                />
                <span className="mt-1 block text-xs font-normal text-gray-500">
                  The reason is saved permanently with the before/after values.
                </span>
              </label>

              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
                  className="min-h-11 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-black text-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-black text-white hover:bg-purple-800 disabled:opacity-50"
                >
                  {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
