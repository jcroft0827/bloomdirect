"use client";

import { useEffect } from "react";

export default function StorefrontRevealObserver() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-bloom-reveal]"));
    if (!nodes.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => {
        node.style.opacity = "";
        node.style.transform = "";
      });
      return;
    }

    nodes.forEach((node) => {
      node.style.opacity = "0";
      node.style.transform = "translateY(24px)";
      node.style.transition = "opacity 700ms ease-out, transform 700ms ease-out";
      node.style.willChange = "opacity, transform";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const node = entry.target as HTMLElement;
          node.style.opacity = "1";
          node.style.transform = "translateY(0)";
          node.style.willChange = "auto";
          observer.unobserve(node);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return null;
}
