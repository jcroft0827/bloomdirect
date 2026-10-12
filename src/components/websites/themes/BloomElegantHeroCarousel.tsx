"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Clock3, Phone, ShoppingBag, Sparkles, Truck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getBloomWebsiteHeroOverlayOpacity } from "@/lib/bloom-websites/storefront-editor";
import type { BloomWebsiteHeroSlide } from "@/types/bloom-website";

type VisualProduct = { name: string; imageUrl: string };

type Props = {
  slides: BloomWebsiteHeroSlide[];
  basePath: string;
  cityState: string;
  showAddress: boolean;
  showPhone: boolean;
  phone: string;
  allowsSameDay: boolean;
  sameDayCutoff: string;
  primaryColor: string;
  primaryForeground: string;
  visualProducts: VisualProduct[];
};

function formatCutoff(value: string) {
  const [hourString, minuteString] = value.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString || "0");
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

function getHeroHref(slide: BloomWebsiteHeroSlide, basePath: string) {
  if (slide.ctaDestination === "none") return "";
  if (slide.ctaDestination === "about") return `${basePath}/about`;
  if (slide.ctaDestination === "custom") {
    const href = slide.ctaHref.trim();
    if (!href) return "";
    if (/^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return href;
    }
    if (href.startsWith("/")) return `${basePath}${href}`;
    return href;
  }
  return `${basePath}/shop`;
}

function imagePositionClass(position: BloomWebsiteHeroSlide["imagePosition"]) {
  if (position === "top") return "object-top";
  if (position === "bottom") return "object-bottom";
  return "object-center";
}

