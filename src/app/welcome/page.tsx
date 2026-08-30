import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Welcome | Shopka",
};

export default function WelcomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-brand-50 via-white to-accent-50 p-6 text-center">
      <CheckCircle2 size={56} className="text-success" />

      <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
        Welcome to Shopka!
      </h1>

      <p className="max-w-md text-gray-600">
        Your account is ready. Start exploring thousands of products at the
        best prices from sellers across India.
      </p>

      <Link
        href="/"
        className="mt-4 brand-glow rounded-full bg-brand px-8 py-3 font-semibold text-white transition hover:scale-105 hover:bg-brand-dark"
      >
        Start Shopping
      </Link>
    </main>
  );
}
