"use client";

import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";

type Props = {
  images: string[];
  selectedImage: string;
  productName: string;
  onSelectImage: (image: string) => void;
  onClose: () => void;
};

export default function ProductImageLightbox({ images, selectedImage, productName, onSelectImage, onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; originalX: number; originalY: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const index = Math.max(0, images.indexOf(selectedImage));

  function go(delta: number) {
    if (!images.length) return;
    onSelectImage(images[(index + delta + images.length) % images.length]);
  }

  // Changing pictures should not leave an invisible pan/zoom offset on the next image.
  useEffect(() => { setScale(1); setOffset({ x: 0, y: 0 }); }, [selectedImage]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])');
        if (!focusables?.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = originalOverflow; document.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
    // onClose and go use current render values; re-registering must not reset initial focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stable event handler values without re-running the focus/scroll-lock effect.
  const callbacks = useRef({ onClose, go });
  callbacks.current = { onClose, go };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); callbacks.current.onClose(); }
      if (event.key === "ArrowLeft" && images.length > 1) { event.preventDefault(); callbacks.current.go(-1); }
      if (event.key === "ArrowRight" && images.length > 1) { event.preventDefault(); callbacks.current.go(1); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length]);

  function zoom(next: number) {
    const bounded = Math.max(1, Math.min(4, next));
    setScale(bounded);
    if (bounded === 1) setOffset({ x: 0, y: 0 });
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (scale <= 1 || event.pointerType === "touch" && !event.isPrimary) return;
    drag.current = { x: event.clientX, y: event.clientY, originalX: offset.x, originalY: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setOffset({ x: drag.current.originalX + event.clientX - drag.current.x, y: drag.current.originalY + event.clientY - drag.current.y });
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return createPortal(
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${productName} photo viewer`} className="fixed inset-0 z-[200] flex flex-col bg-neutral-950/95 text-white backdrop-blur-md" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-7">
        <div className="min-w-0"><p className="truncate text-sm font-medium">{productName}</p><p className="text-xs text-white/60">Photo {index + 1} of {images.length}</p></div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={() => zoom(scale - 0.5)} disabled={scale <= 1} aria-label="Zoom out" className="rounded-full p-2.5 hover:bg-white/15 disabled:opacity-35"><Minus size={19} /></button>
          <span className="min-w-12 text-center text-xs tabular-nums" aria-live="polite">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => zoom(scale + 0.5)} disabled={scale >= 4} aria-label="Zoom in" className="rounded-full p-2.5 hover:bg-white/15 disabled:opacity-35"><Plus size={19} /></button>
          <button type="button" onClick={() => zoom(1)} disabled={scale === 1} aria-label="Reset zoom" className="rounded-full p-2.5 hover:bg-white/15 disabled:opacity-35"><RotateCcw size={18} /></button>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close photo viewer" className="ml-2 rounded-full border border-white/20 p-2.5 hover:bg-white/15"><X size={21} /></button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        {images.length > 1 && <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 z-10 rounded-full bg-black/60 p-3 hover:bg-white/20 sm:left-6"><ChevronLeft size={24} /></button>}
        <div className={`flex h-full w-full items-center justify-center overflow-hidden ${scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`} style={{ touchAction: scale > 1 ? "none" : "pan-y" }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onDoubleClick={() => zoom(scale > 1 ? 1 : 2)} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <img src={selectedImage} alt={`${productName}, photo ${index + 1}`} draggable={false} className="max-h-full max-w-full select-none object-contain" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transition: drag.current ? "none" : "transform 150ms ease-out" }} />
        </div>
        {images.length > 1 && <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 z-10 rounded-full bg-black/60 p-3 hover:bg-white/20 sm:right-6"><ChevronRight size={24} /></button>}
      </div>
      {images.length > 1 && <div className="z-10 flex shrink-0 justify-center gap-2 overflow-x-auto border-t border-white/10 px-4 py-3">{images.map((image, i) => <button key={image} type="button" aria-label={`View photo ${i + 1}`} aria-pressed={i === index} onClick={() => onSelectImage(image)} className={`h-14 w-14 shrink-0 overflow-hidden border-2 bg-white/10 ${i === index ? "border-white" : "border-transparent opacity-65 hover:opacity-100"}`}><img src={image} alt="" className="h-full w-full object-contain" /></button>)}</div>}
      <p className="sr-only">Use the left and right arrow keys to browse photos, Escape to close, and zoom controls or double-click to enlarge. Drag to pan while zoomed.</p>
    </div>, document.body,
  );
}
