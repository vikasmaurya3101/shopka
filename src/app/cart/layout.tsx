import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review the items in your Shopka cart before checkout.",
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
