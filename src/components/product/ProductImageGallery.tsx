"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { ProductImageData } from "@/types/product";

interface Props {
  images: ProductImageData[];
  productName: string;
}

const SWIPE_THRESHOLD = 40;
const AUTOPLAY_MS = 3000;
const FINE_POINTER_QUERY = "(pointer: fine)";
const MIN_SCALE = 1;
const MAX_SCALE = 4;

function subscribeFinePointer(cb: () => void) {
  const mq = window.matchMedia(FINE_POINTER_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getFPSnap = () => window.matchMedia(FINE_POINTER_QUERY).matches;
const getFPServer = () => false;

/* ─────────────────────────────────────────────
   Fullscreen Lightbox
───────────────────────────────────────────── */
function Lightbox({
  images,
  startIndex,
  productName,
  onClose,
}: {
  images: ProductImageData[];
  startIndex: number;
  productName: string;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // pinch state
  const lastPinchDist = useRef<number | null>(null);
  const lastOffset = useRef({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const touchSwipeStart = useRef<number | null>(null);

  const img = images[idx];

  const reset = () => { setScale(1); setOffset({ x: 0, y: 0 }); };
  const goTo = useCallback((i: number) => {
    setIdx((i + images.length) % images.length);
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  // keyboard nav + ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goTo(idx + 1);
      if (e.key === "ArrowLeft") goTo(idx - 1);
    }
    window.addEventListener("keydown", onKey);
    // prevent body scroll
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [idx, onClose, goTo]);

  /* ── Touch handlers ── */
  function getDist(touches: React.TouchList) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      lastPinchDist.current = getDist(e.touches);
      lastOffset.current = offset;
    } else if (e.touches.length === 1) {
      touchSwipeStart.current = e.touches[0].clientX;
      dragStart.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y };
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const newDist = getDist(e.touches);
      const ratio = newDist / lastPinchDist.current;
      setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * ratio)));
      lastPinchDist.current = newDist;
    } else if (e.touches.length === 1 && scale > 1 && dragStart.current) {
      setOffset({
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y,
      });
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    lastPinchDist.current = null;
    dragStart.current = null;
    // If scale snapped below 1, reset
    if (scale < 1.05) reset();

    // Swipe to next/prev only when not zoomed
    if (scale <= 1.05 && touchSwipeStart.current !== null && e.changedTouches.length === 1) {
      const delta = e.changedTouches[0].clientX - touchSwipeStart.current;
      if (Math.abs(delta) > SWIPE_THRESHOLD) goTo(delta > 0 ? idx - 1 : idx + 1);
    }
    touchSwipeStart.current = null;
  }

  /* ── Double-tap to zoom ── */
  const lastTap = useRef(0);
  function onTouchEndDoubleTap(e: React.TouchEvent) {
    onTouchEnd(e);
    const now = Date.now();
    if (now - lastTap.current < 300) {
      scale > 1 ? reset() : setScale(2.5);
    }
    lastTap.current = now;
  }

  /* ── Mouse drag (when zoomed) ── */
  const mouseDragStart = useRef<{ x: number; y: number } | null>(null);
  function onMouseDown(e: React.MouseEvent) {
    if (scale > 1) mouseDragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!mouseDragStart.current || scale <= 1) return;
    setOffset({ x: e.clientX - mouseDragStart.current.x, y: e.clientY - mouseDragStart.current.y });
  }
  function onMouseUp() { mouseDragStart.current = null; }

  /* ── Wheel zoom ── */
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.85 : 1.18;
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * delta)));
  }

  if (!img) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-95"
        aria-label="Close"
      >
        <X size={22} />
      </button>

      {/* Counter */}
      <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
        {idx + 1} / {images.length}
      </div>

      {/* Reset zoom hint */}
      {scale > 1 && (
        <button
          onClick={reset}
          className="absolute bottom-24 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/15 px-4 py-1.5 text-xs text-white backdrop-blur-sm"
        >
          Tap to reset zoom
        </button>
      )}

      {/* Image area */}
      <div
        className="relative h-full w-full touch-none select-none overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndDoubleTap}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
      >
        <div
          className="absolute inset-0 transition-transform duration-100 ease-out"
          style={{
            transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
            transformOrigin: "center center",
          }}
        >
          <Image
            src={img.url}
            alt={img.altText ?? productName}
            fill
            sizes="100vw"
            className="object-contain"
            priority
            draggable={false}
          />
        </div>
      </div>

      {/* Prev arrow */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goTo(idx - 1); }}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-95"
            aria-label="Previous"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goTo(idx + 1); }}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-95"
            aria-label="Next"
          >
            <ChevronRight size={24} />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Gallery
