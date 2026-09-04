"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

import Logo from "@/components/shared/Logo";

/**
 * Staff sign-in. Deliberately plain compared with the customer OTP form — no
 * channel switching, no countdowns, no consent checkbox. Just the two fields.
 */
export default function AdminLoginForm({ logoUrl }: { logoUrl: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Only same-origin admin paths are honoured, so `?redirect=` can't be used to
   * bounce a freshly-authenticated admin to an attacker's URL.
   */
  const requested = searchParams.get("redirect");
  const redirectTo =
    requested && requested.startsWith("/admin") && !requested.startsWith("/admin/login")
      ? requested
      : "/admin";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !payload.success) {
        setError(payload.message || "Unable to sign in. Please try again.");
        setPassword("");
        return;
      }

      // The session cookie is httpOnly and set by the route, so the client has
      // nothing to store. `refresh()` clears the router cache first — without it
      // the admin layout can re-render from its pre-login (unauthenticated)
      // entry and bounce straight back here.
      router.refresh();
      router.replace(redirectTo);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo href="/" size={48} logoUrl={logoUrl} />

          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Staff sign-in
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Admin access to the Shopka panel.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
          noValidate
        >
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label
                htmlFor="admin-email"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="you@shopka.in"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Password
              </label>

              <div className="relative">
                <Lock
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting}
                  placeholder="••••••••••"
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-10 text-sm text-gray-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-gray-400 transition hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand/20"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Eye aria-hidden="true" className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !email || !password}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                Sign in
              </>
            )}
          </button>

          <p className="mt-5 text-center text-xs text-gray-400">
            Shopping instead?{" "}
            <Link
              href="/login"
              className="font-medium text-gray-600 underline-offset-2 hover:underline"
            >
              Customer sign-in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
