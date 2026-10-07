"use client";

import { useBloomWebsiteCart } from "@/components/websites/storefront/BloomWebsiteCartProvider";
import { useBloomWebsiteCheckout } from "@/components/websites/storefront/BloomWebsiteCheckoutProvider";
import BloomWebsiteCheckoutSteps from "@/components/websites/storefront/BloomWebsiteCheckoutSteps";

import {
  ArrowLeft,
  ChevronDown,
  CreditCard,
  Gift,
  MapPin,
  MessageSquareText,
  PenLine,
  ShoppingBag,
  SmilePlus,
  Sparkles,
} from "lucide-react";

import Link from "next/link";
import { useRef, useState } from "react";

type BloomWebsiteCardMessageCheckoutProps = {
  previewSlug: string;
  basePath?: string;
};

type MessageCategory =
  | "birthday"
  | "anniversary"
  | "sympathy"
  | "get_well"
  | "congratulations"
  | "love"
  | "thank_you"
  | "new_baby"
  | "thinking_of_you"
  | "just_because";

const MESSAGE_CATEGORIES: Array<{
  value: MessageCategory;
  label: string;
}> = [
  {
    value: "birthday",
    label: "Birthday",
  },
  {
    value: "anniversary",
    label: "Anniversary",
  },
  {
    value: "sympathy",
    label: "Sympathy",
  },
  {
    value: "get_well",
    label: "Get Well",
  },
  {
    value: "congratulations",
    label: "Congratulations",
  },
  {
    value: "love",
    label: "Love & Romance",
  },
  {
    value: "thank_you",
    label: "Thank You",
  },
  {
    value: "new_baby",
    label: "New Baby",
  },
  {
    value: "thinking_of_you",
    label: "Thinking of You",
  },
  {
    value: "just_because",
    label: "Just Because",
  },
];

const MESSAGE_SUGGESTIONS: Record<MessageCategory, string[]> = {
  birthday: [
    "Wishing you the happiest birthday and a year filled with beautiful moments!",
    "Hope your birthday is every bit as wonderful as you are. Enjoy your special day!",
    "Happy Birthday! Sending lots of love and warm wishes your way today.",
    "Celebrating you today! Wishing you happiness, laughter, and a fantastic year ahead.",
  ],

  anniversary: [
    "Happy Anniversary! Wishing you many more beautiful years together.",
    "Celebrating your love today and wishing you both a very happy anniversary.",
    "Here’s to another year of love, laughter, and wonderful memories together.",
    "Happy Anniversary to a truly wonderful couple. May your love continue to grow.",
  ],

  sympathy: [
    "Thinking of you during this difficult time and sending you love and comfort.",
    "With deepest sympathy. May loving memories bring you peace and comfort.",
    "Our thoughts are with you and your family during this time of loss.",
    "Wishing you strength, comfort, and peace in the days ahead.",
  ],

  get_well: [
    "Thinking of you and wishing you comfort, strength, and a speedy recovery.",
    "Sending a little sunshine your way. Hope you’re feeling better very soon!",
    "Wishing you brighter days ahead and a smooth recovery.",
    "Get well soon! Sending warm thoughts and lots of positive energy your way.",
  ],

  congratulations: [
    "Congratulations! Wishing you all the best as you celebrate this wonderful accomplishment.",
    "So happy for you! Congratulations on this exciting new chapter.",
    "You did it! Sending big congratulations and wishing you continued success.",
    "Congratulations on your wonderful news. There is so much to celebrate!",
  ],

  love: [
    "Just a little reminder of how much you mean to me. I love you!",
    "You make every day brighter. Sending all my love to you.",
    "For the one who makes my heart happiest. I love you more every day.",
    "No special occasion needed. I just wanted you to know how much I love you.",
  ],

  thank_you: [
    "Thank you so much for everything. Your kindness means more than you know.",
    "With heartfelt thanks and appreciation for all that you do.",
    "Just a little something to say thank you. I truly appreciate you!",
    "Your kindness made such a difference. Thank you from the bottom of my heart.",
  ],

  new_baby: [
    "Congratulations on your beautiful new arrival! Wishing your family so much love and happiness.",
    "Welcome to the world, little one! Sending love and congratulations to the whole family.",
    "So happy for your growing family. Congratulations on your precious new baby!",
    "Wishing you endless cuddles, sweet moments, and so much joy with your new little one.",
  ],

  thinking_of_you: [
    "Thinking of you today and sending a little love your way.",
    "Just wanted you to know you’re on my mind and in my heart.",
    "Sending warm thoughts your way and hoping these flowers brighten your day.",
    "Thinking of you and hoping today brings you a reason to smile.",
  ],

  just_because: [
    "No special reason — just wanted to brighten your day!",
    "A little something to make you smile. You deserve it!",
    "Just because you’re wonderful and I thought you should know.",
    "Sometimes flowers don’t need a reason. Hope these make your day a little brighter!",
  ],
};

