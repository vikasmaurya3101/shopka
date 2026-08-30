import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Return & Refund Policy | Shopka",
};

export default function ReturnsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Return &amp; Refund Policy
        </h1>

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
              Contact us with your order number and the reason for the
              return. Our team will confirm the pickup or drop-off process
              for your item.
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
              will be processed within 5–7 business days. Since we currently
              accept Cash on Delivery, refunds are issued via bank transfer
              or UPI to the details you provide us.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              Damaged or Wrong Item
            </h2>
            <p>
              If you receive a damaged, defective, or incorrect product,
              contact us within 48 hours of delivery with photos of the
              item — we&apos;ll arrange a replacement or full refund at no
              extra cost to you.
            </p>
          </section>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          This is a general policy template — have it reviewed against
          India&apos;s Consumer Protection (E-Commerce) Rules, 2020 before
          launch, and adjust the return window/exclusions to match what you
          can actually support.
        </p>
      </div>
    </main>
  );
}
