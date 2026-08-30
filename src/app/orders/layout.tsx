import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Orders",
  description: "Track, manage and view your Shopka order history.",
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