const EMOJIS = [
  "❤️",
  "💕",
  "💖",
  "💗",
  "💐",
  "🌷",
  "🌹",
  "🌸",
  "🌻",
  "🌼",
  "🌺",
  "🪻",
  "🎉",
  "🎂",
  "🎈",
  "🥳",
  "✨",
  "🥰",
  "😊",
  "😘",
  "🤗",
  "🙏",
  "🕊️",
  "🤍",
  "💙",
  "💜",
  "💛",
  "🩷",
  "👶",
  "🍼",
  "🎓",
  "💍",
];

function formatMoneyFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDeliveryDate(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T12:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

const textareaClassName =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold leading-6 text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-4 focus:ring-gray-100";

const inputClassName =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-4 focus:ring-gray-100";

export default function BloomWebsiteCardMessageCheckout({
  previewSlug,
  basePath,
}: BloomWebsiteCardMessageCheckoutProps) {
  const storefrontBasePath =
    basePath ?? `/websites/preview/${encodeURIComponent(previewSlug)}`;
  const { items, itemCount, openCart } = useBloomWebsiteCart();

  const {
    fulfillmentType,

    recipient,

    validatedDelivery,

    validatedPickup,

    cardMessage,

    cardSignature,

    setCardMessage,

    setCardSignature,
  } = useBloomWebsiteCheckout();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(true);

  const [selectedCategory, setSelectedCategory] =
    useState<MessageCategory>("birthday");

  const deliveryHref = `${storefrontBasePath}/checkout/delivery`;

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current;

    if (!textarea) {
      setCardMessage(`${cardMessage}${emoji}`);

      return;
    }

    const start = textarea.selectionStart;

    const end = textarea.selectionEnd;

    const availableCharacters = 300 - cardMessage.length;

    if (availableCharacters <= 0) {
      return;
    }

    const emojiToInsert = emoji.slice(0, availableCharacters);

    const nextMessage = `${cardMessage.slice(
      0,
      start,
    )}${emojiToInsert}${cardMessage.slice(end)}`;

    setCardMessage(nextMessage);

    const nextCursorPosition = start + emojiToInsert.length;

    window.requestAnimationFrame(() => {
      textarea.focus();

      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  function useSuggestedMessage(message: string) {
    setCardMessage(message);

    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-12">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--bloom-primary) 12%, white)",

              color: "var(--bloom-primary)",
            }}
          >
            <ShoppingBag size={28} />
          </div>

          <h1 className="mt-6 text-2xl font-black tracking-tight text-gray-950">
            Your cart is empty
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
            Choose an arrangement before continuing checkout.
          </p>

          <Link
            href={storefrontBasePath || "/"}
            className="mt-7 inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-black transition hover:opacity-90"
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

  const activeValidation =
    fulfillmentType === "pickup" ? validatedPickup : validatedDelivery;

  if (!activeValidation) {
    return (
      <main className="min-h-screen bg-gray-50 px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-gray-100 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <MapPin size={28} />
          </div>

          <h1 className="mt-6 text-2xl font-black tracking-tight text-gray-950">
            Fulfillment needs to be verified
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
            Confirm your selected delivery or pickup details before adding a
            card message.
          </p>

          <Link
            href={deliveryHref}
            className="mt-7 inline-flex items-center justify-center rounded-full px-6 py-3.5 text-sm font-black transition hover:opacity-90"
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

  const suggestions = MESSAGE_SUGGESTIONS[selectedCategory];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
          <Link
            href={deliveryHref}
            className="inline-flex min-w-0 items-center gap-2 text-sm font-black text-gray-700 transition hover:text-gray-950"
          >
            <ArrowLeft size={17} className="shrink-0" />

            <span className="hidden sm:inline">Back to Fulfillment</span>

            <span className="sm:hidden">Fulfillment</span>
          </Link>

          <button
            type="button"
            onClick={openCart}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-black text-gray-800 transition hover:bg-gray-50 sm:px-4"
          >
            <ShoppingBag size={17} />

            <span>Cart ({itemCount})</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8 lg:py-12">
        <BloomWebsiteCheckoutSteps currentStep="message" />

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <section className="min-w-0 space-y-5 sm:space-y-6">
            <div>
              <p
                className="text-sm font-black uppercase tracking-[0.16em]"
                style={{
                  color: "var(--bloom-accent)",
                }}
              >
                Card Message
              </p>

              <h1 className="mt-2 text-[1.75rem] font-black leading-tight tracking-tight text-gray-950 sm:text-4xl">
                Add a personal note
              </h1>

              <p className="mt-2.5 max-w-2xl text-sm leading-6 text-gray-500 sm:mt-3 sm:text-base">
                Write your own message, choose one of our suggestions, or leave
                the card blank.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-gray-100 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-7">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--bloom-primary) 10%, white)",

                    color: "var(--bloom-primary)",
                  }}
                >
                  <MessageSquareText size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-black text-gray-950">
                    Your Message
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Write exactly what you would like printed or written on the
                    enclosure card.
                  </p>
                </div>
              </div>

              <label className="mt-6 block text-sm font-black text-gray-800">
                Card Message
                <span className="ml-2 font-semibold text-gray-400">
                  Optional
                </span>
                <textarea
                  ref={textareaRef}
                  rows={7}
                  maxLength={300}
                  value={cardMessage}
                  onChange={(event) => setCardMessage(event.target.value)}
                  className={`${textareaClassName} resize-none`}
                  placeholder="Thinking of you and sending lots of love..."
                />
                <span className="mt-2 flex items-start justify-between gap-4 text-xs font-medium text-gray-400">
                  <span>
                    Your florist may adjust line breaks to fit the enclosure
                    card.
                  </span>

                  <span className="shrink-0">
                    {cardMessage.length}
                    /300
                  </span>
                </span>
              </label>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((current) => !current)}
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-xs font-black text-gray-700 transition hover:bg-gray-50 sm:rounded-full sm:px-4 sm:py-2.5"
                >
                  <SmilePlus size={16} />
                  Add Emoji
                  <ChevronDown
                    size={14}
                    className={`transition ${
                      showEmojiPicker ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setShowSuggestions((current) => !current)}
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-xs font-black text-gray-700 transition hover:bg-gray-50 sm:rounded-full sm:px-4 sm:py-2.5"
                >
                  <Sparkles size={16} />
                  Message Ideas
                  <ChevronDown
                    size={14}
                    className={`transition ${
                      showSuggestions ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {showEmojiPicker && (
                <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <div className="grid grid-cols-6 gap-1.5 min-[400px]:grid-cols-8 sm:grid-cols-10">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="flex aspect-square min-h-10 items-center justify-center rounded-xl text-xl transition hover:bg-white hover:shadow-sm"
                        aria-label={`Add ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="mt-6 block text-sm font-black text-gray-800">
                <span className="flex items-center gap-2">
                  <PenLine size={15} />
                  From
                  <span className="font-semibold text-gray-400">Optional</span>
                </span>

                <input
                  type="text"
                  maxLength={80}
                  value={cardSignature}
                  onChange={(event) => setCardSignature(event.target.value)}
                  className={inputClassName}
                  placeholder="Joe & Family"
                />

                <span className="mt-2 block text-right text-xs font-medium text-gray-400">
                  {cardSignature.length}
                  /80
                </span>
              </label>
            </div>

            {showSuggestions && (
              <div className="rounded-[1.5rem] border border-gray-100 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-7">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--bloom-accent) 10%, white)",

                      color: "var(--bloom-accent)",
                    }}
                  >
                    <Sparkles size={20} />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-gray-950">
                      Need a little inspiration?
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      Choose the occasion and select a message to use as-is or
                      personalize.
                    </p>
                  </div>
                </div>

                <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-6 sm:px-0">
                  {MESSAGE_CATEGORIES.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => setSelectedCategory(category.value)}
                      className={`shrink-0 rounded-full px-4 py-3 text-xs font-black transition sm:py-2.5 ${
                        selectedCategory === category.value
                          ? ""
                          : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                      style={
                        selectedCategory === category.value
                          ? {
                              backgroundColor: "var(--bloom-accent)",

                              color: "var(--bloom-accent-foreground)",
                            }
                          : undefined
                      }
                    >
                      {category.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-3">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => useSuggestedMessage(suggestion)}
                      className="group min-h-[88px] rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left transition active:scale-[0.99] hover:border-gray-200 hover:bg-white hover:shadow-sm"
                    >
                      <p className="text-sm font-semibold leading-6 text-gray-700 transition group-hover:text-gray-950">
                        {suggestion}
                      </p>

                      <p className="mt-2 text-xs font-black text-gray-400 transition group-hover:text-gray-700">
                        Use this message
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(cardMessage || cardSignature) && (
              <div className="rounded-[1.5rem] border border-gray-200 bg-white p-4 shadow-sm sm:rounded-[2rem] sm:p-7">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor:
                        "color-mix(in srgb, var(--bloom-primary) 10%, white)",

                      color: "var(--bloom-primary)",
                    }}
                  >
                    <Gift size={20} />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-gray-950">
                      Card Preview
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      A quick preview of what the recipient will see.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-5 sm:p-6">
                  {cardMessage ? (
                    <p className="whitespace-pre-wrap text-sm font-semibold leading-7 text-gray-800">
                      {cardMessage}
                    </p>
                  ) : (
                    <p className="text-sm italic text-gray-400">
                      No card message.
                    </p>
                  )}

                  {cardSignature && (
                    <p className="mt-5 text-sm font-black text-gray-950">
                      — {cardSignature}
                    </p>
                  )}
                </div>
              </div>
            )}

            <Link
              href={`${storefrontBasePath}/checkout/payment`}
              className="flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-black transition hover:opacity-90"
              style={{
                backgroundColor: "var(--bloom-primary)",

                color: "var(--bloom-primary-foreground)",
              }}
            >
              <CreditCard size={18} />
              Continue to Payment
            </Link>

            <p className="text-center text-xs font-medium leading-5 text-gray-400">
              Payment is the next checkout step we&apos;ll connect.
            </p>
          </section>

          <aside className="border-t border-gray-200 pt-6 sm:pt-8 lg:sticky lg:top-6 lg:border-t-0 lg:pt-0">
            <div className="overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white shadow-sm sm:rounded-[2rem]">
              <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
                <h2 className="text-lg font-black text-gray-950">
                  Order Summary
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
                            <p
                              key={addon.id}
                              className="text-xs leading-5 text-gray-400"
                            >
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

              <div className="border-t border-gray-100 px-5 py-5 sm:px-6">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                  {fulfillmentType === "pickup" ? "Picking Up From" : "Delivering To"}
                </p>

                <p className="mt-3 text-sm font-black text-gray-950">
                  {fulfillmentType === "pickup"
                    ? validatedPickup?.location.businessName
                    : `${recipient.firstName} ${recipient.lastName}`}
                </p>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  {fulfillmentType === "pickup"
                    ? validatedPickup?.location.formattedAddress
                    : validatedDelivery?.address.formattedAddress}
                </p>

                <p className="mt-2 text-sm font-bold text-gray-700">
                  {formatDeliveryDate(activeValidation.requestedDate)}
                </p>

                {fulfillmentType === "pickup" && validatedPickup?.instructions && (
                  <p className="mt-3 rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-500">
                    {validatedPickup.instructions}
                  </p>
                )}
              </div>

              <div className="space-y-3 border-t border-gray-100 px-5 py-5 text-sm sm:px-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-gray-500">Subtotal</span>

                  <span className="font-black text-gray-950">
                    {formatMoneyFromCents(activeValidation.cartSubtotalCents)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-gray-500">Delivery</span>

                  <span className="font-black text-gray-950">
                    {fulfillmentType === "pickup"
                      ? "$0.00"
                      : formatMoneyFromCents(validatedDelivery?.feeCents || 0)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-gray-500">Tax</span>

                  <span className="font-black text-gray-400">
                    Calculated next
                  </span>
                </div>

                <div className="mt-4 flex items-end justify-between gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <p className="font-black text-gray-950">Total before tax</p>

                    <p className="mt-1 text-xs leading-5 text-gray-400">
                      Final pricing will be revalidated securely before payment.
                    </p>
                  </div>

                  <span className="text-xl font-black tracking-tight text-gray-950">
                    {formatMoneyFromCents(
                      activeValidation.totalBeforeTaxCents,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
