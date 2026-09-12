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
const AUTOPLAY_MS = 3500;
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
   Shared slide-strip — renders all images in a
   horizontal row and translates to active index
───────────────────────────────────────────── */
function SlideStrip({
  images,
  productName,
  activeIndex,
  dragX,          // live drag offset in px (0 when idle)
  isAnimating,    // true while CSS transition plays after release
  direction,      // "left" | "right" | null — which way we last slid
  onImageClick,
}: {
  images: ProductImageData[];
  productName: string;
  activeIndex: number;
  dragX: number;
  isAnimating: boolean;
  direction: "left" | "right" | null;
  onImageClick?: () => void;
}) {
  const baseTranslate = -activeIndex * 100;
  const pixelOffset = dragX;

  return (
    <div
      className="absolute inset-0 flex"
      style={{
        transform: `translateX(calc(${baseTranslate}% + ${pixelOffset}px))`,
        transition: isAnimating ? "transform 320ms cubic-bezier(0.25,0.46,0.45,0.94)" : "none",
        willChange: "transform",
      }}
    >
      {images.map((img, i) => (
        <div
          key={img.id}
          className="relative h-full w-full shrink-0"
          onClick={onImageClick}
        >
          <Image
            src={img.url}
            alt={img.altText ?? productName}
            fill
            sizes="(max-width: 768px) 100vw, 500px"
            className="object-contain select-none"
            priority={i === 0}
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
}

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

  // swipe-slide state inside lightbox
  const [dragX, setDragX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const lastPinchDist = useRef<number | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const touchSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);
  const mouseDragStart = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const goTo = useCallback(
    (i: number, dir?: "left" | "right") => {
      setDirection(dir ?? null);
      setIsAnimating(true);
      setIdx((i + images.length) % images.length);
      reset();
      setTimeout(() => setIsAnimating(false), 340);
    },
    [images.length, reset]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goTo(idx + 1, "left");
      if (e.key === "ArrowLeft") goTo(idx - 1, "right");
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [idx, onClose, goTo]);

  function getDist(touches: React.TouchList) {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      lastPinchDist.current = getDist(e.touches);
    } else if (e.touches.length === 1) {
      touchSwipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (scale > 1) {
        dragStart.current = {
          x: e.touches[0].clientX - offset.x,
          y: e.touches[0].clientY - offset.y,
        };
      }
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      const newDist = getDist(e.touches);
      const ratio = newDist / lastPinchDist.current;
      setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * ratio)));
      lastPinchDist.current = newDist;
    } else if (e.touches.length === 1) {
      if (scale > 1 && dragStart.current) {
        setOffset({
          x: e.touches[0].clientX - dragStart.current.x,
          y: e.touches[0].clientY - dragStart.current.y,
        });
      } else if (scale <= 1 && touchSwipeStart.current) {
        // live drag for slide feel
        setDragX(e.touches[0].clientX - touchSwipeStart.current.x);
      }
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    lastPinchDist.current = null;
    dragStart.current = null;
    if (scale < 1.05) reset();

    if (scale <= 1.05 && touchSwipeStart.current) {
      const deltaX = e.changedTouches[0].clientX - touchSwipeStart.current.x;
      const deltaY = Math.abs(e.changedTouches[0].clientY - touchSwipeStart.current.y);

      setDragX(0);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 340);

      if (Math.abs(deltaX) > SWIPE_THRESHOLD && deltaY < 60) {
        goTo(deltaX > 0 ? idx - 1 : idx + 1, deltaX > 0 ? "right" : "left");
      }
    }
    touchSwipeStart.current = null;

    // double tap
    const now = Date.now();
    if (now - lastTap.current < 280) {
      scale > 1 ? reset() : setScale(2.5);
    }
    lastTap.current = now;
  }

  function onMouseDown(e: React.MouseEvent) {
    if (scale > 1) {
      mouseDragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    }
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!mouseDragStart.current || scale <= 1) return;
    setOffset({ x: e.clientX - mouseDragStart.current.x, y: e.clientY - mouseDragStart.current.y });
  }
  function onMouseUp() { mouseDragStart.current = null; }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * (e.deltaY > 0 ? 0.85 : 1.18))));
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ── Close — transparent, no blur ── */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 p-2 text-white/80 transition hover:text-white active:scale-90"
        aria-label="Close"
      >
        <X size={26} strokeWidth={2} />
      </button>

      {/* ── Counter ── */}
      {images.length > 1 && (
        <div className="absolute top-5 left-1/2 z-10 -translate-x-1/2 text-xs font-semibold text-white/70 tracking-widest">
          {idx + 1} / {images.length}
        </div>
      )}

      {/* ── Reset zoom hint ── */}
      {scale > 1 && (
        <button
          onClick={reset}
          className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 text-xs text-white/50 transition hover:text-white/80"
        >
          Double-tap or click to reset zoom
        </button>
      )}

      {/* ── Image slide area ── */}
      <div
        className="relative h-full w-full touch-none select-none overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        style={{ cursor: scale > 1 ? "grab" : "default" }}
      >
        {/* Zoomed single image */}
        {scale > 1 ? (
          <div
            className="absolute inset-0 transition-transform duration-100 ease-out"
            style={{
              transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`,
              transformOrigin: "center center",
            }}
          >
            <Image
              src={images[idx]?.url ?? ""}
              alt={images[idx]?.altText ?? productName}
              fill
              sizes="100vw"
              className="object-contain"
              priority
              draggable={false}
            />
          </div>
        ) : (
          /* Slide strip when not zoomed */
          <SlideStrip
            images={images}
            productName={productName}
            activeIndex={idx}
            dragX={dragX}
            isAnimating={isAnimating}
            direction={direction}
          />
        )}
      </div>

      {/* ── Arrows — transparent, no blur, no bg ── */}
      {images.length > 1 && scale <= 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goTo(idx - 1, "right"); }}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 p-3 text-white/60 transition hover:text-white active:scale-90"
            aria-label="Previous"
          >
            <ChevronLeft size={32} strokeWidth={1.5} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goTo(idx + 1, "left"); }}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 p-3 text-white/60 transition hover:text-white active:scale-90"
            aria-label="Next"
          >
            <ChevronRight size={32} strokeWidth={1.5} />
          </button>
        </>
      )}

      {/* ── Dots ── */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); goTo(i); }}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === idx ? "w-7 bg-white" : "w-1.5 bg-white/35"
              }`}
            />
          ))}
        </div>
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

  // slide-animation state
  const [dragX, setDragX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isFinePointer = useSyncExternalStore(subscribeFinePointer, getFPSnap, getFPServer);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  function goTo(index: number, dir?: "left" | "right") {
    const next = (index + sorted.length) % sorted.length;
    setDirection(dir ?? null);
    setIsAnimating(true);
    setActiveIndex(next);
    setTimeout(() => setIsAnimating(false), 340);
  }

  // Autoplay
  useEffect(() => {
    if (sorted.length <= 1 || isPaused || lightboxOpen || isZooming) return;
    autoplayRef.current = setInterval(() => {
      setDirection("left");
      setIsAnimating(true);
      setActiveIndex((p) => (p + 1) % sorted.length);
      setTimeout(() => setIsAnimating(false), 340);
    }, AUTOPLAY_MS);
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  }, [sorted.length, isPaused, lightboxOpen, isZooming]);

  /* ── Touch swipe with live drag feedback ── */
  function handleTouchStart(e: React.TouchEvent) {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setIsPaused(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
    if (dy > 30) return; // vertical scroll — don't hijack
    setDragX(dx);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);

    setDragX(0);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 340);

    if (Math.abs(deltaX) > SWIPE_THRESHOLD && deltaY < 60) {
      goTo(deltaX > 0 ? activeIndex - 1 : activeIndex + 1, deltaX > 0 ? "right" : "left");
    } else if (Math.abs(deltaX) < 6 && deltaY < 10) {
      // pure tap → open lightbox
      setLightboxOpen(true);
    }

    touchStartRef.current = null;
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

  if (!sorted.length) return <div className="aspect-square w-full rounded-2xl bg-gray-100" />;

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* ── Main image area ── */}
        <div
          className={`group relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-50 shadow-sm ${
            isFinePointer ? "cursor-zoom-in" : "cursor-pointer"
          }`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => { if (isFinePointer) setLightboxOpen(true); }}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => { if (isFinePointer) { setIsZooming(true); setIsPaused(true); } }}
          onMouseLeave={() => { setIsZooming(false); setIsPaused(false); }}
        >
          {/* Slide strip — always rendered, hover-zoom sits on top */}
          <div
            className="absolute inset-0 transition-transform duration-200 ease-out"
            style={{
              transform: isZooming ? `scale(2.2)` : "scale(1)",
              transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`,
            }}
          >
            <SlideStrip
              images={sorted}
              productName={productName}
              activeIndex={activeIndex}
              dragX={dragX}
              isAnimating={isAnimating}
              direction={direction}
            />
          </div>

          {/* Expand hint */}
          <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 sm:opacity-90">
            <ZoomIn size={11} /> Tap to expand
          </div>

          {/* Counter */}
          {sorted.length > 1 && (
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-semibold text-white">
              {activeIndex + 1}/{sorted.length}
            </div>
          )}

          {/* ── Arrows — transparent, no bg, no blur ── */}
          {sorted.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goTo(activeIndex - 1, "right"); setIsPaused(true); }}
                className="absolute left-1 top-1/2 -translate-y-1/2 p-2 text-gray-700/50 transition hover:text-gray-900 active:scale-90"
                aria-label="Previous image"
              >
                <ChevronLeft size={28} strokeWidth={2} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goTo(activeIndex + 1, "left"); setIsPaused(true); }}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-700/50 transition hover:text-gray-900 active:scale-90"
                aria-label="Next image"
              >
                <ChevronRight size={28} strokeWidth={2} />
              </button>
            </>
          )}

          {/* Dots */}
          {sorted.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {sorted.map((img, i) => (
                <button
                  key={img.id}
                  onClick={(e) => { e.stopPropagation(); goTo(i); setIsPaused(true); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeIndex ? "w-6 bg-brand" : "w-1.5 bg-gray-400/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {sorted.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {sorted.map((img, i) => (
              <button
                key={img.id}
                onClick={() => { goTo(i); setIsPaused(true); }}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                  i === activeIndex
                    ? "border-brand scale-105 shadow-sm shadow-brand/30"
                    : "border-transparent opacity-50 hover:opacity-90 hover:border-gray-300"
                }`}
              >
                <Image
                  src={img.url}
                  alt={img.altText ?? productName}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
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
