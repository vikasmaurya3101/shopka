"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useSession } from "@/providers/SessionProvider";

export type OtpChannel = "whatsapp" | "sms";

interface ApiResult<T = unknown> {
  success: boolean;
  message?: string;
  isNewUser?: boolean;
  channelUsed?: OtpChannel;
  data?: T;
}

async function postJson<T = unknown>(
  url: string,
  body: unknown
): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return res.json();
}

function firebaseErrorMessage(raw: string): string {
  if (raw.includes("auth/invalid-phone-number"))
    return "Enter a valid 10-digit mobile number.";
  if (raw.includes("auth/too-many-requests"))
    return "Too many attempts. Please wait a bit and try again.";
  if (raw.includes("auth/invalid-verification-code"))
    return "That OTP doesn't look right. Please check and try again.";
  if (raw.includes("auth/code-expired"))
    return "This OTP has expired. Please request a new one.";
  if (raw.includes("auth/network-request-failed"))
    return "Network error. Please check your connection and try again.";
  if (raw.includes("auth/api-key-not-valid") || raw.includes("auth/invalid-api-key"))
    return "Phone login isn't configured yet. Please contact support.";
  return "Something went wrong. Please try again.";
}

interface SessionUserResult {
  id: string;
  phone: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: "CUSTOMER" | "SELLER" | "ADMIN";
  phoneVerified: boolean;
  whatsappConsent: boolean;
}

/**
 * Client hook wrapping the app's authentication flows:
 * - Phone + OTP: sendOtp(phone, channel) -> verifyOtp -> (completeProfile
 *   if new user). `channel` defaults to "whatsapp" (with automatic SMS
 *   fallback server-side); pass "sms" to force SMS directly, e.g. from
 *   the "Send on SMS instead" button.
 * - addPhone: attaches/verifies a phone number on the current (logged-in)
 *   session — used by /add-phone, e.g. for legacy accounts without one.
 * - logout
 */
export function useAuth() {
  const { user, isAuthenticated, isLoading, refresh, setUser } =
    useSession();

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = useCallback(
    async (phone: string, channel: OtpChannel = "whatsapp") => {
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await postJson("/api/auth/send-otp", { phone, channel });

        if (!result.success) {
          setError(result.message ?? "Unable to send OTP.");
        }

        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const verifyOtp = useCallback(
    async (phone: string, otp: string) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await postJson<SessionUserResult>(
          "/api/auth/verify-otp",
          { phone, otp }
        );

        if (!result.success) {
          setError(result.message ?? "Invalid OTP.");
          return result;
        }

        if (!result.isNewUser && result.data) {
          setUser(result.data);
        } else {
          await refresh();
        }

        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refresh, setUser]
  );

  const completeProfile = useCallback(
    async (data: {
      phone: string;
      firstName: string;
      lastName?: string;
      email?: string;
      /** Explicit WhatsApp opt-in from the signup checkbox. Optional. */
      whatsappConsent?: boolean;
    }) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await postJson(
          "/api/auth/complete-profile",
          data
        );

        if (!result.success) {
          setError(result.message ?? "Unable to complete profile.");
          return result;
        }

        await refresh();

        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refresh]
  );

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  /**
   * Sends a real SMS OTP via Firebase Phone Auth to the given 10-digit
   * Indian mobile number. Needs an invisible reCAPTCHA container with
   * id="firebase-recaptcha-container" mounted in the page.
   */
  const firebaseSendOtp = useCallback(async (phone: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (typeof window === "undefined") {
        return { success: false, message: "Not available." };
      }

      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier(
          getFirebaseAuth(),
          "firebase-recaptcha-container",
          { size: "invisible" }
        );
      }

      const e164 = phone.startsWith("+") ? phone : `+91${phone}`;

      const confirmation = await signInWithPhoneNumber(
        getFirebaseAuth(),
        e164,
        recaptchaRef.current
      );

      confirmationRef.current = confirmation;

      return { success: true };
    } catch (err) {
      const message =
        err instanceof Error
          ? firebaseErrorMessage(err.message)
          : "Unable to send OTP. Please try again.";
      setError(message);
      return { success: false, message };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  /** Confirms the OTP with Firebase, then syncs the account with our backend. */
  const firebaseVerifyOtp = useCallback(
    async (otp: string) => {
      setIsSubmitting(true);
      setError(null);

      try {
        if (!confirmationRef.current) {
          const message = "Please request a new OTP.";
          setError(message);
          return { success: false, message };
        }

        const result = await confirmationRef.current.confirm(otp);
        const idToken = await result.user.getIdToken();

        const apiResult = await postJson<SessionUserResult>(
          "/api/auth/firebase",
          { idToken }
        );

        if (!apiResult.success) {
          setError(apiResult.message ?? "Invalid OTP.");
          return apiResult;
        }

        if (!apiResult.isNewUser && apiResult.data) {
          setUser(apiResult.data);
        } else {
          await refresh();
        }

        return apiResult;
      } catch (err) {
        const message =
          err instanceof Error
            ? firebaseErrorMessage(err.message)
            : "Invalid OTP. Please try again.";
        setError(message);
        return { success: false, message };
      } finally {
        setIsSubmitting(false);
      }
    },
    [refresh, setUser]
  );

  /** Completes profile setup for a brand-new Firebase phone login. */
  const firebaseCompleteProfile = useCallback(
    async (data: { firstName: string; lastName?: string; email?: string }) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await postJson<SessionUserResult>(
          "/api/auth/firebase-complete-profile",
          data
        );

        if (!result.success) {
          setError(result.message ?? "Unable to complete profile.");
          return result;
        }

        await refresh();

        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refresh]
  );

  /** Attaches and verifies a phone number on the current (logged-in) account. */
  const addPhone = useCallback(
    async (phone: string, otp: string) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await postJson<SessionUserResult>(
          "/api/auth/add-phone",
          { phone, otp }
        );

        if (!result.success) {
          setError(result.message ?? "Unable to verify phone number.");
          return result;
        }

        if (result.data) setUser(result.data);

        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    [setUser]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }, [router, setUser]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isSubmitting,
    error,
    sendOtp,
    verifyOtp,
    completeProfile,
    firebaseSendOtp,
    firebaseVerifyOtp,
    firebaseCompleteProfile,
    addPhone,
    logout,
  };
}

export default useAuth;
