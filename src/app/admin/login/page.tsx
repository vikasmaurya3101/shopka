import { Suspense } from "react";

import { getPublicSettings } from "@/lib/settings";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

import AdminLoginForm from "./AdminLoginForm";

export const metadata = {
  title: "Staff sign-in · Shopka",
  // Keep the panel door out of search results.
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  // Already signed in as an admin? Skip the form. Middleware lets this route
  // through unconditionally (it has to, or the redirect would loop), so the
  // "already authenticated" case is handled here instead.
  const session = await getSession();

  if (session?.role === "ADMIN") {
    redirect("/admin");
  }

  const settings = await getPublicSettings();
  const logoUrl = settings.logo_url || "/brand/logo-128.png";

  return (
    <Suspense fallback={null}>
      <AdminLoginForm logoUrl={logoUrl} />
    </Suspense>
  );
}