export default function BloomElegantHeroCarousel({
  slides,
  basePath,
  cityState,
  showAddress,
  showPhone,
  phone,
  allowsSameDay,
  sameDayCutoff,
  primaryColor,
  primaryForeground,
  visualProducts,
}: Props) {
  const safeSlides = useMemo(() => slides.filter((slide) => slide.headline.trim()), [slides]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (safeSlides.length <= 1 || paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeSlides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, safeSlides.length]);

  useEffect(() => {
    if (activeIndex >= safeSlides.length) setActiveIndex(0);
  }, [activeIndex, safeSlides.length]);

  const slide = safeSlides[activeIndex] || safeSlides[0];
  if (!slide) return null;

  const hasImage = Boolean(slide.imageUrl);
  const lightText = hasImage && slide.textStyle === "light";
  const overlayOpacity = hasImage ? getBloomWebsiteHeroOverlayOpacity(slide.overlay) : 0;
  const centered = slide.alignment === "center";
  const ctaHref = getHeroHref(slide, basePath);
  const isExternalCta = /^https?:\/\//i.test(ctaHref) || ctaHref.startsWith("mailto:") || ctaHref.startsWith("tel:");

  const heroButtonClass = `inline-flex min-h-12 items-center justify-center gap-2 border px-7 py-3 text-xs font-semibold uppercase tracking-[0.18em] transition hover:-translate-y-0.5 ${
    lightText ? "border-white bg-white text-stone-900" : ""
  }`;

  return (
    <section
      className={`relative overflow-hidden border-b border-stone-200 ${hasImage ? "bg-stone-900" : "bg-[#f4efe8]"}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {safeSlides.map((item, index) => (
        item.imageUrl ? (
          <img
            key={item.id}
            src={item.imageUrl}
            alt=""
            aria-hidden={index !== activeIndex}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${imagePositionClass(item.imagePosition)} ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
          />
        ) : null
      ))}

      {hasImage && overlayOpacity > 0 ? (
        <div
          className="absolute inset-0 transition-colors duration-500"
          style={{
            backgroundColor: lightText
              ? `rgba(0,0,0,${overlayOpacity})`
              : `rgba(255,255,255,${Math.min(0.7, overlayOpacity + 0.12)})`,
          }}
        />
      ) : null}

      <div
        className={`relative mx-auto grid min-h-[620px] max-w-[1500px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:min-h-[720px] lg:px-10 lg:py-24 ${
          !hasImage && !centered ? "lg:grid-cols-[0.82fr_1.18fr]" : ""
        }`}
      >
        <div className={`relative z-10 max-w-3xl ${centered ? "mx-auto text-center" : ""}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-[0.24em] sm:text-xs ${lightText ? "text-white/80" : "text-stone-600"}`}>
            {showAddress && cityState ? `${cityState} Florist` : "Local floral design"}
          </p>

          <h1 className={`mt-5 max-w-4xl font-serif text-5xl font-medium leading-[0.98] tracking-[-0.035em] sm:text-6xl lg:text-7xl xl:text-[5.8rem] ${centered ? "mx-auto" : ""} ${lightText ? "text-white" : "text-stone-950"}`}>
            {slide.headline}
          </h1>

          {slide.subheadline ? (
            <p className={`mt-7 max-w-xl text-base leading-8 sm:text-lg ${centered ? "mx-auto" : ""} ${lightText ? "text-white/85" : "text-stone-600"}`}>
              {slide.subheadline}
            </p>
          ) : null}

          <div className={`mt-9 flex flex-wrap items-center gap-5 ${centered ? "justify-center" : ""}`}>
            {ctaHref && slide.ctaLabel ? (
              isExternalCta ? (
                <a
                  href={ctaHref}
                  className={heroButtonClass}
                  style={!lightText ? { backgroundColor: primaryColor, borderColor: primaryColor, color: primaryForeground } : undefined}
                >
                  {slide.ctaLabel} {slide.ctaDestination === "shop" ? <ShoppingBag size={16} /> : <ArrowRight size={16} />}
                </a>
              ) : (
                <Link
                  href={ctaHref}
                  className={heroButtonClass}
                  style={!lightText ? { backgroundColor: primaryColor, borderColor: primaryColor, color: primaryForeground } : undefined}
                >
                  {slide.ctaLabel} {slide.ctaDestination === "shop" ? <ShoppingBag size={16} /> : <ArrowRight size={16} />}
                </Link>
              )
            ) : null}

            {showPhone && phone ? (
              <a
                href={`tel:${phone}`}
                className={`inline-flex min-h-12 items-center gap-2 border-b pb-1 text-xs font-semibold uppercase tracking-[0.16em] transition hover:opacity-60 ${lightText ? "border-white/70 text-white" : "border-stone-500 text-stone-700"}`}
              >
                <Phone size={15} /> Call the studio
              </a>
            ) : null}
          </div>

          <div className={`mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs ${centered ? "justify-center" : ""} ${lightText ? "text-white/70" : "text-stone-500"}`}>
            <span className="inline-flex items-center gap-2"><Sparkles size={14} /> Designed locally</span>
            <span className="inline-flex items-center gap-2"><Truck size={14} /> Hand delivered</span>
            {allowsSameDay ? (
              <span className="inline-flex items-center gap-2"><Clock3 size={14} /> Same-day until {formatCutoff(sameDayCutoff)}</span>
            ) : null}
          </div>
        </div>

        {!hasImage && !centered ? (
          <div className="relative hidden min-h-[520px] lg:block">
            {visualProducts[0] ? (
              <div className="absolute right-0 top-0 h-[72%] w-[62%] overflow-hidden bg-white shadow-[0_35px_80px_rgba(69,56,45,0.12)]">
                <img src={visualProducts[0].imageUrl} alt={visualProducts[0].name} className="h-full w-full object-contain p-8" />
              </div>
            ) : null}
            {visualProducts[1] ? (
              <div className="absolute bottom-0 left-0 h-[46%] w-[45%] overflow-hidden border-[10px] border-[#f4efe8] bg-white shadow-[0_25px_60px_rgba(69,56,45,0.10)]">
                <img src={visualProducts[1].imageUrl} alt={visualProducts[1].name} className="h-full w-full object-contain p-5" />
              </div>
            ) : null}
            {visualProducts[2] ? (
              <div className="absolute bottom-5 right-[8%] h-[32%] w-[30%] overflow-hidden border-[8px] border-[#f4efe8] bg-white">
                <img src={visualProducts[2].imageUrl} alt={visualProducts[2].name} className="h-full w-full object-contain p-4" />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {safeSlides.length > 1 ? (
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/20 bg-black/20 px-3 py-2 backdrop-blur-md">
          <button type="button" aria-label="Previous hero" onClick={() => setActiveIndex((activeIndex - 1 + safeSlides.length) % safeSlides.length)} className="rounded-full p-1.5 text-white transition hover:bg-white/15">
            <ChevronLeft size={17} />
          </button>
          <div className="flex items-center gap-2">
            {safeSlides.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show hero ${index + 1}`}
                aria-pressed={index === activeIndex}
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-7 bg-white" : "w-1.5 bg-white/55 hover:bg-white/80"}`}
              />
            ))}
          </div>
          <button type="button" aria-label="Next hero" onClick={() => setActiveIndex((activeIndex + 1) % safeSlides.length)} className="rounded-full p-1.5 text-white transition hover:bg-white/15">
            <ChevronRight size={17} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
