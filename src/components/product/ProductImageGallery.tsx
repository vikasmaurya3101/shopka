"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductImageData } from "@/types/product";

interface ProductImageGalleryProps {
  images: ProductImageData[];
  productName: string;
}

const SWIPE_THRESHOLD = 40;
const ZOOM_SCALE = 2.2;
const FINE_POINTER_QUERY = "(pointer: fine)";
const AUTOPLAY_INTERVAL = 3000;

function subscribeFinePointer(onChange: () => void) {
  const mediaQuery = window.matchMedia(FINE_POINTER_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}
function getFinePointerSnapshot() {
  return window.matchMedia(FINE_POINTER_QUERY).matches;
}
function getFinePointerServerSnapshot() {
  return false;
}

export default function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const sorted = [...images].sort((a, b) => a.displayOrder - b.displayOrder);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const isFinePointer = useSyncExternalStore(
    subscribeFinePointer,
    getFinePointerSnapshot,
    getFinePointerServerSnapshot
  );
  const [isZooming, setIsZooming] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  const active = sorted[activeIndex] ?? sorted[0];

  function goTo(index: number) {
    setActiveIndex((index + sorted.length) % sorted.length);
  }

  // Autoplay — pause on hover/touch
  useEffect(() => {
    if (sorted.length <= 1 || isPaused) return;
    autoplayRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % sorted.length);
    }, AUTOPLAY_INTERVAL);
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [sorted.length, isPaused]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      goTo(delta > 0 ? activeIndex - 1 : activeIndex + 1);
    }
    touchStartX.current = null;
    // Resume autoplay after 2s of inactivity
    setTimeout(() => setIsPaused(false), 2000);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isFinePointer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    });
  }

  function handleMouseEnter() {
    if (isFinePointer) {
      setIsZooming(true);
      setIsPaused(true);
    }
  }

  function handleMouseLeave() {
    setIsZooming(false);
    setIsPaused(false);
  }

  if (!active) {
    return <div className="aspect-square w-full rounded-2xl bg-gray-100" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div
        className={`relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-50 shadow-sm ${
          isFinePointer ? "cursor-zoom-in" : ""
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Zoom wrapper */}
        <div
          className="absolute inset-0 transition-transform duration-200 ease-out"
          style={{
            transform: isZooming ? `scale(${ZOOM_SCALE})` : "scale(1)",
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
          />
        </div>

        {/* Prev / Next arrows — visible on all sizes */}
        {sorted.length > 1 && (
          <>
            <button
              onClick={() => { goTo(activeIndex - 1); setIsPaused(true); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} className="text-gray-700" />
            </button>

            <button
              onClick={() => { goTo(activeIndex + 1); setIsPaused(true); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md backdrop-blur-sm transition hover:bg-white active:scale-95"
              aria-label="Next image"
            >
              <ChevronRight size={20} className="text-gray-700" />
            </button>

            {/* Image counter badge */}
            <div className="absolute right-3 top-3 rounded-full bg-black/40 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
              {activeIndex + 1}/{sorted.length}
            </div>

            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {sorted.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => { setActiveIndex(index); setIsPaused(true); }}
                  aria-label={`Go to image ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeIndex
                      ? "w-6 bg-brand"
                      : "w-1.5 bg-white/70"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip — horizontal scroll on mobile, always visible */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {sorted.map((image, index) => (
            <button
              key={image.id}
              onClick={() => { setActiveIndex(index); setIsPaused(true); }}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                index === activeIndex
                  ? "border-brand shadow-sm shadow-brand/30 scale-105"
                  : "border-transparent opacity-60 hover:opacity-90 hover:border-gray-300"
              }`}
            >
              <Image
                src={image.url}
                alt={image.altText ?? productName}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
