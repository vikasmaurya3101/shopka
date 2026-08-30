import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Results",
  description: "Search Shopka's catalog for the best prices across every category.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
