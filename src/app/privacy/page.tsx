import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Shopka collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Privacy Policy
        </h1>

        <p className="mt-2 text-xs text-gray-400">
          Last updated:{" "}
          {new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-gray-600">
          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              1. Information We Collect
            </h2>
            <p>
              To create an account and process orders, we collect your mobile
              number, name, email (optional), delivery addresses, and order
              history. We also collect basic usage data (pages viewed, items
              wishlisted/carted) to improve recommendations and site
              performance.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              2. How We Use Your Information
            </h2>
            <p>
              We use your information to verify your identity (via OTP),
              fulfil and deliver orders, send order/account updates, provide
              customer support, and improve our products and services. We do
              not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              3. OTP Verification &amp; Messaging
            </h2>
            <p>
              We verify your mobile number using a one-time password (OTP)
              sent via WhatsApp or SMS through trusted providers (currently
              AiSensy for WhatsApp and Message Central for SMS). These
              providers process your number solely to deliver the OTP and do
              not use it for marketing on our behalf.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              4. Payments
            </h2>
            <p>
              Online payments are processed by Razorpay. We do not store your
              full card, UPI, or bank details on our servers — Razorpay
              handles that securely under its own PCI-DSS compliant systems.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              5. Cookies &amp; Sessions
            </h2>
            <p>
              We use a secure session cookie to keep you logged in and a
              local cart for guests who haven&apos;t signed in yet. We don&apos;t use
              third-party advertising trackers.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              6. Data Sharing
            </h2>
            <p>
              We share only what&apos;s necessary with logistics partners (for
              delivery), payment processors (for payment), and messaging
              providers (for OTP/order alerts) — solely to fulfil your orders
              and keep you informed about them.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              7. Your Choices
            </h2>
            <p>
              You can update your profile details or addresses anytime from{" "}
              <a href="/profile" className="text-brand hover:underline">
                My Account
              </a>
              . To request deletion of your account and associated data,
              contact us via the{" "}
              <a href="/contact" className="text-brand hover:underline">
                Contact page
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this policy from time to time. Continued use of
              Shopka after changes means you accept the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              9. Contact
            </h2>
            <p>
              Questions about your privacy or data? Reach out via our{" "}
              <a href="/contact" className="text-brand hover:underline">
                Contact page
              </a>
              .
            </p>
          </section>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          This is a general template, not legal advice — have a lawyer
          review it against India&apos;s Digital Personal Data Protection
          (DPDP) Act before launch.
        </p>
      </div>
    </main>
  );
}
