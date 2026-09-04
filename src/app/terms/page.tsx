import type { Metadata } from "next";
import { getPublicSettings, resolveContactEmail } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Terms of Service | Shopka",
  description:
    "The terms governing your use of Shopka (shopka.in) — accounts, orders and pricing, Cash on Delivery and online payments, WhatsApp updates, returns, grievance redressal, and governing law.",
};

/** Named point of contact required by the Consumer Protection (E-Commerce) Rules, 2020. */
const GRIEVANCE_OFFICER = {
  name: "Vikas Maurya",
  email: "vikasmaurya@shopka.in",
};

export default async function TermsPage() {
  const settings = await getPublicSettings();
  const email = resolveContactEmail(settings);
  const address = settings.address?.trim();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Terms of Service
        </h1>

        <p className="mt-2 text-xs text-gray-400">Last updated: 3 September 2026</p>

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
                href={`mailto:${email}`}
                className="text-brand hover:underline"
              >
                {email}
              </a>
              <br />
              Website:{" "}
              <a href="https://shopka.in" className="text-brand hover:underline">
                https://shopka.in
              </a>
              {address && (
                <>
                  <br />
                  Registered Address: {address}
                </>
              )}
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
              You can pay online or by Cash on Delivery, where available for your
              pin code:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Online payment</strong> — UPI, debit and credit cards,
                net banking and wallets, processed by Razorpay Software Private
                Limited. Card and bank details are entered on Razorpay&apos;s
                secure checkout and are never stored on our servers.
              </li>
              <li>
                <strong>Cash on Delivery (COD)</strong> — payment due in full to
                the courier at the time of delivery. Some products are not
                eligible for COD; the product page and checkout will say so.
              </li>
            </ul>
            <p className="mt-2">
              Delivery charges, where they apply, are shown per product and again
              in your cart and order summary before you pay. Refunds for prepaid
              orders are returned to the original payment method.
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
                href={`mailto:${email}`}
                className="text-brand hover:underline"
              >
                {email}
              </a>{" "}
              or by replying STOP to any WhatsApp message from us. Opting out is
              acted on automatically and does not affect your ability to order.
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
              12. Grievance Redressal
            </h2>
            <p>
              In accordance with the Consumer Protection (E-Commerce) Rules, 2020
              and the Information Technology (Intermediary Guidelines) Rules,
              2021, complaints may be addressed to our Grievance Officer:
            </p>
            <p className="mt-2">
              {GRIEVANCE_OFFICER.name}
              <br />
              Grievance Officer, Shopka
              <br />
              <a
                href={`mailto:${GRIEVANCE_OFFICER.email}`}
                className="text-brand hover:underline"
              >
                {GRIEVANCE_OFFICER.email}
              </a>
              {address && (
                <>
                  <br />
                  {address}
                </>
              )}
            </p>
            <p className="mt-2">
              We acknowledge complaints within 48 hours and aim to resolve them
              within one month of receipt.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              13. Contact Us
            </h2>
            <p>For any questions regarding these Terms, contact us:</p>
            <p className="mt-2">
              Email:{" "}
              <a
                href={`mailto:${email}`}
                className="text-brand hover:underline"
              >
                {email}
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
