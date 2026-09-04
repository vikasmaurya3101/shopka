import { OtpPurpose } from "@prisma/client";

import { authRepository } from "../repositories/auth.repository";

import {
  compareOtp,
  generateOtp,
  getExpiryDate,
  hashOtp,
} from "../utils/otp";

import { mockProvider } from "../providers/mock.provider";
import { whatsappProvider } from "../providers/whatsapp.provider";
import { smsProvider } from "../providers/sms.provider";
import { messageCentralProvider } from "../providers/messagecentral.provider";

export type OtpChannelRequest = "whatsapp" | "sms";

export interface SendOtpResult {
  success: true;
  channelUsed: OtpChannelRequest;
}

/** True when nothing real is configured — logs OTPs to the console instead of sending them. */
function isMockMode(): boolean {
  const hasRealProvider =
    whatsappProvider.isConfigured() ||
    messageCentralProvider.isConfigured() ||
    smsProvider.isConfigured();

  return !hasRealProvider || (process.env.OTP_PROVIDER ?? "").toLowerCase() === "mock";
}

/**
 * How long an OTP row is kept after it stops being usable. Codes expire in
 * minutes; this window only exists so a verified row can still act as proof of
 * ownership on the signup step. Past it the row is just a stored phone number,
 * so it's deleted. This figure is what the privacy policy states.
 */
export const OTP_RETENTION_MS = 24 * 60 * 60 * 1000;

/** Roughly one prune per 20 sends — keeps the send path cheap, no cron needed. */
const PRUNE_PROBABILITY = 0.05;


export class OtpService {
  /**
   * Sends a login/signup OTP. Login flow:
   *  - channel "whatsapp" (default): tries WhatsApp first; if it's not
   *    configured or the send fails, falls straight through to SMS in the
   *    same call so the caller never has to guess which one worked.
   *  - channel "sms": skips WhatsApp entirely (used for the "Send on SMS
   *    instead" fallback after 30s, or when the caller already knows
   *    WhatsApp isn't an option).
   * The actual delivery channel used is returned as `channelUsed` so the
   * UI can show the right message ("sent via WhatsApp" vs "sent via SMS").
   */
  async sendOtp(
    phone: string,
    purpose: OtpPurpose,
    channel: OtpChannelRequest = "whatsapp"
  ): Promise<SendOtpResult> {
    await authRepository.clearPendingOtp(phone, purpose);

    // Opportunistic retention cleanup. Best-effort: never fail a login because
    // housekeeping failed.
    if (Math.random() < PRUNE_PROBABILITY) {
      try {
        await authRepository.purgeStaleOtps(OTP_RETENTION_MS);
      } catch (err) {
        console.error("OTP retention purge failed:", err);
      }
    }

    if (isMockMode()) {
      const otp = generateOtp();
      const otpHash = await hashOtp(otp);

      await authRepository.createOtp({
        phone,
        otpHash,
        purpose,
        channel: channel === "whatsapp" ? "WHATSAPP" : "SMS",
        provider: "mock",
        expiresAt: getExpiryDate(),
      });

      await mockProvider.send(phone, otp);
      return { success: true, channelUsed: channel };
    }

    if (channel === "whatsapp" && whatsappProvider.isConfigured()) {
      try {
        const otp = generateOtp();
        const otpHash = await hashOtp(otp);

        await whatsappProvider.send(phone, otp);

        await authRepository.createOtp({
          phone,
          otpHash,
          purpose,
          channel: "WHATSAPP",
          provider: "aisensy",
          expiresAt: getExpiryDate(),
        });

        return { success: true, channelUsed: "whatsapp" };
      } catch (err) {
        console.error("WhatsApp OTP delivery failed, falling back to SMS:", err);
        // fall through to SMS below
      }
    }

    // SMS path — either explicitly requested, or WhatsApp unavailable/failed.
    if (messageCentralProvider.isConfigured()) {
      const verificationId = await messageCentralProvider.sendOtp(phone);

      await authRepository.createOtp({
        phone,
        otpHash: verificationId,
        purpose,
        channel: "SMS",
        provider: "messagecentral",
        expiresAt: getExpiryDate(),
      });

      return { success: true, channelUsed: "sms" };
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);

    await smsProvider.send(phone, otp);

    await authRepository.createOtp({
      phone,
      otpHash,
      purpose,
      channel: "SMS",
      provider: "sms",
      expiresAt: getExpiryDate(),
    });

    return { success: true, channelUsed: "sms" };
  }

  async verifyOtp(phone: string, otp: string, purpose: OtpPurpose) {
    const record = await authRepository.findLatestOtp(phone, purpose);

    if (!record) {
      throw new Error("OTP not found");
    }

    if (record.expiresAt < new Date()) {
      throw new Error("OTP expired");
    }

    if (record.attempts >= 5) {
      throw new Error("Maximum attempts exceeded");
    }

    // Verification method follows whichever provider actually generated
    // this specific OTP record, not the current global default — this
    // keeps mixed WhatsApp-then-SMS-fallback attempts within one login
    // working correctly regardless of which one the user ends up using.
    const valid =
      record.provider === "messagecentral"
        ? await messageCentralProvider.verifyOtp(record.otpHash, otp)
        : await compareOtp(otp, record.otpHash);

    if (!valid) {
      await authRepository.increaseAttempts(record.id);
      throw new Error("Invalid OTP");
    }

    await authRepository.markVerified(record.id);

    return true;
  }
}

export const otpService = new OtpService();
