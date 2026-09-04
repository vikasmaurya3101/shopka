import { authRepository } from "../repositories/auth.repository";

/**
 * Throttles OTP requests.
 *
 * Two reasons this exists beyond the obvious cost control: sending repeated
 * unrequested codes to a number is exactly the "unwanted messaging" pattern the
 * WhatsApp Business Messaging Policy holds the sender responsible for, and an
 * open endpoint lets anyone use our approved template to message strangers.
 *
 * Limits are enforced per phone number *and* per caller IP, because either one
 * alone is trivially sidestepped — one host cycling numbers, or one number hit
 * from many hosts.
 */

/** Per-number: short burst window, so "resend" still works but flooding doesn't. */
export const OTP_PHONE_WINDOW_MS = 15 * 60 * 1000;
export const OTP_PHONE_MAX = 5;

/** Per-number: a daily ceiling a burst limit alone can't express. */
export const OTP_PHONE_DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const OTP_PHONE_DAY_MAX = 15;

/** Per-IP: generous enough for a shared/CGNAT connection, tight enough to matter. */
export const OTP_IP_WINDOW_MS = 60 * 60 * 1000;
export const OTP_IP_MAX = 20;

/** Nothing here is useful past the widest window, so nothing is kept longer. */
const LOG_RETENTION_MS = OTP_PHONE_DAY_WINDOW_MS;

/** Roughly one prune per 20 sends — cheap enough to do inline, no cron needed. */
const PRUNE_PROBABILITY = 0.05;

export interface RateLimitDecision {
  allowed: boolean;
  /** Customer-facing reason; safe to show verbatim. */
  message?: string;
  /** Seconds to wait, when we can say. Surfaced as `Retry-After`. */
  retryAfterSeconds?: number;
}

const ALLOWED: RateLimitDecision = { allowed: true };

export class OtpRateLimiter {
  /**
   * Reads the caller IP from the proxy headers Vercel sets. `x-forwarded-for` is
   * a client-controlled header in general, but on a platform that overwrites it
   * the first entry is the real peer. Returns null rather than a fake value when
   * absent, so an unknown IP simply isn't rate limited by IP (the phone limit
   * still applies) instead of every unknown caller sharing one bucket.
   */
  extractIp(headers: Headers): string | null {
    const forwarded = headers.get("x-forwarded-for");

    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }

    return headers.get("x-real-ip")?.trim() || null;
  }

  /**
   * Decides whether this request may send a code. Call `record()` afterwards for
   * the requests you allow.
   */
  async check(phone: string, ip: string | null): Promise<RateLimitDecision> {
    const [burst, daily] = await Promise.all([
      authRepository.countOtpRequestsByPhone(phone, OTP_PHONE_WINDOW_MS),
      authRepository.countOtpRequestsByPhone(phone, OTP_PHONE_DAY_WINDOW_MS),
    ]);

    if (burst >= OTP_PHONE_MAX) {
      return {
        allowed: false,
        message:
          "Too many OTP requests for this number. Please wait a few minutes and try again.",
        retryAfterSeconds: Math.ceil(OTP_PHONE_WINDOW_MS / 1000),
      };
    }

    if (daily >= OTP_PHONE_DAY_MAX) {
      return {
        allowed: false,
        message:
          "This number has reached today's OTP limit. Please try again tomorrow or contact support.",
      };
    }

    if (ip) {
      const fromIp = await authRepository.countOtpRequestsByIp(
        ip,
        OTP_IP_WINDOW_MS
      );

      if (fromIp >= OTP_IP_MAX) {
        return {
          allowed: false,
          message: "Too many OTP requests from this device. Please try again later.",
          retryAfterSeconds: Math.ceil(OTP_IP_WINDOW_MS / 1000),
        };
      }
    }

    return ALLOWED;
  }

  /**
   * Logs an allowed request and, occasionally, prunes expired rows. Failures are
   * swallowed: a bookkeeping error must not break a login that already passed
   * the check.
   */
  async record(phone: string, ip: string | null): Promise<void> {
    try {
      await authRepository.logOtpRequest(phone, ip);

      if (Math.random() < PRUNE_PROBABILITY) {
        await authRepository.purgeOtpRequestLogs(LOG_RETENTION_MS);
      }
    } catch (error) {
      console.error("OTP rate-limit bookkeeping failed:", error);
    }
  }
}

export const otpRateLimiter = new OtpRateLimiter();
