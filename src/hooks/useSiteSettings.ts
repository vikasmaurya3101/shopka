"use client";

import { useEffect, useState } from "react";

export interface SiteSettingsData {
  whatsapp_number?: string;
  contact_email?: string;
  contact_phone?: string;
  instagram_url?: string;
  facebook_url?: string;
  youtube_url?: string;
  twitter_url?: string;
  address?: string;
  [key: string]: string | undefined;
}

/**
 * Client-side read of the public site settings (GET /api/public/settings,
 * cached 60s server-side). Use this in Client Components that need
 * admin-configurable values like the WhatsApp support number — Server
 * Components should use getPublicSettings() from "@/lib/settings" instead.
 */
export function useSiteSettings() {
  const [data, setData] = useState<SiteSettingsData>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/public/settings")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success) setData(json.data ?? {});
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { settings: data, isLoading };
}

/** Builds a wa.me deep link from a raw settings value. Returns null when unset. */
export function buildWhatsAppLink(rawNumber: string | undefined, text?: string): string | null {
  const digits = (rawNumber ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}
