"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Package,
  PackageSearch,
  Sparkles,
} from "lucide-react";
import { useSession } from "@/providers/SessionProvider";
import { OrderData } from "@/types/order";
import { formatCurrency } from "@/lib/utils/currency";
import { getPrepaidAmount, PREPAID_DISCOUNT } from "@/lib/utils/discount";
import Loader from "@/components/ui/Loader";

const STATUS_META: Record<
  string,
  { label: string; bg: string; dot: string; text: string }
> = {
  PENDING:          { label: "Order Placed",      bg: "bg-amber-50",   dot: "bg-amber-400",  text: "text-amber-700"  },
  CONFIRMED:        { label: "Confirmed",          bg: "bg-blue-50",    dot: "bg-blue-500",   text: "text-blue-700"   },
  PROCESSING:       { label: "Processing",         bg: "bg-blue-50",    dot: "bg-blue-500",   text: "text-blue-700"   },
  SHIPPED:          { label: "Shipped",            bg: "bg-brand/10",   dot: "bg-brand",      text: "text-brand"      },
  OUT_FOR_DELIVERY: { label: "Out for Delivery",   bg: "bg-brand/10",   dot: "bg-brand",      text: "text-brand"      },
  DELIVERED:        { label: "Delivered",          bg: "bg-green-50",   dot: "bg-green-500",  text: "text-green-700"  },
  CANCELLED:        { label: "Cancelled",          bg: "bg-red-50",     dot: "bg-red-400",    text: "text-red-600"    },
  RETURNED:         { label: "Return Requested",   bg: "bg-red-50",     dot: "bg-red-400",    text: "text-red-600"    },
  REFUNDED:         { label: "Refunded",           bg: "bg-gray-100",   dot: "bg-gray-400",   text: "text-gray-600"   },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? {
    label: status.replace(/_/g, " "),
    bg: "bg-gray-100", dot: "bg-gray-400", text: "text-gray-600",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${meta.bg} ${meta.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export default function OrdersPage() {
  const { isAuthenticated, isLoading: isSessionLoading } = useSession();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setIsLoading(false); return; }
    fetch("/api/orders")
      .then((r) => r.json())
      .then((j) => { if (j.success) setOrders(j.data); })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  if (isSessionLoading || isLoading) {
    return <main className="min-h-screen bg-gray-50 p-6"><Loader size="lg" /></main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-lg text-gray-500">Please login to view your orders.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-2xl">

        {/* ── Header ── */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10">
            <Package size={20} className="text-brand" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">My Orders</h1>
            {orders.length > 0 && (
              <p className="text-xs text-gray-400">{orders.length} order{orders.length !== 1 ? "s" : ""} placed</p>
            )}
          </div>
        </div>

        {/* ── Empty state ── */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-3xl border bg-white px-8 py-14 text-center shadow-sm">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/10">
              <PackageSearch className="h-10 w-10 text-brand" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">No orders yet</p>
              <p className="mt-1 text-sm text-gray-400 max-w-xs">
                Explore trending products and place your first order!
              </p>
            </div>
            <Link
              href="/search?newArrival=true"
              className="flex items-center gap-2 rounded-2xl bg-brand px-7 py-3 text-sm font-bold text-white shadow-lg shadow-brand/30 transition hover:bg-brand-dark active:scale-95"
            >
              <Sparkles size={16} className="fill-yellow-300 text-yellow-300" />
              Explore New Arrivals
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const firstItem = order.items[0];
              const extraCount = order.items.length - 1;
              const isPendingPayment =
                order.paymentStatus === "PENDING" &&
                order.orderStatus !== "CANCELLED" &&
                order.orderStatus !== "REFUNDED";

              const dateStr = new Date(order.placedAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              });

              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="group block overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:border-brand/30 hover:shadow-md"
                >
                  {/* Top color strip for pending payment */}
                  {isPendingPayment && (
                    <div className="h-1 w-full bg-gradient-to-r from-brand via-brand-dark to-brand" />
                  )}

                  <div className="flex items-center gap-4 p-4">
                    {/* Product image */}
                    <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border bg-gray-50">
                      {firstItem?.productImage ? (
                        <Image
                          src={firstItem.productImage}
                          alt={firstItem.productName}
                          fill sizes="72px"
                          className="object-contain p-1.5"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl">📦</div>
                      )}
                      {/* extra items bubble */}
                      {extraCount > 0 && (
                        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white shadow">
                          +{extraCount}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <p className="line-clamp-1 text-sm font-semibold text-gray-900 group-hover:text-brand transition-colors">
                        {firstItem?.productName ?? "Order"}
                      </p>

                      <p className="text-[11px] text-gray-400 font-medium">
                        <span className="text-gray-500">#{order.invoiceNumber}</span>
                        <span className="mx-1.5 text-gray-300">·</span>
                        {dateStr}
                      </p>

                      <StatusBadge status={order.orderStatus} />

                      {/* Pay Now badge */}
                      {isPendingPayment && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-3 py-1 text-[11px] font-bold text-white">
                            💳 Pay Now
                          </span>
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">
                            Save ₹{PREPAID_DISCOUNT}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Amount + chevron */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {isPendingPayment ? (
                        <div className="text-right">
                          <span className="block text-[11px] text-gray-400 line-through">
                            {formatCurrency(order.totalAmount)}
                          </span>
                          <span className="text-sm font-extrabold text-green-600">
                            ₹{getPrepaidAmount(Number(order.totalAmount)).toFixed(0)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-extrabold text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      )}
                      <ChevronRight size={16} className="text-gray-300 transition group-hover:text-brand group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
