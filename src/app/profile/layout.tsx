import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account",
  description: "Manage your Shopka profile, addresses, orders and wishlist.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
