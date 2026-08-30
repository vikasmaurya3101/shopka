"use client";

import Link from "next/link";
import { useEffect, useReducer } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Sparkles, Truck, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BannerSlide {
  icon: LucideIcon;
  iconClassName: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
}

const SLIDES: BannerSlide[] = [
  {
    icon: Zap,
    iconClassName: "fill-gold text-gold",
    eyebrow: "Limited Time",
    title: "Shopka Mega Sale",
    subtitle: "Up to 80% off on selected products, today only",
    ctaLabel: "Shop the sale",
    ctaHref: "/search?sort=discount",
  },
  {
    icon: Sparkles,
    iconClassName: "fill-gold text-gold",
    eyebrow: "Just Landed",
    title: "New Arrivals, Daily",
    subtitle: "Fresh styles and gadgets added to Shopka every day",
    ctaLabel: "See what's new",
    ctaHref: "/search?newArrival=true",
  },
  {
    icon: Truck,
    iconClassName: "text-white",
    eyebrow: "On Us",
    title: "Free Delivery Storewide",
    subtitle: "Free shipping on eligible orders, no minimum spend",
    ctaLabel: "Start shopping",
    ctaHref: "/search",
  },
];

const AUTOPLAY_DELAY_MS = 6000;

export default function BannerCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });

  // See ProductRail for why this is a re-render counter rather than state
  // mirroring emblaApi's internals: Embla mutates itself outside of React
  // (autoplay, drag, dot clicks), so selectedIndex below is always read
  // fresh from the API on every render instead.
  const [, notifyChange] = useReducer((tick: number) => tick + 1, 0);

  useEffect(() => {
    if (!emblaApi) return;

    emblaApi.on("select", notifyChange);
    emblaApi.on("reInit", notifyChange);

    return () => {
      emblaApi.off("select", notifyChange);
      emblaApi.off("reInit", notifyChange);
    };
  }, [emblaApi]);

  // Single looped row, so autoplay never needs to worry about reaching an end.
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => emblaApi.scrollNext(), AUTOPLAY_DELAY_MS);
    return () => clearInterval(interval);
  }, [emblaApi]);

  const selectedIndex = emblaApi?.selectedScrollSnap() ?? 0;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {SLIDES.map((slide) => {
              const Icon = slide.icon;

              return (
                <div key={slide.title} className="min-w-0 flex-[0_0_100%]">
                  <div className="brand-glow flex h-56 flex-col items-center justify-center gap-3 brand-gradient px-6 text-center text-white sm:h-64">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur">
                      <Icon size={13} className={slide.iconClassName} />
                      {slide.eyebrow}
                    </span>
                    <h2 className="text-3xl font-extrabold sm:text-4xl">
                      {slide.title}
                    </h2>
                    <p className="max-w-md text-sm text-white/85 sm:text-base">
                      {slide.subtitle}
                    </p>
                    <Link
                      href={slide.ctaHref}
                      className="tap-shrink mt-1 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-brand-dark transition hover:scale-[1.03] hover:bg-brand-50"
                    >
                      {slide.ctaLabel}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => emblaApi?.scrollPrev()}
          aria-label="Previous banner"
          className="tap-shrink absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md transition hover:bg-white"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => emblaApi?.scrollNext()}
          aria-label="Next banner"
          className="tap-shrink absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md transition hover:bg-white"
        >
          <ChevronRight size={18} />
        </button>

        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                index === selectedIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
