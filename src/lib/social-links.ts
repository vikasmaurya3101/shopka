/**
 * Social and phone links resolved from the admin-editable site settings.
 *
 * Dependency-free on purpose. `src/lib/settings.ts` imports Prisma and
 * `unstable_cache`, so a Client Component can't touch it — which is why
 * `useSiteSettings()` keeps its own copy of `buildWhatsAppLink`. Both sides feed
 * their settings object into this module instead, so the input type is
 * structural rather than either of their concrete types.
 *
 * The rule throughout: an unset setting renders *nothing*. Guessing a URL from
 * the brand name is what put a link to youtube.com/@shopka.in — a 404 — in the
 * footer of every page.
 */

export type SocialPlatform = "instagram" | "facebook" | "youtube" | "twitter";

export interface SocialLink {
  platform: SocialPlatform;
  /** Platform name, for `aria-label` and headings. */
  label: string;
  /**
   * The account as a customer should see it, always derived from `href`. A
   * hardcoded handle drifts the moment an admin edits the URL — that is how the
   * footer came to display "@shopka.in" while linking to /shopkaofficial.
   */
  handle: string;
  href: string;
}

/** Structural shape shared by `PublicSettings` and `SiteSettingsData`. */
export interface SocialSettings {
  instagram_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  twitter_url?: string;
}

const PLATFORMS: {
  platform: SocialPlatform;
  key: keyof SocialSettings;
  label: string;
}[] = [
  { platform: "instagram", key: "instagram_url", label: "Instagram" },
  { platform: "facebook", key: "facebook_url", label: "Facebook" },
  { platform: "youtube", key: "youtube_url", label: "YouTube" },
  { platform: "twitter", key: "twitter_url", label: "X (Twitter)" },
];

/** Strips scheme, `www.` and trailing slashes so the profile path can be read. */
function bareUrl(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}

function pathOf(bare: string): string {
  const slash = bare.indexOf("/");
  return slash === -1 ? "" : bare.slice(slash + 1);
}

/** How the account should read on screen, given its URL. */
export function socialHandle(platform: SocialPlatform, href: string): string {
  const bare = bareUrl(href);
  const path = (pathOf(bare).split(/[?#]/)[0] ?? "").replace(/\/+$/, "");

  // A URL with no profile path (or an unrecognised shape) is shown as-is rather
  // than dressed up as a handle it doesn't have.
  if (!path) return bare;

  switch (platform) {
    case "facebook":
      // "facebook.com/shopka" reads more naturally than "@shopka".
      return bare;
    case "youtube":
      // "/@handle" is the modern form; "/channel/UC…" and "/c/Name" have no
      // handle worth showing, so fall back to the full URL.
      return path.startsWith("@") ? path : bare;
    case "instagram":
    case "twitter":
      return `@${path.replace(/^@/, "")}`;
  }
}

/**
 * Every social profile the admin has actually configured, in a stable order.
 * Platforms with no setting are omitted entirely.
 */
export function resolveSocialLinks(settings: SocialSettings): SocialLink[] {
  const links: SocialLink[] = [];

  for (const { platform, key, label } of PLATFORMS) {
    const href = settings[key]?.trim();
    if (!href) continue;

    links.push({ platform, label, handle: socialHandle(platform, href), href });
  }

  return links;
}

/**
 * A `tel:` href from a raw `contact_phone` setting, or null when unset or too
 * short to be a real number — so callers hide the affordance instead of
 * offering a call that can't connect.
 */
export function buildTelLink(rawPhone: string | undefined | null): string | null {
  const raw = (rawPhone ?? "").trim();
  const digits = raw.replace(/\D/g, "");

  if (digits.length < 8) return null;

  return `tel:${raw.startsWith("+") ? "+" : ""}${digits}`;
}
