"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ShieldCheck, Sparkles, Star, Truck, Zap } from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay, ease: "easeOut" },
  }),
};

interface HeroProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  logoUrl?: string;
  card1Label?: string;
  card1Value?: string;
  card2Label?: string;
  card2Value?: string;
  card3Label?: string;
  card3Value?: string;
}

export default function Hero({
  // Defaults must be claims that are true no matter what the catalogue holds —
  // a hardcoded "Up to 80% off" was advertising a discount no product had, which
  // is a misleading-listing problem under the Meta Commerce Policy and the
  // Consumer Protection Act. Anything numeric is computed in page.tsx from real
  // product data and passed in.
  badge    = "DEALS YOU DON'T WANT TO MISS",
  title    = "All Trending\nProducts here.",
  subtitle = "Unbeatable prices, handpicked quality, and fast delivery — straight to your door, every single day.",
  cta      = "Shop Now",
  logoUrl  = "/brand/logo-128.png",
  card1Label = "Deals",
  card1Value = "Everyday low prices",
  card2Label = "Delivery",
  card2Value = "Fast across India",
  card3Label = "Secure Pay",
  card3Value = "UPI, Cards & COD",
}: HeroProps) {
  return (
    <section className="relative overflow-hidden brand-gradient py-10 text-white sm:py-16">
      {/* Background blobs */}
      <div className="pointer-events-none absolute -top-20 -right-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-8 h-64 w-64 rounded-full bg-brand-400/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 right-1/3 h-48 w-48 -translate-y-1/2 rounded-full bg-accent/20 blur-2xl" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-4 sm:px-6 lg:grid-cols-2">
        {/* ── Left: text ── */}
        <div>
          <motion.span
            initial="hidden"
            animate="show"
            custom={0}
            variants={fadeUp}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur"
          >
            <Sparkles size={13} className="fill-gold text-gold" />
            {badge}
          </motion.span>

          <motion.h1
            initial="hidden"
            animate="show"
            custom={0.1}
            variants={fadeUp}
            className="mt-3 max-w-lg whitespace-pre-line text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl"
          >
            {title}
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="show"
            custom={0.2}
            variants={fadeUp}
            className="mt-3 max-w-md text-sm text-white/85 sm:text-base"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial="hidden"
            animate="show"
            custom={0.3}
            variants={fadeUp}
            className="mt-6 flex flex-wrap items-center gap-3"
          >
            <Link
              href="/search"
              className="brand-glow inline-block rounded-full bg-white px-8 py-3 text-sm font-bold text-brand-dark transition hover:scale-[1.03] hover:bg-brand-50"
            >
              {cta}
            </Link>
            <Link
              href="/search"
              className="inline-block rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Browse All
            </Link>
          </motion.div>
        </div>

        {/* ── Right: floating cards (desktop only) ── */}
        <div className="relative hidden h-72 lg:block">
          {/* Central circle — logo fills the ring, no white border */}
          <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-white/20">
            <Image
              src={logoUrl}
              alt="Shopka"
              fill
              sizes="176px"
              className="object-cover"
              priority
            />
          </div>

          {/* Floating card — Flash Deal */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-6 top-4 flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-sm"
          >
            <Zap size={20} className="fill-gold text-gold" />
            <div>
              <p className="text-[11px] text-white/65">{card1Label}</p>
              <p className="text-sm font-bold text-white">{card1Value}</p>
            </div>
          </motion.div>

          {/* Floating card — Free Shipping */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
            className="absolute left-2 top-20 flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-sm"
          >
            <Truck size={20} className="text-white" />
            <div>
              <p className="text-[11px] text-white/65">{card2Label}</p>
              <p className="text-sm font-bold text-white">{card2Value}</p>
            </div>
          </motion.div>

          {/* Floating card — Secure Pay */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 2.9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute right-4 bottom-2 flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-sm"
          >
            <ShieldCheck size={20} className="fill-gold/20 text-gold" />
            <div>
              <p className="text-[11px] text-white/65">{card3Label}</p>
              <p className="text-sm font-bold text-white">{card3Value}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
