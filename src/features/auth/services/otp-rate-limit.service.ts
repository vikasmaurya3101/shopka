import { authRepository } from "../repositories/auth.repository";

/**
 * Throttles OTP requests.
 *
 * Per-phone rules (what the user sees):
 *   - Max 3 requests in any 30-minute window → locked for 30 min
 *   - Max 10 requests in 24 hours (daily ceiling)
 *
 * Per-IP rules (abuse / bot protection, hidden from user):
 *   - Max 20 requests per hour from one IP
 */

/** Per-phone: 3 OTPs in 30 minutes, then locked for the rest of that window. */
export const OTP_PHONE_WINDOW_MS = 30 * 60 * 1000;   // 30 minutes
export const OTP_PHONE_MAX = 3;

/** Per-phone: daily ceiling so a burst window alone can't be cycled. */
export const OTP_PHONE_DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const OTP_PHONE_DAY_MAX = 10;

/** Per-IP: generous for CGNAT/shared connections, still meaningful. */
export const OTP_IP_WINDOW_MS = 60 * 60 * 1000;
export const OTP_IP_MAX = 20;

const LOG_RETENTION_MS = OTP_PHONE_DAY_WINDOW_MS;
const PRUNE_PROBABILITY = 0.05;

export interface RateLimitDecision {
  allowed: boolean;
  message?: string;
  retryAfterSeconds?: number;
}

const ALLOWED: RateLimitDecision = { allowed: true };

export class OtpRateLimiter {
  extractIp(headers: Headers): string | null {
    const forwarded = headers.get("x-forwarded-for");

    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }

    return headers.get("x-real-ip")?.trim() || null;
  }

  async check(phone: string, ip: string | null): Promise<RateLimitDecision> {
    const [burst, daily] = await Promise.all([
      authRepository.countOtpRequestsByPhone(phone, OTP_PHONE_WINDOW_MS),
      authRepository.countOtpRequestsByPhone(phone, OTP_PHONE_DAY_WINDOW_MS),
    ]);

    if (burst >= OTP_PHONE_MAX) {
      return {
        allowed: false,
        message:
          "You've requested too many OTPs. Please wait 30 minutes and try again.",
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
