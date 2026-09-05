import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import {
  getPublicSettings,
  buildWhatsAppLink,
  resolveContactEmail,
} from "@/lib/settings";
import { COMPANY } from "@/lib/company";
import {
  buildTelLink,
  resolveSocialLinks,
  type SocialPlatform,
} from "@/lib/social-links";

function IgIcon({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function FbIcon({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function YtIcon({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function XIcon({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * Per-platform glyph and hover colour, keyed off the resolved link's platform so
 * a newly configured social account renders without touching this file.
 */
const SOCIAL_STYLE: Record<
  SocialPlatform,
  { icon: (size: number) => React.ReactNode; hover: string }
> = {
  instagram: { icon: (s) => <IgIcon size={s} />, hover: "hover:text-pink-400" },
  facebook: { icon: (s) => <FbIcon size={s} />, hover: "hover:text-blue-400" },
  youtube: { icon: (s) => <YtIcon size={s} />, hover: "hover:text-red-400" },
  twitter: { icon: (s) => <XIcon size={s} />, hover: "hover:text-gray-200" },
};

export default async function Footer() {
  const settings = await getPublicSettings();

  const email = resolveContactEmail(settings);
  const whatsappHref = buildWhatsAppLink(settings.whatsapp_number);
  const telHref = buildTelLink(settings.contact_phone);
  const address = settings.address?.trim();

  // Only the accounts an admin has actually configured at /admin/settings. There
  // are deliberately no fallback URLs: a guessed handle is a dead link, and one
  // of them (youtube.com/@shopka.in) really was a 404 on every page.
  const socialLinks = resolveSocialLinks(settings);

  const social = [
    ...socialLinks.map((link) => ({
      label: link.label,
      href: link.href,
      icon: SOCIAL_STYLE[link.platform].icon(20),
      color: SOCIAL_STYLE[link.platform].hover,
    })),
    ...(whatsappHref
      ? [{ label: "WhatsApp", href: whatsappHref, icon: <MessageCircle size={20} />, color: "hover:text-green-400" }]
      : []),
    { label: "Email", href: `mailto:${email}`, icon: <Mail size={20} />, color: "hover:text-brand" },
  ];

  return (
    <footer className="mt-16 border-t bg-gray-950 text-gray-400">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 md:grid-cols-4">

        {/* Brand */}
        <div>
          <span className="text-2xl font-extrabold text-white">Shopka</span>
          <p className="mt-2 text-sm leading-relaxed">
            All Trending Products here — unbeatable prices on quality products,
            delivered fast across India.
          </p>
          <div className="mt-5 flex items-center gap-4">
            {social.map(({ label, href, icon, color }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={`transition ${color}`}
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* Company */}
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-300">
            Company
          </h3>
          <ul className="space-y-3 text-sm">
            <li><Link href="/about" className="transition hover:text-white">About Us</Link></li>
            <li><Link href="/contact" className="transition hover:text-white">Contact</Link></li>
            <li><Link href="/careers" className="transition hover:text-white">Careers</Link></li>
          </ul>
        </div>

        {/* Customer */}
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-300">
            Customer
          </h3>
          <ul className="space-y-3 text-sm">
            <li><Link href="/help" className="transition hover:text-white">Help Centre</Link></li>
            <li><Link href="/returns" className="transition hover:text-white">Return Policy</Link></li>
            <li><Link href="/terms" className="transition hover:text-white">Terms &amp; Conditions</Link></li>
            <li><Link href="/privacy" className="transition hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/orders" className="transition hover:text-white">Track My Order</Link></li>
          </ul>
        </div>

        {/* Connect */}
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-300">
            Get in Touch
          </h3>
          <ul className="space-y-3 text-sm">
            <li>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 transition hover:text-white"
              >
                <Mail size={15} />
                {email}
              </a>
            </li>
            {telHref && (
              <li>
                <a
                  href={telHref}
                  className="flex items-center gap-2 transition hover:text-white"
                >
                  <Phone size={15} />
                  {settings.contact_phone}
                </a>
              </li>
            )}
            {whatsappHref && (
              <li>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 transition hover:text-green-400"
                >
                  <MessageCircle size={15} />
                  WhatsApp Support
                </a>
              </li>
            )}
            {/* Handle text comes from the URL, so the label can never disagree
                with where the link actually goes. */}
            {socialLinks.map((link) => (
              <li key={link.platform}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 transition ${SOCIAL_STYLE[link.platform].hover}`}
                >
                  {SOCIAL_STYLE[link.platform].icon(15)}
                  {link.handle}
                </a>
              </li>
            ))}
            {address && (
              <li className="flex items-start gap-2">
                <MapPin size={15} className="mt-0.5 shrink-0" />
                <span>{address}</span>
              </li>
            )}
          </ul>
        </div>

      </div>

      <div className="border-t border-gray-800 py-5 text-center text-xs text-gray-600">
        <p>
          © {new Date().getFullYear()} Shopka. All Rights Reserved. &nbsp;·&nbsp;
          Made with ❤️ in India
        </p>
        <p className="mt-1.5 text-gray-500">
          Operated by {COMPANY.operatorName} |{" "}
          <a
            href={`mailto:${COMPANY.operatorEmail}`}
            className="hover:text-gray-300 hover:underline"
          >
            {COMPANY.operatorEmail}
          </a>{" "}
          | India
        </p>
      </div>
    </footer>
  );
}
