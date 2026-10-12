"use client";

import { type ReactNode, useEffect, useRef } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
};

export default function StorefrontReveal({ children, className = "", delayMs = 0 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.style.opacity = "1";
      node.style.transform = "translateY(0)";
      node.style.transitionDelay = "0ms";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        node.style.opacity = "1";
        node.style.transform = "translateY(0)";
        node.style.willChange = "auto";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} translate-y-6 opacity-0 transition-[opacity,transform] duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none`}
      style={{ transitionDelay: delayMs ? `${delayMs}ms` : undefined }}
    >
      {children}
    </div>
  );
}
