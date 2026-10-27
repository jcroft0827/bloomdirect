"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Monitor, Smartphone, EyeOff } from "lucide-react";

type Device = "desktop" | "mobile";
const WIDTHS: Record<Device, number> = { desktop: 1280, mobile: 390 };
const HEIGHTS: Record<Device, number> = { desktop: 1000, mobile: 950 };

/**
 * Storefront components use viewport media queries, not container queries.
 * Rendering them in a narrow div keeps the parent browser's desktop breakpoints.
 * This iframe gives the actual storefront renderer its own responsive viewport.
 * The iframe scrolls naturally; only navigation and actions are blocked.
 */
export default function PageEditorLivePreview({ enabled, shopName, title, children }: {
  enabled: boolean; shopName: string; title: string; children: ReactNode; themeName?: string;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [hostWidth, setHostWidth] = useState(0);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    const update = () => setHostWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="page-preview-root"></div></body></html>');
    doc.close();
    // Next/Tailwind injects CSS through both link and style elements in dev and production.
    const copyStyles = () => {
      doc.head.querySelectorAll('[data-preview-style]').forEach(element => element.remove());
      document.head.querySelectorAll('link[rel="stylesheet"], style').forEach(source => {
        const clone = source.cloneNode(true) as HTMLElement;
        clone.setAttribute('data-preview-style', '');
        doc.head.appendChild(clone);
      });
    };
    copyStyles();
    const styleObserver = new MutationObserver(copyStyles);
    styleObserver.observe(document.head, { childList: true, subtree: false });
    // Block activation, not scrolling. pointer-events:none on the iframe breaks
    // mouse wheel and touch scrolling, and hides interactive preview affordances.
    const blockActivation = (event: Event) => {
      const target = event.target;
      if (!target || !(target as Element).closest) return;
      if ((target as Element).closest('a, button, [role="button"], input, select, textarea, form')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    doc.addEventListener('click', blockActivation, true);
    doc.addEventListener('submit', blockActivation, true);
    setMount(doc.getElementById('page-preview-root'));
    return () => {
      doc.removeEventListener('click', blockActivation, true);
      doc.removeEventListener('submit', blockActivation, true);
      styleObserver.disconnect(); setMount(null);
    };
  }, []);

  const width = WIDTHS[device];
  const scale = hostWidth ? Math.min(1, hostWidth / width) : 0.5;
  return <section className="sticky top-5 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3">
      <div><p className="text-sm font-bold">Live editing preview</p><p className="text-xs text-slate-500">Your storefront theme is shown. Unsaved edits are visible here only.</p></div>
      <div className="flex gap-1" aria-label="Preview screen size">
        <button type="button" aria-pressed={device === "desktop"} className={`rounded-lg p-2 ${device === "desktop" ? "bg-slate-900 text-white" : "text-slate-600"}`} onClick={() => setDevice("desktop")} title="Desktop preview"><Monitor size={18}/></button>
        <button type="button" aria-pressed={device === "mobile"} className={`rounded-lg p-2 ${device === "mobile" ? "bg-slate-900 text-white" : "text-slate-600"}`} onClick={() => setDevice("mobile")} title="Mobile preview"><Smartphone size={18}/></button>
      </div>
    </div>
    {!enabled && <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status"><span className="inline-flex items-center gap-2 font-bold"><EyeOff size={16}/> This page is currently hidden.</span><p className="mt-1">Enable this page to make it available to your customers.</p></div>}
    <div className="max-h-[72vh] overflow-auto bg-slate-100 p-3">
      <div ref={measureRef} className="w-full min-w-0">
        <div className="relative mx-auto overflow-hidden bg-white shadow-sm" style={{ width: width * scale, height: HEIGHTS[device] * scale }}>
          <iframe ref={iframeRef} title={`${shopName} ${title} ${device} read-only preview`} tabIndex={-1} aria-label={`${title} read-only preview`} className="absolute left-0 top-0 border-0 bg-white" style={{ width, height: HEIGHTS[device], transform: `scale(${scale})`, transformOrigin: 'top left' }} />
        </div>
      </div>
    </div>
    {mount && createPortal(<div>{children}</div>, mount)}
    <p className="border-t px-4 py-2 text-xs text-slate-500">Responsive storefront preview · navigation, cart, and customer actions are disabled here.</p>
  </section>;
}
