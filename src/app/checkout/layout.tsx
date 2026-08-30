import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Securely complete your Shopka order — address, payment and review.",
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
