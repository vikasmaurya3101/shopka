"use client";

import Image from "next/image";
import { useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductImageData } from "@/types/product";

interface ProductImageGalleryProps {
  images: ProductImageData[];
  productName: string;
}

const SWIPE_THRESHOLD = 40;
const ZOOM_SCALE = 2.2;
const FINE_POINTER_QUERY = "(pointer: fine)";

// Subscribing to matchMedia via useSyncExternalStore (rather than the more
// typical useState+useEffect combo) keeps this SSR-safe without causing an
// extra post-mount render: the server snapshot is always `false`, and React
// resolves the real value during the client's hydration pass.
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
  const sorted = [...images].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Hover-to-zoom is desktop/mouse only. `pointer: fine` also guards
  // against touchscreen laptops that can fire synthetic mouse events.
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

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;

    const delta = e.changedTouches[0].clientX - touchStartX.current;

    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      goTo(delta > 0 ? activeIndex - 1 : activeIndex + 1);
    }

    touchStartX.current = null;
  }

  // Magnifying-glass zoom: track the cursor's relative position inside the
  // frame and use it as the transform-origin while the image is scaled up,
  // so the zoomed area follows the pointer. Only bound via mouse events —
  // touch interactions never fire these, so swipe/tap behavior is untouched.
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
    if (isFinePointer) setIsZooming(true);
  }

  function handleMouseLeave() {
    setIsZooming(false);
  }

  if (!active) {
    return (
      <div className="aspect-square w-full rounded-xl bg-gray-100" />
    );
  }

  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row">
      <div className="hidden gap-3 overflow-x-auto sm:flex sm:flex-col sm:overflow-visible">
        {sorted.map((image, index) => (
          <button
            key={image.id}
            onClick={() => setActiveIndex(index)}
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
              index === activeIndex
                ? "border-brand"
                : "border-transparent hover:border-gray-300"
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

      <div
        className={`relative aspect-square w-full flex-1 overflow-hidden rounded-xl bg-gray-50 ${
          isFinePointer ? "cursor-zoom-in" : ""
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
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
            className="object-contain"
            priority
          />
        </div>

        {sorted.length > 1 && (
          <>
            <button
              onClick={() => goTo(activeIndex - 1)}
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-sm transition hover:bg-white sm:flex"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={() => goTo(activeIndex + 1)}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-sm transition hover:bg-white sm:flex"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>

            {/* Dot indicators — swipeable on mobile, matches thumbnail rail on desktop */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 sm:hidden">
              {sorted.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Go to image ${index + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeIndex
                      ? "w-5 bg-brand"
                      : "w-1.5 bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
