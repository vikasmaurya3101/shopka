import type { Metadata } from "next";
import { Heart, ShieldCheck, Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | Shopka",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          About Shopka
        </h1>

        <p className="mt-6 text-gray-600">
          Shopka was started with one simple idea:{" "}
          <span className="font-semibold text-brand">
            Smart Shopping Starts Here
          </span>{" "}
          — everyday products at prices that actually make sense, without
          compromising on quality.
        </p>

        <p className="mt-4 text-gray-600">
          We handpick every product listed on Shopka, negotiate directly
          with suppliers to cut out unnecessary markups, and pass those
          savings straight to you. No middlemen, no inflated prices —
          just honest deals on the things you buy every day.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 text-center">
            <Heart size={28} className="mx-auto text-brand" />
            <p className="mt-3 font-semibold text-gray-800">
              Handpicked Quality
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Every product is checked before it goes live.
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 text-center">
            <ShieldCheck size={28} className="mx-auto text-brand" />
            <p className="mt-3 font-semibold text-gray-800">
              Honest Pricing
            </p>
            <p className="mt-1 text-sm text-gray-500">
              No hidden charges, no last-minute markups.
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 text-center">
            <Truck size={28} className="mx-auto text-brand" />
            <p className="mt-3 font-semibold text-gray-800">
              Fast Delivery
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Straight to your door, tracked all the way.
            </p>
          </div>
        </div>

        <p className="mt-10 text-sm text-gray-500">
          Have a question about an order, a product, or just want to say hi?{" "}
          <a href="/contact" className="text-brand hover:underline">
            Get in touch
          </a>{" "}
          — we&apos;d love to hear from you.
        </p>
      </div>
    </main>
  );
}
