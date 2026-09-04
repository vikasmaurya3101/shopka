import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Return & Refund Policy | Shopka",
  description: "Shopka's return and refund policy — 7-day returns, refund timelines, and how to raise a request.",
};

export default function ReturnsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Return &amp; Refund Policy
        </h1>
        <p className="mt-2 text-xs text-gray-400">Last updated: 1 September 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-gray-600">
          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              Return Window
            </h2>
            <p>
              You can request a return within 7 days of delivery for most
              products, as long as the item is unused, in its original
              packaging, and with all tags/labels intact.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              How to Request a Return
            </h2>
            <p>
              Contact us at{" "}
              <a href="mailto:support@shopka.in" className="text-brand hover:underline">
                support@shopka.in
              </a>{" "}
              with your order number and the reason for the return. Our team
              will confirm the pickup or drop-off process for your item within
              24–48 hours.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              Non-Returnable Items
            </h2>
            <p>
              Certain items — such as personal care products, innerwear, and
              perishable goods — cannot be returned once delivered, for
              hygiene and safety reasons.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              Refunds
            </h2>
            <p>
              Once we receive and inspect the returned item, your refund
              will be processed within 5–7 business days. Refunds for prepaid
              orders are returned to the original payment method. For Cash on
              Delivery orders, refunds are issued via bank transfer or UPI to
              the details you provide us.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              Damaged or Wrong Item
            </h2>
            <p>
              If you receive a damaged, defective, or incorrect product,
              contact us within 48 hours of delivery with photos of the
              item at{" "}
              <a href="mailto:support@shopka.in" className="text-brand hover:underline">
                support@shopka.in
              </a>{" "}
              — we&apos;ll arrange a replacement or full refund at no extra cost to you.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              Contact Us
            </h2>
            <p>
              For any return or refund queries, email us at{" "}
              <a href="mailto:support@shopka.in" className="text-brand hover:underline">
                support@shopka.in
              </a>{" "}
              or visit{" "}
              <a href="/contact" className="text-brand hover:underline">
                shopka.in/contact
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
