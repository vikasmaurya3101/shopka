import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { getPublicSettings, buildWhatsAppLink } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contact Us | Shopka",
  description: "Reach out to Shopka via email, WhatsApp, or social media. We reply within 24 hours.",
};

function IgIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function FbIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function YtIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

type Channel = {
  icon: React.ReactNode;
  title: string;
  sub: string;
  href: string | null;
  iconBg: string;
  iconColor: string;
  hoverBorder: string;
};

function buildChannels(email: string, whatsappHref: string | null): Channel[] {
  const channels: Channel[] = [
    {
      icon: <Mail size={20} />,
      title: "Email us",
      sub: email,
      href: `mailto:${email}`,
      iconBg: "bg-brand-50",
      iconColor: "text-brand",
      hoverBorder: "hover:border-brand",
    },
  ];

  if (whatsappHref) {
    channels.push({
      icon: <MessageCircle size={20} />,
      title: "WhatsApp",
      sub: "Chat with us on WhatsApp",
      href: whatsappHref,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      hoverBorder: "hover:border-green-400",
    });
  }

  return channels;
}

const STATIC_CHANNELS: Channel[] = [
  {
    icon: <IgIcon />,
    title: "Instagram",
    sub: "@shopka.in",
    href: "https://www.instagram.com/shopka.in",
    iconBg: "bg-pink-50",
    iconColor: "text-pink-500",
    hoverBorder: "hover:border-pink-400",
  },
  {
    icon: <FbIcon />,
    title: "Facebook",
    sub: "facebook.com/shopka.in",
    href: "https://www.facebook.com/shopka.in",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    hoverBorder: "hover:border-blue-400",
  },
  {
    icon: <YtIcon />,
    title: "YouTube",
    sub: "@shopka.in",
    href: "https://www.youtube.com/@shopka.in",
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    hoverBorder: "hover:border-red-400",
  },
  {
    icon: <MapPin size={20} />,
    title: "Based in India",
    sub: "Serving customers pan-India",
    href: null,
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
    hoverBorder: "",
  },
];

export default async function ContactPage() {
  const settings = await getPublicSettings();
  const email = settings.contact_email || "support@shopka.in";
  const whatsappHref = buildWhatsAppLink(settings.whatsapp_number);
  const channels = [...buildChannels(email, whatsappHref), ...STATIC_CHANNELS];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="brand-gradient py-12 text-white sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Get in Touch
          </h1>
          <p className="mt-2 text-sm text-white/90 sm:text-base">
            Questions about an order, a product, or anything else — we&apos;re
            happy to help. We usually respond within 24 hours.
          </p>
        </div>
      </section>

      {/* Channels grid */}
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="mb-5 text-xl font-bold text-gray-900">How to reach us</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {channels.map(({ icon, title, sub, href, iconBg, iconColor, hoverBorder }) => {
            const inner = (
              <>
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg} ${iconColor}`}>
                  {icon}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{title}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{sub}</p>
                </div>
              </>
            );

            if (href) {
              return (
                <a
                  key={title}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={`flex items-center gap-4 rounded-xl border bg-white p-5 transition hover:shadow-md ${hoverBorder}`}
                >
                  {inner}
                </a>
              );
            }

            return (
              <div key={title} className="flex items-center gap-4 rounded-xl border bg-white p-5">
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* Tip */}
      <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6">
        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4 text-sm text-gray-600">
          💡 <strong>Tip:</strong> For the fastest help with orders, go to{" "}
          <Link href="/orders" className="font-semibold text-brand hover:underline">
            My Orders
          </Link>{" "}
          and use the cancel / return option directly — no need to contact us for that.
        </div>
      </section>
    </main>
  );
}
