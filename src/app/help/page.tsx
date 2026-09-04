import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSettings, resolveContactEmail } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Help & Support",
  description: "Answers to common questions about orders, shipping, returns, and payments.",
};

const faqs = [
  {
    question: "Where is my order?",
    answer:
      "You can track your order's status anytime from the Orders page in your account. We'll also send you updates by SMS/email as your order is packed, shipped, and delivered.",
  },
  {
    question: "How do I return or exchange an item?",
    answer:
      "Go to Orders, select the item you'd like to return, and choose a reason. Most items are eligible for return within the window shown on the product page. Refunds are issued to your original payment method once the item is received.",
  },
  {
    question: "What payment methods are accepted?",
    answer:
      "We accept UPI, major debit/credit cards, net banking, and popular wallets, all processed securely through Razorpay. Cash on Delivery is available for eligible pin codes.",
  },
  {
    question: "How can I cancel an order?",
    answer:
      "Orders can be cancelled from the Orders page as long as they haven't been shipped yet. Once an order ships, please use the return flow instead.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Reach us using the contact options below and our team will get back to you, usually within 24 hours.",
  },
];

export default async function HelpPage() {
  // Read from settings rather than hardcoding: this page used to advertise a
  // different address from the footer, so customers were told to write to a
  // mailbox nobody was watching.
  const email = resolveContactEmail(await getPublicSettings());

  return (
    <div className="min-h-screen bg-white">
      <section className="brand-gradient py-10 text-white sm:py-14">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Help &amp; Support
          </h1>
          <p className="mt-2 text-sm text-white/90 sm:text-base">
            Find answers to common questions, or get in touch with our team.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="text-xl font-bold text-gray-900">Frequently asked questions</h2>
        <div className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200">
          {faqs.map((faq) => (
            <details key={faq.question} className="group p-4 open:bg-gray-50">
              <summary className="cursor-pointer list-none font-semibold text-gray-900 marker:content-none">
                <span className="flex items-center justify-between gap-4">
                  {faq.question}
                  <span className="text-gray-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6">
        <h2 className="text-xl font-bold text-gray-900">Still need help?</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="font-semibold text-gray-900">Email us</p>
            <p className="mt-1 text-sm text-gray-600">
              <a href={`mailto:${email}`} className="text-brand hover:underline">
                {email}
              </a>
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="font-semibold text-gray-900">Track an order</p>
            <p className="mt-1 text-sm text-gray-600">
              <Link href="/orders" className="text-brand hover:underline">
                Go to your Orders
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}