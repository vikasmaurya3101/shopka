"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { useSession } from "@/providers/SessionProvider";
import { OrderData } from "@/types/order";
import { formatCurrency } from "@/lib/utils/currency";
import { getPrepaidAmount, PREPAID_DISCOUNT } from "@/lib/utils/discount";
import Loader from "@/components/ui/Loader";

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-brand-50 text-brand",
  PROCESSING: "bg-brand-50 text-brand",
  SHIPPED: "bg-brand-50 text-brand",
  OUT_FOR_DELIVERY: "bg-brand-50 text-brand",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  RETURNED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-700",
};

const statusLabel: Record<string, string> = {
  PENDING: "Order Placed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Return Requested",
  REFUNDED: "Refunded",
};

export default function OrdersPage() {
  const { isAuthenticated, isLoading: isSessionLoading } = useSession();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    fetch("/api/orders")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setOrders(json.data);
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  if (isSessionLoading || isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <Loader size="lg" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-lg text-gray-600">Please login to view your orders.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-5 text-xl font-bold text-gray-800">My Orders</h1>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border bg-white p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
              <PackageSearch className="h-8 w-8 text-brand" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-semibold text-gray-800">No orders yet</p>
              <p className="mt-1 text-sm text-gray-400">
                Explore some new arrivals and place your first order.
              </p>
            </div>
            <Link
              href="/search?newArrival=true"
              className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-brand-dark"
            >
              ✨ Explore New Arrivals
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

              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block rounded-xl border bg-white p-4 transition hover:shadow-md"
                >
                  <div className="flex gap-4">
                    {/* Product image */}
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-gray-50">
                      {firstItem?.productImage ? (
                        <Image
                          src={firstItem.productImage}
                          alt={firstItem.productName}
                          fill
                          sizes="64px"
                          className="object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl">📦</div>
                      )}
                    </div>

                    {/* Main info */}
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {firstItem?.productName ?? "Order"}
                          {extraCount > 0 && (
                            <span className="ml-1 font-normal text-gray-500">
                              +{extraCount} more
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-400">
                          #{order.invoiceNumber} ·{" "}
                          {new Date(order.placedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      {/* Pay Now prompt — same black-outline style as the order detail page */}
                      {isPendingPayment && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border-2 border-gray-900 bg-white px-2.5 py-1 text-xs font-semibold text-gray-900">
                            💳 Pay Now
                          </span>
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                            Save ₹{PREPAID_DISCOUNT}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right side: amount + status */}
                    <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                      {isPendingPayment ? (
                        <div className="text-right">
                          <span className="block text-xs text-gray-400 line-through">
                            {formatCurrency(order.totalAmount)}
                          </span>
                          <span className="text-sm font-bold text-green-600">
                            ₹{getPrepaidAmount(Number(order.totalAmount)).toFixed(0)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          statusColors[order.orderStatus] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabel[order.orderStatus] ?? order.orderStatus.replace(/_/g, " ")}
                      </span>
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
