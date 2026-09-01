import { Suspense } from "react";
import { getPublicSettings } from "@/lib/settings";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  // Same `logo_url` site setting the navbar uses, so the card shows the real
  // (admin-uploaded) logo rather than the bundled default. Falls back to the
  // bundled mark when unset.
  const settings = await getPublicSettings();
  const logoUrl = settings.logo_url || "/brand/logo-128.png";

  return (
    <Suspense fallback={null}>
      <LoginForm logoUrl={logoUrl} />
    </Suspense>
  );
}
