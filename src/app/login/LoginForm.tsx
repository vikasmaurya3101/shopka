"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, MessageSquare, ShieldCheck, Lock, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/shared/Logo";
import OtpInput from "@/components/auth/OtpInput";
import WhatsappConsentCheckbox from "@/components/shared/WhatsappConsentCheckbox";

type Step = "phone" | "otp" | "profile";

/** Cooldown between resend attempts (seconds) */
const RESEND_COOLDOWN_SECONDS = 45;

/** Max resends before hard lock */
const RESEND_HARD_LIMIT = 3;

/** Hard lock duration (1 hour) */
const RESEND_HARD_LOCK_SECONDS = 60 * 60;

/** Show "X resends left" warning only after this many resends */
const WARN_AFTER_RESENDS = 2;

/** Show server lock warning only after this many failed OTP verifications */
const SHOW_LOCK_WARNING_AFTER_FAILS = 5;

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
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [sendFailed, setSendFailed] = useState(false); // show retry button

  // Resend state
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [hardLockedFor, setHardLockedFor] = useState(0);
  const [serverLockedFor, setServerLockedFor] = useState(0);

  // OTP verify fail count — only show warnings after SHOW_LOCK_WARNING_AFTER_FAILS
  const [verifyFailCount, setVerifyFailCount] = useState(0);

  // ── Timers ──────────────────────────────────────────────────────────────
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

  // ── Send OTP (first time) ───────────────────────────────────────────────
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 10) return;

    setLocalError(null);
    setSendFailed(false);
    const result = await sendOtp(digitsOnly, "whatsapp");

    if (result.success) {
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setResendCount(0);
      resetOtpBoxes();
      setStep("otp");
    } else if (result.locked) {
      setServerLockedFor(result.retryAfterSeconds ?? SERVER_LOCK_DURATION_SECONDS);
    } else {
      setSendFailed(true); // show retry button on phone screen
    }
  }

  // ── Retry after failed send ─────────────────────────────────────────────
  async function handleRetrySend() {
    setSendFailed(false);
    setLocalError(null);
    const digitsOnly = phone.replace(/\D/g, "");
    const result = await sendOtp(digitsOnly, "whatsapp");

    if (result.success) {
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setResendCount(0);
      resetOtpBoxes();
      setStep("otp");
    } else if (result.locked) {
      setServerLockedFor(result.retryAfterSeconds ?? SERVER_LOCK_DURATION_SECONDS);
    } else {
      setSendFailed(true);
    }
  }

  // ── Resend OTP (from OTP screen) ────────────────────────────────────────
  async function handleResend() {
    if (resendCooldown > 0 || isSubmitting) return;

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
      resetOtpBoxes();
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      if (newCount >= RESEND_HARD_LIMIT) {
        setHardLockedFor(RESEND_HARD_LOCK_SECONDS);
      }
    } else if (result.locked) {
      setServerLockedFor(result.retryAfterSeconds ?? SERVER_LOCK_DURATION_SECONDS);
    }
  }

  // ── Verify OTP ──────────────────────────────────────────────────────────
  async function handleVerifyOtp(code: string) {
    const digitsOnly = phone.replace(/\D/g, "");
    const result = await verifyOtp(digitsOnly, code);

    if (!result.success) {
      setVerifyFailCount((c) => c + 1);
      resetOtpBoxes();
      return;
    }

    if (result.isNewUser) {
      setStep("profile");
    } else {
      router.push(redirectTo);
    }
  }

  // ── Complete profile ────────────────────────────────────────────────────
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

    if (result.success) router.push(redirectTo);
  }

  function handleChangeNumber() {
    setStep("phone");
    setServerLockedFor(0);
    setHardLockedFor(0);
    setResendCooldown(0);
    setResendCount(0);
    setVerifyFailCount(0);
    setSendFailed(false);
    resetOtpBoxes();
    setLocalError(null);
  }

  const displayError = error || localError;

  // ── Hard lock screen ─────────────────────────────────────────────────────
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
          <h2 className="text-xl font-extrabold text-gray-800">Too many resends</h2>
          <p className="mt-2 text-sm text-gray-500">
            Please wait before requesting another OTP.
          </p>
          <p className="mt-4 text-4xl font-bold text-brand tabular-nums">
            {formatTime(hardLockedFor)}
          </p>
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

  // ── Server lock screen ───────────────────────────────────────────────────
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
            OTP requests are blocked. Try again in:
          </p>
          <p className="mt-4 text-4xl font-bold text-brand tabular-nums">
            {formatTime(serverLockedFor)}
          </p>
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

  // ── Main form ────────────────────────────────────────────────────────────
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
          {displayError && !sendFailed && (
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

          {/* ── Phone step ── */}
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
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/\D/g, ""));
                      setSendFailed(false);
                    }}
                    maxLength={10}
                    className="w-full outline-none"
                    required
                    autoFocus
                  />
                </div>

                {/* Failed send — show error + retry */}
                {sendFailed && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-center space-y-2">
                    <p className="text-sm text-red-600">Unable to send OTP. Please try again.</p>
                    <button
                      type="button"
                      onClick={handleRetrySend}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                    >
                      <RefreshCw size={14} />
                      {isSubmitting ? "Retrying..." : "Retry"}
                    </button>
                  </div>
                )}

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

          {/* ── OTP step ── */}
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

              {/* ── Didn't receive OTP section ── */}
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

                {/* Warning: only show after enough resends OR verify fails */}
                {resendCount >= WARN_AFTER_RESENDS && resendCount < RESEND_HARD_LIMIT && (
                  <p className="text-center text-xs text-amber-600">
                    {RESEND_HARD_LIMIT - resendCount} resend
                    {RESEND_HARD_LIMIT - resendCount === 1 ? "" : "s"} left before 1-hr lock
                  </p>
                )}

                {/* Show 30-min lock warning only after 5+ failed verifications */}
                {verifyFailCount >= SHOW_LOCK_WARNING_AFTER_FAILS && (
                  <p className="text-center text-xs text-red-500">
                    Too many wrong attempts — you may be locked out for 30 minutes.
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

          {/* ── Profile step ── */}
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
