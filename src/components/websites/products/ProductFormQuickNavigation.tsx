"use client";

import {
  Check,
  ClipboardList,
  DollarSign,
  ImageIcon,
  LayoutGrid,
  Loader2,
  Package2,
  Search,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type ComponentType } from "react";

export type ProductFormQuickNavItem = {
  id: string;
  label: string;
};

const ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  "product-details": Package2,
  "product-photos": ImageIcon,
  "product-pricing": DollarSign,
  "product-recipes": ClipboardList,
  "product-ordering": ShoppingBag,
  "product-placement": LayoutGrid,
  "product-addons": Sparkles,
  "product-seo": Search,
};

export default function ProductFormQuickNavigation({
  items,
  isSaving,
  saveLabel,
  disabled = false,
}: {
  items: ProductFormQuickNavItem[];
  isSaving: boolean;
  saveLabel: string;
  disabled?: boolean;
}) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const clickedTargetRef = useRef<string | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setActiveId(items[0]?.id ?? "");
    clickedTargetRef.current = null;
  }, [items]);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (clickedTargetRef.current) {
          const clickedEntry = entries.find(
            (entry) => entry.target.id === clickedTargetRef.current,
          );

          if (clickedEntry?.isIntersecting) {
            setActiveId(clickedTargetRef.current);
            clickedTargetRef.current = null;
          }
          return;
        }

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => {
            if (a.boundingClientRect.top === b.boundingClientRect.top) {
              return b.intersectionRatio - a.intersectionRatio;
            }
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });

        if (visible[0]) setActiveId(visible[0].target.id);
      },
      {
        rootMargin: "-18% 0px -62% 0px",
        threshold: [0, 0.1, 0.25, 0.5],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  function jumpTo(id: string) {
    const section = document.getElementById(id);
    if (!section) return;

    const isDesktop = window.matchMedia("(min-width: 1280px)").matches;
    const navHeight = isDesktop ? 0 : (navRef.current?.getBoundingClientRect().height ?? 0);
    section.style.scrollMarginTop = `${navHeight + (isDesktop ? 24 : 18)}px`;
    clickedTargetRef.current = id;
    setActiveId(id);
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (items.length === 0) return null;

  return (
    <nav
      ref={navRef}
      aria-label="Product editor sections"
      className="sticky top-0 z-30 -mx-1 overflow-x-auto border-b border-gray-200/80 bg-gray-50/95 px-1 py-2 shadow-sm backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:top-5 xl:mx-0 xl:overflow-visible xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none xl:backdrop-blur-none"
    >
      <div className="flex min-w-max items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm xl:min-w-0 xl:flex-col xl:items-stretch xl:gap-1.5 xl:p-3">
        <div className="hidden px-2 pb-2 pt-1 xl:block">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-400">
            Product Editor
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Jump between sections without losing your place.
          </p>
        </div>

        {items.map((item) => {
          const active = activeId === item.id;
          const Icon = ICONS[item.id] ?? Package2;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => jumpTo(item.id)}
              aria-current={active ? "location" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold transition sm:px-4 xl:w-full xl:px-3.5 ${
                active
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
              }`}
            >
              <Icon size={17} className="shrink-0" />
              {item.label}
            </button>
          );
        })}

        <div className="ml-1 border-l border-gray-200 pl-3 xl:ml-0 xl:mt-2 xl:border-l-0 xl:border-t xl:pl-0 xl:pt-3">
          <button
            type="submit"
            disabled={disabled || isSaving}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 xl:w-full"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {isSaving ? "Saving..." : saveLabel}
          </button>
        </div>
      </div>
    </nav>
  );
}
