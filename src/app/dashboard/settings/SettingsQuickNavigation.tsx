"use client";

import { useEffect, useRef, useState } from "react";

export type SettingsQuickNavItem = {
  id: string;
  label: string;
};

type SettingsQuickNavigationProps = {
  items: SettingsQuickNavItem[];
};

export default function SettingsQuickNavigation({
  items,
}: SettingsQuickNavigationProps) {
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

    if (sections.length === 0) {
      return;
    }

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

        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-22% 0px -58% 0px",
        threshold: [0, 0.1, 0.25, 0.5],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [items]);

  function handleJump(id: string) {
    const section = document.getElementById(id);

    if (!section) {
      return;
    }

    const navHeight = navRef.current?.getBoundingClientRect().height ?? 0;
    section.style.scrollMarginTop = `${navHeight + 16}px`;

    clickedTargetRef.current = id;
    setActiveId(id);
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      ref={navRef}
      aria-label="Settings sections"
      className="sticky top-0 z-30 -mx-1 mt-4 overflow-x-auto border-b border-gray-200/80 bg-emerald-50/95 px-1 py-2 shadow-sm backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex w-max min-w-full gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        {items.map((item) => {
          const isActive = activeId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleJump(item.id)}
              aria-current={isActive ? "location" : undefined}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition sm:px-5 ${
                isActive
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-950"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
