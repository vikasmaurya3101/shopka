import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Shopka",
  description:
    "The terms governing your use of Shopka (shopka.in) — accounts, orders and pricing, Cash on Delivery payments, WhatsApp updates, returns, and governing law.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Terms of Service
        </h1>

        <p className="mt-2 text-xs text-gray-400">Last updated: 1 September 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-gray-600">
          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using Shopka (shopka.in), you agree to be bound
              by these Terms of Service and all applicable Indian laws and
              regulations.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              2. About Us
            </h2>
            <p>
              Shopka is an Indian e-commerce platform operated by Vikas Maurya,
              selling trending consumer products across India.
            </p>
            <p className="mt-2">
              Business Email:{" "}
              <a
                href="mailto:supportshopka@gmail.com"
                className="text-brand hover:underline"
              >
                supportshopka@gmail.com
              </a>
              <br />
              Website:{" "}
              <a href="https://shopka.in" className="text-brand hover:underline">
                https://shopka.in
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              3. Accounts
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activity under your account. You
              must provide accurate and complete information when registering.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              4. Orders &amp; Pricing
            </h2>
            <p>
              Product prices, availability, and offers are subject to change
              without notice. We reserve the right to cancel any order due to
              pricing errors, stock unavailability, or suspected fraudulent
              activity. You will be notified immediately in such cases.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              5. Payments
            </h2>
            <p>
              We currently accept Cash on Delivery (COD). Payment is due in full
              at the time of delivery. Online payment options may be introduced
              in the future.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              6. WhatsApp Communication &amp; Consent
            </h2>
            <p>
              By placing an order or signing up on Shopka, and by checking the
              WhatsApp consent checkbox, you explicitly consent to receive order
              confirmations, delivery updates, and customer support messages via
              WhatsApp on the mobile number you provide. You may opt out at any
              time by contacting us at{" "}
              <a
                href="mailto:supportshopka@gmail.com"
                className="text-brand hover:underline"
              >
                supportshopka@gmail.com
              </a>{" "}
              or by replying STOP to any WhatsApp message from us.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              7. Returns &amp; Refunds
            </h2>
            <p>
              Returns and refunds are governed by our{" "}
              <a href="/returns" className="text-brand hover:underline">
                Return &amp; Refund Policy
              </a>{" "}
              available at shopka.in/returns.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              8. Prohibited Use
            </h2>
            <p>You agree not to use Shopka:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>for any unlawful purpose;</li>
              <li>to submit false information;</li>
              <li>to infringe on any intellectual property rights; or</li>
              <li>to engage in any activity that disrupts the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              9. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable Indian law, Shopka
              shall not be liable for any indirect, incidental, or consequential
              damages arising from the use of our platform.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              10. Governing Law
            </h2>
            <p>
              These Terms are governed by the laws of India. Any disputes shall
              be subject to the exclusive jurisdiction of courts in Uttar
              Pradesh, India.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              11. Changes to These Terms
            </h2>
            <p>
              We may update these Terms from time to time. Continued use of
              Shopka after changes constitutes your acceptance of the updated
              Terms. We will notify registered users of significant changes via
              email or WhatsApp.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              12. Contact Us
            </h2>
            <p>For any questions regarding these Terms, contact us:</p>
            <p className="mt-2">
              Email:{" "}
              <a
                href="mailto:supportshopka@gmail.com"
                className="text-brand hover:underline"
              >
                supportshopka@gmail.com
              </a>
              <br />
              Website:{" "}
              <a href="/contact" className="text-brand hover:underline">
                shopka.in/contact
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
