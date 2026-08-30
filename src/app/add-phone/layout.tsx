import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Phone Number",
  description: "Verify a mobile number to secure your Shopka account.",
};

export default function AddPhoneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
