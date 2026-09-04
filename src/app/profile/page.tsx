"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ChevronRight,
  Copy,
  Gift,
  HelpCircle,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Share2,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/providers/SessionProvider";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings, buildWhatsAppLink } from "@/hooks/useSiteSettings";
import { AddressData } from "@/types/order";
import { getInitials } from "@/lib/utils";
import Loader from "@/components/ui/Loader";

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, setUser } = useSession();
  const { logout } = useAuth();
  const { settings } = useSiteSettings();
  const [addresses, setAddresses] = useState<AddressData[]>([]);
  const [copied, setCopied] = useState(false);
  const whatsappHref = buildWhatsAppLink(settings.whatsapp_number);

  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  // The stored opt-in is the source of truth, and it only lands once the session
  // resolves after the first paint. So the switch *derives* from it instead of
  // copying it into state, and `pendingConsent` holds just the toggle the user
  // made while the write is in flight — someone who already consented is never
  // shown an "off" switch, and a fresh toggle can't be clobbered by an unrelated
  // re-render.
  const [pendingConsent, setPendingConsent] = useState<boolean | null>(null);
  const [isSavingConsent, setIsSavingConsent] = useState(false);
  const whatsappConsent = pendingConsent ?? user?.whatsappConsent ?? false;

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/addresses")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setAddresses(json.data);
      });
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <Loader size="lg" />
      </main>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Login to view your profile
        </h1>
        <Link
          href="/login?redirect=/profile"
          className="rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
        >
          Login
        </Link>
      </main>
    );
  }

  const referralCode = `SHOPKA${user.id.slice(0, 6).toUpperCase()}`;

  function startEditing() {
    setForm({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      email: user?.email ?? "",
    });
    setIsEditing(true);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();

    if (!form.firstName.trim() || isSavingProfile) return;

    setIsSavingProfile(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Phone is deliberately absent: it needs an OTP, so it is only
        // changeable through the /add-phone flow.
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
        }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        // Stay in edit mode so the rejected values are still on screen to fix.
        toast.error(json?.message ?? "Couldn't save your details.");
        return;
      }

      setUser(json.data);
      setIsEditing(false);
      toast.success(json.message ?? "Profile updated.");
    } catch {
      toast.error("Couldn't save your details.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleConsentChange(next: boolean) {
    if (!user) return;

    setPendingConsent(next);
    setIsSavingConsent(true);

    try {
      const res = await fetch("/api/auth/whatsapp-consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: next }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        // Drop the override and fall back to the stored value.
        setPendingConsent(null);
        toast.error(json?.message ?? "Couldn't save your WhatsApp preference.");
        return;
      }

      // Mirror it into the session so the checkout checkbox and anything else
      // reading consent sees the new value without a reload. Once stored agrees,
      // the override has nothing left to do.
      setUser({ ...user, whatsappConsent: next });
      setPendingConsent(null);
      toast.success(
        next ? "WhatsApp updates turned on." : "WhatsApp updates turned off."
      );
    } catch {
      setPendingConsent(null);
      toast.error("Couldn't save your WhatsApp preference.");
    } finally {
      setIsSavingConsent(false);
    }
  }

  function copyReferral() {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareReferral() {
    const text = `Use my code ${referralCode} on Shopka and get a discount on your first order! 🎉\nhttps://shopka.in`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Join Shopka!", text, url: "https://shopka.in" }).catch(() => null);
    } else {
      copyReferral();
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-xl space-y-4">

        {/* ── User card ── */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-bold text-white">
              {getInitials(user.firstName, user.lastName)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold leading-tight text-gray-900">
                {user.firstName} {user.lastName ?? ""}
              </h1>
              {user.phone && (
                <p className="text-sm text-gray-500">+91 {user.phone}</p>
              )}
              {user.email && (
                <p className="truncate text-sm text-gray-500">{user.email}</p>
              )}
            </div>
            {!isEditing && (
              <button
                onClick={startEditing}
                className="tap-shrink flex shrink-0 items-center gap-1.5 rounded-xl border border-brand px-3 py-1.5 text-sm font-semibold text-brand transition hover:bg-brand-50"
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
          </div>

          {isEditing && (
            <form onSubmit={handleSaveProfile} className="mt-5 space-y-3 border-t pt-4">
              <div>
                <label
                  htmlFor="profile-first-name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  First name
                </label>
                <input
                  id="profile-first-name"
                  required
                  maxLength={50}
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:border-brand"
                />
              </div>
              <div>
                <label
                  htmlFor="profile-last-name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Last name{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  id="profile-last-name"
                  maxLength={50}
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:border-brand"
                />
              </div>
              <div>
                <label
                  htmlFor="profile-email"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Email{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  id="profile-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:border-brand"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave this blank to remove your email from your account.
                </p>
              </div>
              <div>
                <label
                  htmlFor="profile-phone"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Phone
                </label>
                <input
                  id="profile-phone"
                  readOnly
                  value={user.phone ? `+91 ${user.phone}` : "Not added yet"}
                  className="w-full cursor-not-allowed rounded-lg border bg-gray-50 px-3 py-2 text-gray-500 outline-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your phone number can&apos;t be changed here — it needs an OTP.
                  Use{" "}
                  <Link
                    href="/add-phone?redirect=/profile"
                    className="font-medium text-brand hover:underline"
                  >
                    verify a phone number
                  </Link>{" "}
                  instead.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSavingProfile || !form.firstName.trim()}
                  className="tap-shrink flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {isSavingProfile ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSavingProfile}
                  className="tap-shrink flex-1 rounded-xl border py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ── Add phone nudge ── */}
        {!user.phone && (
          <Link
            href="/add-phone?redirect=/profile"
            className="flex items-center gap-3 rounded-xl border-2 border-brand-100 bg-brand-50/40 p-4 transition hover:bg-brand-50"
          >
            <AlertCircle size={20} className="shrink-0 text-brand" />
            <div>
              <p className="text-sm font-semibold text-brand-dark">
                Add your phone number
              </p>
              <p className="text-xs text-gray-500">
                Needed for order updates and faster login.
              </p>
            </div>
          </Link>
        )}

        {/* ── Quick links ── */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <NavRow
            href="/orders"
            icon={<Package size={20} className="text-brand" />}
            title="My Orders"
            sub="Track, manage and return orders"
          />
          <NavRow
            href="/profile/addresses"
            icon={<MapPin size={20} className="text-brand" />}
            title={`Saved Addresses${addresses.length ? ` (${addresses.length})` : ""}`}
            sub={addresses[0]?.completeAddress ?? "No addresses saved yet — add one now"}
          />
          {(user.role === "SELLER" || user.role === "ADMIN") && (
            <NavRow
              href="/admin"
              icon={<UserIcon size={20} className="text-brand" />}
              title={user.role === "ADMIN" ? "Admin Dashboard" : "Seller Dashboard"}
              sub="Manage products & orders"
            />
          )}
        </div>

        {/* ── WhatsApp updates ── */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <MessageCircle size={20} className="mt-0.5 shrink-0 text-green-600" />
            <div className="min-w-0 flex-1">
              <h2 id="whatsapp-updates-label" className="font-bold text-gray-900">
                WhatsApp updates
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Order confirmations, delivery updates and support replies on
                WhatsApp.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={whatsappConsent}
              aria-labelledby="whatsapp-updates-label"
              onClick={() => handleConsentChange(!whatsappConsent)}
              disabled={isSavingConsent}
              className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60 ${
                whatsappConsent ? "bg-green-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`mt-0.5 inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  whatsappConsent ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <p className="mt-3 border-t pt-3 text-xs leading-relaxed text-gray-500">
            Turning this off stops order and delivery updates on WhatsApp.
            One-time passwords you request yourself are still sent, because they
            are how you sign in. You can also reply STOP to any WhatsApp message
            from us to opt out.
          </p>
        </div>

        {/* ── Refer & Earn ── */}
        <div className="rounded-2xl border bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <Gift size={20} className="text-brand" />
            <h2 className="font-bold text-gray-900">Refer &amp; Earn</h2>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Share your code with friends. When they place their first order,
            you both get a surprise reward! 🎁
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl border-2 border-dashed border-brand bg-white py-2.5 px-4 text-center font-mono text-sm font-bold tracking-widest text-brand">
              {referralCode}
            </div>
            <button
              onClick={copyReferral}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark active:scale-95"
            >
              <Copy size={15} />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={shareReferral}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-brand py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-50"
          >
            <Share2 size={15} />
            Share with friends
          </button>
        </div>

        {/* ── Help & Support ── */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b px-5 py-3.5">
            <HelpCircle size={18} className="text-brand" />
            <span className="font-semibold text-gray-800">Help &amp; Support</span>
          </div>
          <NavRow href="/help" title="FAQs &amp; Help Centre" sub="Answers to common questions" />
          <NavRow href="/contact" title="Contact Us" sub="Email, WhatsApp &amp; more" />
          <NavRow href="/returns" title="Return Policy" sub="Learn how to return an item" />
        </div>

        {/* ── Connect on Social ── */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-800">Connect on Social</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SocialBtn
              href="https://www.instagram.com/shopka.in"
              label="Instagram"
              gradient="from-pink-500 to-rose-500"
              icon={<IgIcon />}
            />
            <SocialBtn
              href="https://www.facebook.com/shopka.in"
              label="Facebook"
              gradient="from-blue-600 to-blue-500"
              icon={<FbIcon />}
            />
            <SocialBtn
              href="https://www.youtube.com/@shopka.in"
              label="YouTube"
              gradient="from-red-600 to-red-500"
              icon={<YtIcon />}
            />
            {whatsappHref && (
              <SocialBtn
                href={whatsappHref}
                label="WhatsApp"
                gradient="from-green-500 to-emerald-500"
                icon={<MessageCircle size={18} />}
              />
            )}
          </div>
        </div>

        {/* ── Logout ── */}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:shadow-md"
        >
          <LogOut size={20} className="text-red-500" />
          <p className="font-semibold text-red-500">Logout</p>
        </button>

        <p className="pb-4 text-center text-xs text-gray-400">
          Shopka v1.0 &bull;{" "}
          <Link href="/terms" className="hover:underline">Terms</Link>{" "}
          &bull;{" "}
          <Link href="/about" className="hover:underline">About</Link>
        </p>
      </div>
    </main>
  );
}

function NavRow({
  href,
  icon,
  title,
  sub,
}: {
  href: string;
  icon?: React.ReactNode;
  title: string;
  sub?: string;
}) {
  return (
    <Link
      href={href}
      className="tap-shrink group flex items-center gap-3 border-b px-5 py-4 transition last:border-b-0 hover:bg-gray-50"
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-medium text-gray-800"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        {sub && (
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{sub}</p>
        )}
      </div>
      <ChevronRight
        size={16}
        className="shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-brand"
      />
    </Link>
  );
}

function SocialBtn({
  href,
  label,
  gradient,
  icon,
}: {
  href: string;
  label: string;
  gradient: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex flex-col items-center gap-1.5 rounded-xl bg-gradient-to-br ${gradient} p-3 text-white transition hover:opacity-90 active:scale-95`}
    >
      {icon}
      <span className="text-xs font-semibold">{label}</span>
    </a>
  );
}

function IgIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function FbIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function YtIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
