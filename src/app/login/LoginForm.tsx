"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, MessageSquare, ShieldCheck, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/shared/Logo";
import OtpInput from "@/components/auth/OtpInput";
import WhatsappConsentCheckbox from "@/components/shared/WhatsappConsentCheckbox";

type Step = "phone" | "otp" | "profile";

/** Cooldown between resend attempts (seconds) */
const RESEND_COOLDOWN_SECONDS = 45;

/** Max resends allowed before 1-hour hard lock */
const RESEND_HARD_LIMIT = 3;

/** Hard lock duration when resend limit is hit (1 hour) */
const RESEND_HARD_LOCK_SECONDS = 60 * 60;

/** Server-side lock duration (30 min) — shown on 429 */
const SERVER_LOCK_DURATION_SECONDS = 30 * 60;

export default function LoginForm({ logoUrl }: { logoUrl: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const { sendOtp, verifyOtp, completeProfile, isSubmitting, error } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpInputKey, setOtpInputKey] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Resend cooldown (45s between each resend)
  const [resendCooldown, setResendCooldown] = useState(0);

  // Track how many times user has hit "Resend" (resets when phone changes)
  const [resendCount, setResendCount] = useState(0);

  // Hard lock — when resendCount hits RESEND_HARD_LIMIT
  const [hardLockedFor, setHardLockedFor] = useState(0);

  // Server lock — when server returns 429
  const [serverLockedFor, setServerLockedFor] = useState(0);

  // How many OTP attempts are left (max 3 per 30 min)
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  // ── Tick timers ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (hardLockedFor <= 0) return;
    const t = setTimeout(() => setHardLockedFor((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [hardLockedFor]);

  useEffect(() => {
    if (serverLockedFor <= 0) return;
    const t = setTimeout(() => setServerLockedFor((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [serverLockedFor]);

  function resetOtpBoxes() {
    setOtp("");
    setOtpInputKey((k) => k + 1);
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();

    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 10) return;

    setLocalError(null);
    const result = await sendOtp(digitsOnly, "whatsapp");

    if (result.success) {
      setAttemptsLeft(result.attemptsLeft ?? null);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setResendCount(0);
      resetOtpBoxes();
      setStep("otp");
    } else if (result.locked) {
      setServerLockedFor(result.retryAfterSeconds ?? SERVER_LOCK_DURATION_SECONDS);
      setLocalError(null);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || isSubmitting) return;

    // If already at hard limit, activate hard lock
    if (resendCount >= RESEND_HARD_LIMIT) {
      setHardLockedFor(RESEND_HARD_LOCK_SECONDS);
      return;
    }

    setLocalError(null);
    const digitsOnly = phone.replace(/\D/g, "");
    const result = await sendOtp(digitsOnly, "whatsapp");

    if (result.success) {
      const newCount = resendCount + 1;
      setResendCount(newCount);
      setAttemptsLeft(result.attemptsLeft ?? null);
      resetOtpBoxes();
      setResendCooldown(RESEND_COOLDOWN_SECONDS);

      // Immediately lock if we've now hit the limit
      if (newCount >= RESEND_HARD_LIMIT) {
        setHardLockedFor(RESEND_HARD_LOCK_SECONDS);
      }
    } else if (result.locked) {
      setServerLockedFor(result.retryAfterSeconds ?? SERVER_LOCK_DURATION_SECONDS);
    }
  }

  async function handleVerifyOtp(code: string) {
    const digitsOnly = phone.replace(/\D/g, "");
    const result = await verifyOtp(digitsOnly, code);

    if (!result.success) {
      resetOtpBoxes();
      return;
    }

    if (result.isNewUser) {
      setStep("profile");
    } else {
      router.push(redirectTo);
    }
  }

  async function handleCompleteProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) return;

    const digitsOnly = phone.replace(/\D/g, "");
    const result = await completeProfile({
      phone: digitsOnly,
      firstName,
      lastName: lastName || undefined,
      email: email || undefined,
      whatsappConsent,
    });

    if (result.success) {
      router.push(redirectTo);
    }
  }

  function handleChangeNumber() {
    setStep("phone");
    setServerLockedFor(0);
    setHardLockedFor(0);
    setResendCooldown(0);
    setResendCount(0);
    setAttemptsLeft(null);
    resetOtpBoxes();
    setLocalError(null);
  }

  const displayError = error || localError;

  // ── Hard lock screen (client-side resend limit) ──────────────────────────
  if (hardLockedFor > 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_20px_50px_-15px_rgba(214,38,111,0.25)] text-center"
        >
          <div className="flex justify-center mb-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <Lock size={28} className="text-red-500" />
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-gray-800">Resend limit reached</h2>
          <p className="mt-2 text-sm text-gray-500">
            You&apos;ve requested OTP too many times. Please try again in:
          </p>
          <p className="mt-4 text-4xl font-bold text-brand tabular-nums">
            {formatTime(hardLockedFor)}
          </p>
          <p className="mt-2 text-xs text-gray-400">hours : minutes</p>
          <button
            type="button"
            onClick={handleChangeNumber}
            className="mt-6 text-sm text-gray-500 hover:text-brand"
          >
            Use a different number
          </button>
        </motion.div>
      </main>
    );
  }

  // ── Server lock screen (429 from rate limiter) ──────────────────────────
  if (serverLockedFor > 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_20px_50px_-15px_rgba(214,38,111,0.25)] text-center"
        >
          <div className="flex justify-center mb-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <Lock size={28} className="text-red-500" />
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-gray-800">Too many attempts</h2>
          <p className="mt-2 text-sm text-gray-500">
            OTP requests are blocked for this number. Please try again in:
          </p>
          <p className="mt-4 text-4xl font-bold text-brand tabular-nums">
            {formatTime(serverLockedFor)}
          </p>
          <p className="mt-2 text-xs text-gray-400">minutes : seconds</p>
          <button
            type="button"
            onClick={handleChangeNumber}
            className="mt-6 text-sm text-gray-500 hover:text-brand"
          >
            Use a different number
          </button>
        </motion.div>
      </main>
    );
  }

  // ── Main login form ────────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_20px_50px_-15px_rgba(214,38,111,0.25)]"
      >
        <div className="flex justify-center">
          <Logo size={52} showText={false} logoUrl={logoUrl} />
        </div>

        <h1 className="mt-4 text-center text-2xl font-extrabold text-brand">
          Shopka
        </h1>

        <p className="mt-1 text-center text-sm text-gray-500">
          {step === "phone" && "Login or sign up to continue"}
          {step === "otp" && (
            <>
              OTP sent via{" "}
              <span className="font-semibold text-gray-700">SMS</span> to +91{" "}
              {phone}
            </>
          )}
          {step === "profile" && "Tell us a bit about you"}
        </p>

        <AnimatePresence>
          {displayError && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {displayError}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === "phone" && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
                <div className="flex items-center rounded-lg border px-4 py-3 focus-within:border-brand">
                  <span className="mr-2 text-sm font-medium text-gray-500">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit mobile number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    maxLength={10}
                    className="w-full outline-none"
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || phone.replace(/\D/g, "").length < 10}
                  className="tap-shrink w-full rounded-lg bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {isSubmitting ? "Sending..." : "Continue"}
                </button>

                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-gray-400">
                  <MessageSquare size={13} className="text-brand" />
                  We&apos;ll send a verification code via SMS
                </p>
              </form>

              <p className="mt-6 text-center text-xs text-gray-400">
                By continuing, you agree to Shopka&apos;s{" "}
                <Link href="/terms" className="font-medium text-brand hover:underline">
                  Terms
                </Link>{" "}
                &amp;{" "}
                <Link href="/privacy" className="font-medium text-brand hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="mt-6 space-y-5"
            >
              <OtpInput
                key={otpInputKey}
                value={otp}
                onChange={setOtp}
                onComplete={handleVerifyOtp}
                disabled={isSubmitting}
                error={Boolean(displayError)}
              />

              <button
                type="button"
                onClick={() => handleVerifyOtp(otp)}
                disabled={isSubmitting || otp.length < 6}
                className="tap-shrink w-full rounded-lg bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
              >
                {isSubmitting ? "Verifying..." : "Verify OTP"}
              </button>

              {/* ── Not received / Resend section ── */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                <p className="text-center text-xs font-medium text-gray-500">
                  Didn&apos;t receive the OTP?
                </p>

                {resendCooldown > 0 ? (
                  <p className="text-center text-sm text-gray-400">
                    Resend in{" "}
                    <span className="tabular-nums font-semibold text-brand">
                      0:{resendCooldown.toString().padStart(2, "0")}
                    </span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-brand/40 py-2 text-sm font-semibold text-brand hover:bg-brand/5 transition disabled:opacity-50"
                  >
                    {isSubmitting ? "Sending..." : "Resend OTP"}
                  </button>
                )}

                {/* Resend counter warning */}
                {resendCount > 0 && resendCount < RESEND_HARD_LIMIT && (
                  <p className="text-center text-xs text-amber-600">
                    {RESEND_HARD_LIMIT - resendCount} resend
                    {RESEND_HARD_LIMIT - resendCount === 1 ? "" : "s"} remaining
                    before 1-hour lock
                  </p>
                )}

                {attemptsLeft !== null && attemptsLeft <= 1 && (
                  <p className="text-center text-xs text-amber-600">
                    {attemptsLeft === 0
                      ? "No resends left. Please wait 30 minutes."
                      : "1 resend left before 30-min lock"}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleChangeNumber}
                className="w-full text-center text-sm text-gray-500 hover:text-brand"
              >
                Change phone number
              </button>
            </motion.div>
          )}

          {step === "profile" && (
            <motion.form
              key="profile"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleCompleteProfile}
              className="mt-6 space-y-4"
            >
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-brand"
                required
                autoFocus
              />

              <input
                type="text"
                placeholder="Last name (optional)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border px-4 py-3 outline-none focus:border-brand"
              />

              <div>
                <label
                  htmlFor="signup-email"
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700"
                >
                  <Mail size={15} className="text-brand" />
                  Email{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border-2 border-brand-100 bg-brand-50/40 px-4 py-3 outline-none transition focus:border-brand focus:bg-white"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  For order receipts and account recovery.
                </p>
              </div>

              <WhatsappConsentCheckbox
                id="signup-whatsapp-consent"
                checked={whatsappConsent}
                onChange={setWhatsappConsent}
                disabled={isSubmitting}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="tap-shrink w-full rounded-lg bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Continue"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {step === "phone" && (
          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400">
            <ShieldCheck size={13} className="text-brand" />
            Your number is only used to verify your account
          </p>
        )}
      </motion.div>
    </main>
  );
}
