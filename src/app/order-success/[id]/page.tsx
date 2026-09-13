"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Package, ShoppingBag } from "lucide-react";
import { OrderData } from "@/types/order";
import { formatCurrency } from "@/lib/utils/currency";
import Loader from "@/components/ui/Loader";

/**
 * Full-screen "Order Placed!" confirmation shown right after checkout.
 * Reached via /order-success/[id] — checkout.tsx redirects here instead of
 * straight to the order detail page, then this page offers a button through
 * to the full order details.
 */
export default function OrderSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const json = await res.json();
        if (json.success) setOrder(json.data);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [orderId]);

  useEffect(() => {
    // Best-effort — if the sound file isn't there yet, or the browser
    // blocks autoplay audio, this just silently does nothing.
    const audio = new Audio("/sounds/order-success.mp3");
    audio.volume = 0.6;
    audio.play().catch(() => {});
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-success px-6 py-16 text-center text-white">
      {/* Depth via neutral black/white overlays only — no new color introduced */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/20" />
      <div className="relative z-10 flex w-full flex-col items-center">
      {/* Animated checkmark */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
        className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white/15"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 1.15, 1], opacity: 1 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full border-2 border-white/40"
        />
        <svg
          width="56"
          height="56"
          viewBox="0 0 52 52"
          className="relative"
        >
          <motion.circle
            cx="26"
            cy="26"
            r="24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          />
          <motion.path
            fill="none"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 27l7 7 17-17"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.55 }}
          />
        </svg>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mt-8 text-3xl font-bold sm:text-4xl"
      >
        Order Placed!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85 }}
        className="mt-2 max-w-sm text-white/90"
      >
        Thank you for shopping with us — your order is confirmed and on its way.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-8 w-full max-w-sm rounded-2xl bg-white/10 p-5 backdrop-blur-sm"
      >
        {isLoading ? (
          <div className="flex justify-center py-2">
            <Loader />
          </div>
        ) : order ? (
          <div className="space-y-2 text-left text-sm">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Order Number</span>
              <span className="font-semibold">{order.invoiceNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Amount Paid</span>
              <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Payment Method</span>
              <span className="font-semibold">
                {order.payment?.method === "COD" ? "Cash on Delivery" : "Prepaid"}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/80">Order confirmed.</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.15 }}
        className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row"
      >
        <button
          onClick={() => router.push(`/orders/${orderId}`)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-3 font-semibold text-success transition hover:bg-white/90"
        >
          <Package size={18} />
          View Order
        </button>
        <Link
          href="/"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-white/60 py-3 font-semibold text-white transition hover:bg-white/10"
        >
          <ShoppingBag size={18} />
          Continue Shopping
        </Link>
      </motion.div>
      </div>
    </main>
  );
}
