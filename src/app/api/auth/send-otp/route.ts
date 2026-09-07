import { NextRequest, NextResponse } from "next/server";
import { sendOtpSchema } from "@/features/auth/validators/auth.validator";
import { otpService } from "@/features/auth/services/otp.service";
import { otpRateLimiter, OTP_PHONE_MAX, OTP_PHONE_WINDOW_MS } from "@/features/auth/services/otp-rate-limit.service";
import { authRepository } from "@/features/auth/repositories/auth.repository";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = sendOtpSchema.parse(body);

    const ip = otpRateLimiter.extractIp(request.headers);
    const decision = await otpRateLimiter.check(data.phone, ip);

    if (!decision.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: decision.message ?? "Too many OTP requests.",
          locked: true,
          retryAfterSeconds: decision.retryAfterSeconds,
        },
        {
          status: 429,
          headers: decision.retryAfterSeconds
            ? { "Retry-After": String(decision.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    await otpRateLimiter.record(data.phone, ip);

    await otpService.sendOtp(data.phone, "LOGIN", "whatsapp");

    // Tell the UI how many attempts are left in this window
    const usedCount = await authRepository.countOtpRequestsByPhone(
      data.phone,
      OTP_PHONE_WINDOW_MS
    );
    const attemptsLeft = Math.max(0, OTP_PHONE_MAX - usedCount);

    return NextResponse.json({
      success: true,
      message: "OTP sent on WhatsApp.",
      channelUsed: "whatsapp",
      attemptsLeft,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "Unable to send OTP." },
      { status: 400 }
    );
  }
}
