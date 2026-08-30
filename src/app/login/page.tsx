"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { useAuth, type OtpChannel } from "@/hooks/useAuth";
import Logo from "@/components/shared/Logo";
import OtpInput from "@/components/auth/OtpInput";

type Step = "phone" | "otp" | "profile";

const WHATSAPP_WAIT_SECONDS = 30;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
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
  const [localError, setLocalError] = useState<string | null>(null);

  // Delivery-channel state for the WhatsApp-first, SMS-fallback OTP flow.
  const [channel, setChannel] = useState<OtpChannel>("whatsapp");
  const [whatsappTriedFirst, setWhatsappTriedFirst] = useState(false);
  const [fallbackFired, setFallbackFired] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Tick the "waiting for WhatsApp" countdown once a second.
  useEffect(() => {
    if (step !== "otp" || channel !== "whatsapp" || fallbackFired || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, channel, fallbackFired, countdown]);

  // 30s with no confirmed delivery on WhatsApp → fall back to SMS automatically.
  useEffect(() => {
    if (step === "otp" && channel === "whatsapp" && !fallbackFired && countdown === 0) {
      void handleSmsFallback(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown, step, channel, fallbackFired]);

  // Generic anti-spam cooldown for the resend control, independent of the
  // WhatsApp wait timer above.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  function resetOtpBoxes() {
    setOtp("");
    setOtpInputKey((k) => k + 1);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();

    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 10) return;

    setLocalError(null);
    const result = await sendOtp(digitsOnly, "whatsapp");

    if (result.success) {
      const usedChannel = result.channelUsed ?? "whatsapp";
      setChannel(usedChannel);
      setWhatsappTriedFirst(usedChannel === "whatsapp");
      setFallbackFired(usedChannel !== "whatsapp");
      setCountdown(usedChannel === "whatsapp" ? WHATSAPP_WAIT_SECONDS : 0);
      setResendCooldown(WHATSAPP_WAIT_SECONDS);
      resetOtpBoxes();
      setStep("otp");
    }
  }

  async function handleSmsFallback(isAutomatic: boolean) {
    if (isSubmitting) return;

    setFallbackFired(true);
    setChannel("sms");

    const digitsOnly = phone.replace(/\D/g, "");
    const result = await sendOtp(digitsOnly, "sms");

    if (result.success) {
      resetOtpBoxes();
      setResendCooldown(WHATSAPP_WAIT_SECONDS);
      if (!isAutomatic) setLocalError(null);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || isSubmitting) return;
    await handleSmsFallback(false);
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
    });

    if (result.success) {
      router.push(redirectTo);
    }
  }

  function handleChangeNumber() {
    setStep("phone");
    setChannel("whatsapp");
    setFallbackFired(false);
    setCountdown(0);
    setResendCooldown(0);
    resetOtpBoxes();
    setLocalError(null);
  }

  const displayError = error || localError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_20px_50px_-15px_rgba(214,38,111,0.25)]"
      >
        <div className="flex justify-center">
          <Logo size={52} showText={false} />
        </div>

        <h1 className="mt-4 text-center text-2xl font-extrabold text-brand">
          Shopka
        </h1>

        <p className="mt-1 text-center text-sm text-gray-500">
          {step === "phone" && "Login or sign up to continue"}
          {step === "otp" &&
            (channel === "whatsapp" ? (
              <>
                Code sent on <span className="font-semibold text-gray-700">WhatsApp</span> to +91 {phone}
              </>
            ) : (
              <>
                Code sent via <span className="font-semibold text-gray-700">SMS</span> to +91 {phone}
              </>
            ))}
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
                  <span className="mr-2 text-sm font-medium text-gray-500">
                    +91
                  </span>
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
                  <MessageCircle size={13} className="text-green-600" />
                  We&apos;ll verify via WhatsApp, with SMS as backup
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

              <div className="space-y-2 text-center">
                {channel === "whatsapp" && !fallbackFired ? (
                  <>
                    <p className="text-xs text-gray-400">
                      Didn&apos;t get it on WhatsApp? We&apos;ll send it via SMS automatically.
                    </p>
                    <button
                      type="button"
                      disabled
                      className="text-sm font-semibold text-gray-400"
                    >
                      Send on SMS instead (0:{countdown.toString().padStart(2, "0")})
                    </button>
                  </>
                ) : (
                  <>
                    {whatsappTriedFirst && (
                      <p className="text-xs text-gray-400">
                        We&apos;ve also sent your code via SMS, just in case.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || isSubmitting}
                      className="text-sm font-semibold text-brand hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                      {resendCooldown > 0
                        ? `Resend code (0:${resendCooldown.toString().padStart(2, "0")})`
                        : "Resend via SMS"}
                    </button>
                  </>
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
                  Email <span className="font-normal text-gray-400">(optional)</span>
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
