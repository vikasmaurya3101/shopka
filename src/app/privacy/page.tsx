import type { Metadata } from "next";
import { getPublicSettings, resolveContactEmail } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Shopka collects, uses, shares, and protects your personal information.",
};

/** Kept in step with the Grievance Officer named in the Terms of Service. */
const GRIEVANCE_OFFICER = {
  name: "Vikas Maurya",
  email: "support@shopka.in",
};

export default async function PrivacyPage() {
  const settings = await getPublicSettings();
  const email = resolveContactEmail(settings);
  const address = settings.address?.trim();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          Privacy Policy
        </h1>

        <p className="mt-2 text-xs text-gray-400">
          Last updated: 3 September 2026
        </p>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-gray-600">
          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              1. Information We Collect
            </h2>
            <p>We collect only what an order actually needs:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Mobile number</strong> — to create your account and send
                one-time passwords.
              </li>
              <li>
                <strong>Name</strong>, and <strong>email address</strong> if you
                choose to give one.
              </li>
              <li>
                <strong>Delivery addresses</strong> — recipient name, phone,
                full address, pin code and any landmark you add.
              </li>
              <li>
                <strong>Approximate location</strong> — only if you tap
                &ldquo;Use my current location&rdquo; while adding an address. Your
                device&apos;s coordinates are sent to a mapping service to fill in
                the address fields for you, and stored with that address so we can
                help the courier find it. We never track your location in the
                background.
              </li>
              <li>
                <strong>Order and payment history</strong> — what you ordered,
                order status, and the payment method and reference. We never
                receive or store your card, UPI or bank credentials.
              </li>
              <li>
                <strong>Basic usage data</strong> — pages and products viewed, so
                we can show recently viewed items and improve the store.
              </li>
            </ul>
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
                href={`mailto:${email}`}
                className="text-brand hover:underline"
              >
                {email}
              </a>
              , by replying STOP to any WhatsApp message, or from the WhatsApp
              updates switch in{" "}
              <a href="/profile" className="text-brand hover:underline">
                My Account
              </a>
              . One-time passwords you request yourself are sent regardless, since
              they are how you sign in.
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
              Online payments are processed by Razorpay Software Private
              Limited. Card, UPI and bank details are entered on Razorpay&apos;s
              own PCI-DSS compliant checkout and are never sent to or stored on
              our servers — we keep only the payment reference and status. Cash
              on Delivery orders involve no payment data at all.
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
            <p>
              We do not sell your personal information. We share it only with the
              service providers needed to run the store:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Razorpay</strong> — to take and refund online payments.
              </li>
              <li>
                <strong>AiSensy</strong> (an authorized WhatsApp Business Solution
                Provider on Meta&apos;s Cloud API) and{" "}
                <strong>Message Central</strong> — to deliver WhatsApp and SMS
                one-time passwords and order updates. Meta Platforms processes
                WhatsApp messages as part of delivering them.
              </li>
              <li>
                <strong>Google Firebase</strong> — used for phone number
                verification on some sign-in paths.
              </li>
              <li>
                <strong>OpenStreetMap / Nominatim</strong> — when you use
                &ldquo;Use my current location&rdquo;, your coordinates are sent to
                this service to look up the matching address.
              </li>
              <li>
                <strong>Courier and logistics partners</strong> — the recipient
                name, phone number and delivery address for your order.
              </li>
              <li>
                <strong>Supabase</strong> (database) and <strong>Vercel</strong>{" "}
                (hosting) and <strong>Cloudinary</strong> (image delivery) — the
                infrastructure the site runs on.
              </li>
            </ul>
            <p className="mt-2">
              Each of these receives only what it needs for that purpose, and only
              for order fulfilment, payment, verification or support — never for
              their own marketing.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              7. How Long We Keep It
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>One-time passwords</strong> — deleted within 24 hours.
                The code itself is stored only as a hash and expires in minutes.
              </li>
              <li>
                <strong>OTP request records</strong> used to rate-limit sending —
                deleted after 24 hours.
              </li>
              <li>
                <strong>Account, address and order records</strong> — kept while
                your account is open, and afterwards only as long as tax and
                accounting law requires us to retain invoice records.
              </li>
              <li>
                <strong>WhatsApp consent and opt-out timestamps</strong> — kept as
                the record that your choice was captured and honoured.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              8. Data Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your
              personal data from unauthorized access, alteration, or
              disclosure.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              9. Your Rights
            </h2>
            <p>
              You may view and correct your name, email and WhatsApp preference,
              and manage your delivery addresses, from{" "}
              <a href="/profile" className="text-brand hover:underline">
                My Account
              </a>
              . To request a copy of your data, or deletion of your account and
              data, email{" "}
              <a
                href={`mailto:${email}`}
                className="text-brand hover:underline"
              >
                {email}
              </a>{" "}
              from the address on your account or write to us from{" "}
              <a href="/contact" className="text-brand hover:underline">
                shopka.in/contact
              </a>
              . We act on such requests within 30 days.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              10. Compliance
            </h2>
            <p>
              This Privacy Policy is in accordance with India&apos;s
              Information Technology Act, 2000 and the Digital Personal Data
              Protection (DPDP) Act, 2023.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              11. Changes to This Policy
            </h2>
            <p>
              We may update this policy from time to time. Continued use of
              Shopka after changes means you accept the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-gray-800">
              12. Contact &amp; Grievance Officer
            </h2>
            <p>
              Email:{" "}
              <a
                href={`mailto:${email}`}
                className="text-brand hover:underline"
              >
                {email}
              </a>
            </p>
            <p className="mt-2">
              Website:{" "}
              <a href="/contact" className="text-brand hover:underline">
                shopka.in/contact
              </a>
            </p>
            <p className="mt-2">
              Grievance Officer (Consumer Protection (E-Commerce) Rules, 2020 and
              DPDP Act, 2023): {GRIEVANCE_OFFICER.name},{" "}
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
          </section>
        </div>
      </div>
    </main>
  );
}
