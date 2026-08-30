import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login / Sign Up",
  description: "Login or create your Shopka account in seconds with an OTP on WhatsApp or SMS.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
