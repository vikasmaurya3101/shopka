import type { Metadata } from "next";
import {
  Heart,
  ShieldCheck,
  Truck,
  Star,
  Users,
  Globe,
  Mail,
  Headphones,
  TrendingUp,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | Shopka",
  description:
    "Learn about Shopka — India's trusted destination for trending products at honest prices, delivered fast across India.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50">

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 py-20 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand">
          Shopka · Est. 2026
        </p>
        <h1 className="mt-3 text-4xl font-extrabold text-white sm:text-5xl">
          All Trending Products Here
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-gray-400">
          We started Shopka with one belief — every Indian deserves quality
          products at prices that actually make sense. No gimmicks, no hidden
          markups. Just honest deals, delivered fast.
        </p>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">

        {/* Mission */}
        <section>
          <h2 className="text-2xl font-extrabold text-gray-900">Our Mission</h2>
          <p className="mt-4 leading-relaxed text-gray-600">
            Shopka is an Indian e-commerce platform built on a straightforward
            promise: bring the most trending, quality-checked products to your
            doorstep — at prices that cut out unnecessary middlemen. We work
            directly with suppliers, negotiate hard on your behalf, and pass
            every rupee of savings straight to you.
          </p>
          <p className="mt-4 leading-relaxed text-gray-600">
            From electronics and fashion to home essentials and books, every
            product listed on Shopka is handpicked, quality-verified, and priced
            honestly. We believe shopping should feel good — not like a battle
            against hidden charges and inflated MRPs.
          </p>
        </section>

        {/* Pillars */}
        <section className="mt-12 grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: <Heart size={26} className="text-brand" />,
              title: "Handpicked Quality",
              desc: "Every product is reviewed before it goes live. If we wouldn't buy it ourselves, it doesn't make the cut.",
            },
            {
              icon: <ShieldCheck size={26} className="text-brand" />,
              title: "Honest Pricing",
              desc: "No hidden charges. No last-minute markups at checkout. The price you see is the price you pay.",
            },
            {
              icon: <Truck size={26} className="text-brand" />,
              title: "Fast Delivery",
              desc: "Orders dispatched quickly and tracked all the way. You always know where your package is.",
            },
            {
              icon: <Star size={26} className="text-brand" />,
              title: "Customer First",
              desc: "Easy returns, responsive support, and policies built around what's fair for you — not just for us.",
            },
            {
              icon: <TrendingUp size={26} className="text-brand" />,
              title: "Always Trending",
              desc: "Our catalogue is updated regularly so you always have access to what's fresh and in demand.",
            },
            {
              icon: <Globe size={26} className="text-brand" />,
              title: "Pan-India Reach",
              desc: "We deliver across India — whether you're in a metro or a tier-3 city, Shopka reaches you.",
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border bg-white p-6 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
                {icon}
              </div>
              <p className="mt-4 font-semibold text-gray-800">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">{desc}</p>
            </div>
          ))}
        </section>

        {/* Why Shopka */}
        <section className="mt-14">
          <h2 className="text-2xl font-extrabold text-gray-900">
            Why Shopka?
          </h2>
          <ul className="mt-5 space-y-3">
            {[
              "Direct supplier partnerships — lower prices, no middlemen",
              "Secure checkout with UPI, cards, and Cash on Delivery",
              "7-day returns on most products, no questions asked",
              "Dedicated customer support via WhatsApp, SMS, and email",
              "Real-time order tracking from dispatch to doorstep",
              "Trusted by customers across India since 2026",
            ].map((point) => (
              <li key={point} className="flex items-start gap-3 text-gray-600">
                <ShieldCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-brand"
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Contact Grid */}
        <section className="mt-14">
          <h2 className="text-2xl font-extrabold text-gray-900">
            Get in Touch
          </h2>
          <p className="mt-2 text-gray-600">
            We&apos;re a real team and we actually read our emails. Reach out —
            we&apos;ll get back to you.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <a
              href="/contact"
              className="flex flex-col items-start gap-2 rounded-xl border bg-white p-5 shadow-sm transition hover:border-brand"
            >
              <Headphones size={22} className="text-brand" />
              <p className="font-semibold text-gray-800">Customer Support</p>
              <p className="text-sm text-gray-500">
                Orders, returns, delivery — we&apos;ve got you covered.
              </p>
              <span className="text-sm font-medium text-brand">
                support@shopka.in
              </span>
            </a>

            <a
              href="mailto:sales@shopka.in"
              className="flex flex-col items-start gap-2 rounded-xl border bg-white p-5 shadow-sm transition hover:border-brand"
            >
              <Users size={22} className="text-brand" />
              <p className="font-semibold text-gray-800">Sales & Partnerships</p>
              <p className="text-sm text-gray-500">
                Bulk orders, brand partnerships, and wholesale queries.
              </p>
              <span className="text-sm font-medium text-brand">
                sales@shopka.in
              </span>
            </a>

            <a
              href="mailto:support@shopka.in"
              className="flex flex-col items-start gap-2 rounded-xl border bg-white p-5 shadow-sm transition hover:border-brand"
            >
              <Mail size={22} className="text-brand" />
              <p className="font-semibold text-gray-800">General Enquiries</p>
              <p className="text-sm text-gray-500">
                Press, feedback, or anything else — we&apos;re listening.
              </p>
              <span className="text-sm font-medium text-brand">
                support@shopka.in
              </span>
            </a>
          </div>
        </section>

        {/* Footer note */}
        <p className="mt-14 text-center text-sm text-gray-400">
          Shopka is operated by{" "}
          <span className="font-medium text-gray-600">Vikas Maurya</span> —
          proudly built in India 🇮🇳
        </p>
      </div>
    </main>
  );
}