───────────────────────────────────────────── */
export default function ProductImageGallery({ images, productName }: Props) {
  const sorted = [...images].sort((a, b) => a.displayOrder - b.displayOrder);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isFinePointer = useSyncExternalStore(subscribeFinePointer, getFPSnap, getFPServer);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  const active = sorted[activeIndex] ?? sorted[0];

  function goTo(index: number) {
    setActiveIndex((index + sorted.length) % sorted.length);
  }

  // Autoplay
  useEffect(() => {
    if (sorted.length <= 1 || isPaused || lightboxOpen) return;
    autoplayRef.current = setInterval(() => {
      setActiveIndex((p) => (p + 1) % sorted.length);
    }, AUTOPLAY_MS);
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  }, [sorted.length, isPaused, lightboxOpen]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD) goTo(delta > 0 ? activeIndex - 1 : activeIndex + 1);
    else if (Math.abs(delta) < 5) setLightboxOpen(true); // tap
    touchStartX.current = null;
    setTimeout(() => setIsPaused(false), 2000);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isFinePointer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomOrigin({
      x: Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100)),
    });
  }

  if (!active) return <div className="aspect-square w-full rounded-2xl bg-gray-100" />;

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Main image */}
        <div
          className={`group relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-50 shadow-sm ${isFinePointer ? "cursor-zoom-in" : "cursor-pointer"}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => { if (isFinePointer) setLightboxOpen(true); }}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => { if (isFinePointer) { setIsZooming(true); setIsPaused(true); } }}
          onMouseLeave={() => { setIsZooming(false); setIsPaused(false); }}
        >
          {/* Hover zoom */}
          <div
            className="absolute inset-0 transition-transform duration-200 ease-out"
            style={{
              transform: isZooming ? `scale(2.2)` : "scale(1)",
              transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
            }}
          >
            <Image
              key={active.id}
              src={active.url}
              alt={active.altText ?? productName}
              fill
              sizes="(max-width: 768px) 100vw, 500px"
              className="object-contain transition-opacity duration-300"
              priority
              draggable={false}
            />
          </div>

          {/* Fullscreen hint badge */}
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 sm:opacity-100">
            <ZoomIn size={12} /> Tap to expand
          </div>

          {/* Image counter */}
          {sorted.length > 1 && (
            <div className="absolute left-3 top-3 rounded-full bg-black/35 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
              {activeIndex + 1}/{sorted.length}
            </div>
          )}

          {/* Arrows */}
          {sorted.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); goTo(activeIndex - 1); setIsPaused(true); }} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95" aria-label="Previous">
                <ChevronLeft size={18} className="text-gray-700" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); goTo(activeIndex + 1); setIsPaused(true); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95" aria-label="Next">
                <ChevronRight size={18} className="text-gray-700" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {sorted.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={(e) => { e.stopPropagation(); setActiveIndex(i); setIsPaused(true); }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? "w-6 bg-brand" : "w-1.5 bg-white/70"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {sorted.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {sorted.map((img, i) => (
              <button
                key={img.id}
                onClick={() => { setActiveIndex(i); setIsPaused(true); }}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                  i === activeIndex
                    ? "border-brand shadow-sm shadow-brand/30 scale-105"
                    : "border-transparent opacity-55 hover:opacity-90 hover:border-gray-300"
                }`}
              >
                <Image src={img.url} alt={img.altText ?? productName} fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox portal */}
      {lightboxOpen && (
        <Lightbox
          images={sorted}
          startIndex={activeIndex}
          productName={productName}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
