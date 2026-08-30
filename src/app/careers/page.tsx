import type { Metadata } from "next";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Careers | Shopka",
};

export default function CareersPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4 py-12 text-center">
      <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
        Careers at Shopka
      </h1>

      <p className="max-w-md text-gray-600">
        We&apos;re a small, growing team and don&apos;t have open positions
        right now — but we&apos;re always happy to hear from people who love
        what we&apos;re building.
      </p>

      <a
        href="mailto:careers@shopka.in"
        className="mt-2 flex items-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
      >
        <Mail size={18} />
        careers@shopka.in
      </a>
    </main>
  );
}
