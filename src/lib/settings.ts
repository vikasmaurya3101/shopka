import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Site settings that are safe to expose on the public storefront (as
 * opposed to admin-only settings). Every key here must also exist in
 * ALLOWED_KEYS in `src/app/api/admin/settings/route.ts`, since that's
 * the list an admin can actually edit from /admin/settings.
 */
export const PUBLIC_SETTING_KEYS = [
  "logo_url",
  "hero_badge",
  "hero_title",
  "hero_subtitle",
  "hero_cta",
  "hero_card1_label",
  "hero_card1_value",
  "hero_card2_label",
  "hero_card2_value",
  "hero_card3_label",
  "hero_card3_value",
  "champion_section_title",
  "top_categories_title",
  "contact_email",
  "contact_phone",
  "whatsapp_number",
  "instagram_url",
  "facebook_url",
  "youtube_url",
  "twitter_url",
  "address",
] as const;

export type PublicSettingKey = (typeof PUBLIC_SETTING_KEYS)[number];
export type PublicSettings = Partial<Record<PublicSettingKey, string>>;

/**
 * Fallback shown when the `contact_email` setting is missing. Defined once so a
 * blank setting can't leave different pages advertising different addresses —
 * which is exactly how the old gmail address survived in some corners of the
 * site after the domain mailbox went live.
 */
export const DEFAULT_CONTACT_EMAIL = "support@shopka.in";

/** The address customers should use, honouring the admin-editable setting. */
export function resolveContactEmail(settings: PublicSettings): string {
  return settings.contact_email?.trim() || DEFAULT_CONTACT_EMAIL;
}

/**
 * Cached, server-only read of every public site setting (60s revalidate).
 * Use this from Server Components (Footer, contact page, etc). Client
 * Components should hit GET /api/public/settings instead.
 */
export const getPublicSettings = unstable_cache(
  async (): Promise<PublicSettings> => {
    try {
      const rows = await prisma.siteSetting.findMany({
        where: { key: { in: PUBLIC_SETTING_KEYS as unknown as string[] } },
      });
      const data: PublicSettings = {};
      for (const row of rows) {
        data[row.key as PublicSettingKey] = row.value;
      }
      return data;
    } catch {
      return {};
    }
  },
  ["public-site-settings"],
  { revalidate: 60 }
);

/**
 * Builds a wa.me deep link from a raw settings value (which may contain
 * spaces/dashes/a leading +). Returns null when unset so callers can hide
 * the WhatsApp affordance instead of linking to a fake/placeholder number.
 */
export function buildWhatsAppLink(
  rawNumber: string | undefined | null,
  text?: string
): string | null {
  const digits = (rawNumber ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}
