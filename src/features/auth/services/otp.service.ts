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

export type OtpChannelRequest = "whatsapp";

export interface SendOtpResult {
  success: true;
  channelUsed: OtpChannelRequest;
}

/** True when WhatsApp is not configured — logs OTPs to console instead. */
function isMockMode(): boolean {
  return (
    !whatsappProvider.isConfigured() ||
    (process.env.OTP_PROVIDER ?? "").toLowerCase() === "mock"
  );
}

/**
 * How long an OTP row is kept after it stops being usable. Codes expire in
 * minutes; this window only exists so a verified row can still act as proof of
 * ownership on the signup step.
 */
export const OTP_RETENTION_MS = 24 * 60 * 60 * 1000;

/** Roughly one prune per 20 sends — keeps the send path cheap, no cron needed. */
const PRUNE_PROBABILITY = 0.05;

export class OtpService {
  /**
   * Sends a login/signup OTP via WhatsApp (Fast2SMS).
   * Falls back to mock mode (console log) if FAST2SMS_API_KEY is not set.
   */
  async sendOtp(
    phone: string,
    purpose: OtpPurpose,
    channel: OtpChannelRequest = "whatsapp"
  ): Promise<SendOtpResult> {
    await authRepository.clearPendingOtp(phone, purpose);

    // Opportunistic retention cleanup — best-effort, never fail a login.
    if (Math.random() < PRUNE_PROBABILITY) {
      try {
        await authRepository.purgeStaleOtps(OTP_RETENTION_MS);
      } catch (err) {
        console.error("OTP retention purge failed:", err);
      }
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);

    if (isMockMode()) {
      await authRepository.createOtp({
        phone,
        otpHash,
        purpose,
        channel: "WHATSAPP",
        provider: "mock",
        expiresAt: getExpiryDate(),
      });

      await mockProvider.send(phone, otp);
      return { success: true, channelUsed: "whatsapp" };
    }

    // Send via WhatsApp (Fast2SMS)
    await whatsappProvider.send(phone, otp);

    await authRepository.createOtp({
      phone,
      otpHash,
      purpose,
      channel: "WHATSAPP",
      provider: "fast2sms",
      expiresAt: getExpiryDate(),
    });

    return { success: true, channelUsed: "whatsapp" };
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

    const valid = await compareOtp(otp, record.otpHash);

    if (!valid) {
      await authRepository.increaseAttempts(record.id);
      throw new Error("Invalid OTP");
    }

    await authRepository.markVerified(record.id);

    return true;
  }
}

export const otpService = new OtpService();
