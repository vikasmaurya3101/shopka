"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  ShoppingBag,
  MapPin,
  CreditCard,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { OrderData } from "@/types/order";
import { formatCurrency } from "@/lib/utils/currency";
import Loader from "@/components/ui/Loader";

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
    const audio = new Audio("/sounds/order-success.mp3");
    audio.volume = 0.6;
    audio.play().catch(() => {});
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f0fdf4]">
      {/* Top brand gradient bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-brand via-accent to-brand" />

      {/* Background decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-success/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-6px)] flex-col items-center justify-center px-4 py-12">

        {/* Checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
          className="relative flex h-28 w-28 items-center justify-center"
        >
          {/* Pulse ring */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-success/20"
          />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-success shadow-lg shadow-success/30">
            <svg width="52" height="52" viewBox="0 0 52 52">
              <motion.path
                fill="none"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 27l8 8 20-20"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              />
            </svg>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center"
        >
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Order Placed! 🎉
          </h1>
          <p className="mt-2 text-gray-500">
            Thank you for shopping with{" "}
            <span className="font-semibold text-brand">Shopka</span> — we&apos;re
            on it!
          </p>
        </motion.div>

        {/* Order details card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="mt-8 w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-xl shadow-gray-100"
        >
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader />
            </div>
          ) : order ? (
            <div className="space-y-4">
              {/* Invoice + status */}
              <div className="flex items-center justify-between rounded-xl bg-success-light px-4 py-3">
                <div>
                  <p className="text-xs text-gray-500">Order ID</p>
                  <p className="font-bold text-gray-900 tracking-wide">
                    {order.invoiceNumber}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-success px-3 py-1 text-xs font-semibold text-white">
                  <CheckCircle2 size={12} />
                  Confirmed
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {/* Amount */}
                <div className="flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10">
                    <CreditCard size={16} className="text-brand" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                    {order.payment?.method === "COD"
                      ? "Cash on Delivery"
                      : "Prepaid"}
                  </span>
                </div>

                {/* Delivery */}
                {order.address && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10">
                      <MapPin size={16} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Delivering to</p>
                      <p className="truncate font-medium text-gray-900 text-sm">
                        {order.address.fullName},{" "}
                        {order.address.city}
                      </p>
                    </div>
                  </div>
                )}

                {/* Estimated delivery */}
                <div className="flex items-center gap-3 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10">
                    <Clock size={16} className="text-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Estimated Delivery</p>
                    <p className="font-medium text-gray-900 text-sm">
                      3 – 7 business days
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-gray-500">
              Order confirmed!
            </p>
          )}
        </motion.div>

        {/* WhatsApp note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-4 flex items-center gap-2 rounded-xl bg-[#e7f8ee] px-4 py-2.5 text-sm text-[#1a7a3c]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25d366] shrink-0">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Order update WhatsApp pe bhi aayega!
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row"
        >
          <button
            onClick={() => router.push(`/orders/${orderId}`)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-semibold text-white shadow-md shadow-brand/30 transition hover:bg-brand-dark"
          >
            <Package size={18} />
            Track Order
          </button>
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white py-3.5 font-semibold text-gray-700 transition hover:border-brand hover:text-brand"
          >
            <ShoppingBag size={18} />
            Continue Shopping
          </Link>
        </motion.div>

      </div>
    </main>
  );
}
