import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Shopka collects, uses, shares, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Privacy Policy
        </h1>

        <p className="mt-2 text-xs text-gray-400">
          Last updated: 1 September 2026
        </p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-gray-600">
          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              1. Information We Collect
            </h2>
            <p>
              To create an account and process orders, we collect your mobile
              number, name, email (optional), delivery addresses, and order
              history. We also collect basic usage data to improve our
              services.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              2. How We Use Your Information
            </h2>
            <p>We use your information to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Verify your identity via OTP</li>
              <li>Fulfil and deliver your orders</li>
              <li>Send order confirmations and delivery updates</li>
              <li>Provide customer support</li>
              <li>Improve our platform and services</li>
            </ul>
            <p className="mt-2">
              We do not sell your personal information to any third party.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              3. WhatsApp &amp; SMS Communication
            </h2>
            <p>
              We use WhatsApp and SMS to send you OTP verifications and order
              updates. By providing your mobile number and giving explicit
              consent on our platform, you agree to receive these
              communications. You may opt out at any time by contacting{" "}
              <a
                href="mailto:supportshopka@gmail.com"
                className="text-brand hover:underline"
              >
                supportshopka@gmail.com
              </a>{" "}
              or replying STOP to any WhatsApp message.
            </p>
            <p className="mt-2">
              Our WhatsApp messaging is powered by authorized WhatsApp Business
              Solution Providers. Your number is used solely to deliver OTPs
              and order updates — never for unauthorized marketing.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              4. Payments
            </h2>
            <p>
              Online payments (if applicable) are processed by Razorpay. We do
              not store your card, UPI, or bank details. Razorpay operates
              under PCI-DSS compliant systems.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              5. Cookies &amp; Sessions
            </h2>
            <p>
              We use secure session cookies to keep you logged in. We do not
              use third-party advertising trackers.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              6. Data Sharing
            </h2>
            <p>We share your data only with:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Logistics partners (for delivery)</li>
              <li>Payment processors (for payments)</li>
              <li>Messaging providers (for OTP and order alerts)</li>
            </ul>
            <p className="mt-2">
              All sharing is strictly for order fulfilment purposes only.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              7. Data Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your
              personal data from unauthorized access, alteration, or
              disclosure.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              8. Your Rights
            </h2>
            <p>
              You may update your profile or delivery addresses from{" "}
              <a href="/profile" className="text-brand hover:underline">
                My Account
              </a>
              . To request account or data deletion, contact us via{" "}
              <a href="/contact" className="text-brand hover:underline">
                shopka.in/contact
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              9. Compliance
            </h2>
            <p>
              This Privacy Policy is in accordance with India&apos;s
              Information Technology Act, 2000 and the Digital Personal Data
              Protection (DPDP) Act, 2023.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              10. Changes to This Policy
            </h2>
            <p>
              We may update this policy from time to time. Continued use of
              Shopka after changes means you accept the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              11. Contact
            </h2>
            <p>
              Email:{" "}
              <a
                href="mailto:supportshopka@gmail.com"
                className="text-brand hover:underline"
              >
                supportshopka@gmail.com
              </a>
            </p>
            <p className="mt-2">
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
