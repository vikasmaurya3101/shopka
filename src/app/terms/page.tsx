import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Shopka",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Terms of Service
        </h1>

        <p className="mt-2 text-xs text-gray-400">
          Last updated: {new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-gray-600">
          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              1. Acceptance of Terms
            </h2>
            <p>
              By creating an account or placing an order on Shopka, you
              agree to these Terms of Service and our Return &amp; Refund
              Policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              2. Accounts
            </h2>
            <p>
              You&apos;re responsible for keeping your account credentials
              secure and for all activity under your account. You must
              provide accurate information when signing up and placing
              orders.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              3. Orders &amp; Pricing
            </h2>
            <p>
              Product prices, availability, and offers are subject to change
              without notice. We reserve the right to cancel any order due
              to pricing errors, stock unavailability, or suspected
              fraudulent activity.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              4. Payments
            </h2>
            <p>
              Orders are currently fulfilled via Cash on Delivery. Payment is
              due in full at the time of delivery.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              5. Returns &amp; Refunds
            </h2>
            <p>
              Returns and refunds are handled according to our{" "}
              <a href="/returns" className="text-brand hover:underline">
                Return &amp; Refund Policy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              6. Limitation of Liability
            </h2>
            <p>
              Shopka is not liable for indirect or incidental damages
              arising from the use of our platform, to the maximum extent
              permitted by applicable law.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              7. Changes to These Terms
            </h2>
            <p>
              We may update these terms from time to time. Continued use of
              Shopka after changes means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              8. Contact
            </h2>
            <p>
              Questions about these terms? Reach out via our{" "}
              <a href="/contact" className="text-brand hover:underline">
                Contact page
              </a>
              .
            </p>
          </section>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          This is a general template, not legal advice — have a lawyer
          review it against Indian consumer protection and e-commerce
          regulations before launch.
        </p>
      </div>
    </main>
  );
}
