"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/providers/SessionProvider";
import Loader from "@/components/ui/Loader";

type SettingKey =
  | "contact_email" | "contact_phone" | "whatsapp_number"
  | "instagram_url" | "facebook_url" | "youtube_url" | "twitter_url" | "address"
  | "logo_url"
  | "hero_badge" | "hero_title" | "hero_subtitle" | "hero_cta"
  | "hero_card1_label" | "hero_card1_value"
  | "hero_card2_label" | "hero_card2_value"
  | "hero_card3_label" | "hero_card3_value"
  | "champion_section_title" | "top_categories_title";

const CONTACT_FIELDS: { key: SettingKey; label: string; placeholder: string; type: string }[] = [
  { key: "contact_email",   label: "Support Email",        placeholder: "support@shopka.in",                type: "email" },
  { key: "contact_phone",   label: "Support Phone",        placeholder: "+91 99999 99999",                  type: "tel"   },
  { key: "whatsapp_number", label: "WhatsApp Number",      placeholder: "919999999999 (no + or spaces)",    type: "tel"   },
  { key: "address",         label: "Business Address",     placeholder: "City, State, India",               type: "text"  },
];

const SOCIAL_FIELDS: { key: SettingKey; label: string; placeholder: string }[] = [
  { key: "instagram_url", label: "Instagram URL", placeholder: "https://instagram.com/shopka.in"  },
  { key: "facebook_url",  label: "Facebook URL",  placeholder: "https://facebook.com/shopka.in"   },
  { key: "youtube_url",   label: "YouTube URL",   placeholder: "https://youtube.com/@shopka.in"   },
  { key: "twitter_url",   label: "Twitter / X",   placeholder: "https://x.com/shopka_in"          },
];

export default function AdminSettingsPage() {
  const { user, isLoading } = useSession();
  const [values, setValues] = useState<Partial<Record<SettingKey, string>>>({});
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => { if (json.success) setValues(json.data); })
      .finally(() => setIsFetching(false));
  }, []);

  function set(key: SettingKey, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) { set("logo_url", json.url); toast.success("Logo uploaded."); }
      else toast.error("Upload failed.");
    } catch { toast.error("Upload failed."); }
    finally { setIsUploading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (json.success) toast.success("Settings saved!");
      else toast.error(json.message ?? "Unable to save.");
    } finally { setIsSaving(false); }
  }

  if (isLoading || isFetching) return <main className="min-h-screen bg-gray-50 p-6"><Loader size="lg" /></main>;
  if (user?.role !== "ADMIN") return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
      <p className="text-lg text-gray-600">Admin access required.</p>
    </main>
  );

  const field = (key: SettingKey, label: string, placeholder: string, type = "text") => (
    <div key={key}>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={values[key] ?? ""}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand"
      />
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage branding, hero banner, contact info and social links.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">

          {/* ── Branding ── */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Branding &amp; Logo</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Logo</label>
                {values.logo_url && (
                  <img src={values.logo_url} alt="Logo preview" className="mb-2 h-12 w-12 rounded-lg border object-cover" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={isUploading}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none"
                />
                {isUploading && <p className="mt-1 text-xs text-gray-500">Uploading…</p>}
                <p className="mt-1 text-xs text-gray-400">Upload a new logo image, or paste a URL below.</p>
              </div>
              {field("logo_url", "Logo URL (auto-filled after upload, or paste manually)", "/brand/logo-128.png", "url")}
            </div>
          </div>

          {/* ── Hero Banner ── */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Hero Banner</h2>
            <div className="space-y-4">
              {field("hero_badge",   "Badge text (top label)",   "UP TO 80% OFF · TODAY ONLY")}
              {field("hero_title",   "Headline",                  "All Trending Products here.")}
              {field("hero_subtitle","Subheadline",               "Unbeatable prices, handpicked quality, and fast delivery…")}
              {field("hero_cta",     "CTA Button label",          "Shop Now")}
            </div>

            <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-gray-500">Floating Cards (desktop only)</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                {field("hero_card1_label", "Card 1 Label", "Flash Deal")}
                {field("hero_card1_value", "Card 1 Value", "Up to 80% off")}
              </div>
              <div className="space-y-2">
                {field("hero_card2_label", "Card 2 Label", "Free Shipping")}
                {field("hero_card2_value", "Card 2 Value", "On All Orders")}
              </div>
              <div className="space-y-2">
                {field("hero_card3_label", "Card 3 Label", "Secure Pay")}
                {field("hero_card3_value", "Card 3 Value", "100% Safe")}
              </div>
            </div>
          </div>

          {/* ── Section Titles ── */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Homepage Section Titles</h2>
            <div className="space-y-4">
              {field("champion_section_title", "Champion Categories Title", "Champion Categories")}
              {field("top_categories_title",   "Top Categories Title",       "Top Categories")}
            </div>
            <p className="mt-3 text-xs text-gray-400">
              To add/remove categories: go to <strong>Catalog → Categories</strong>. To manage which products appear as champion picks: go to <strong>Sections → Featured Products</strong>.
            </p>
          </div>

          {/* ── Contact ── */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Contact Info</h2>
            <div className="space-y-4">
              {CONTACT_FIELDS.map(({ key, label, placeholder, type }) => field(key, label, placeholder, type))}
            </div>
          </div>

          {/* ── Social ── */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Social Media Links</h2>
            <div className="space-y-4">
              {SOCIAL_FIELDS.map(({ key, label, placeholder }) => field(key, label, placeholder, "url"))}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            💡 Changes to the hero banner and logo take up to 60 seconds to appear (cached).
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save All Settings"}
          </button>
        </form>
      </div>
    </main>
  );
}
