import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  sendOtpSchema,
} from "@/features/auth/validators/auth.validator";

import {
  otpService,
} from "@/features/auth/services/otp.service";

import {
  otpRateLimiter,
} from "@/features/auth/services/otp-rate-limit.service";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    const data =
      sendOtpSchema.parse(body);

    // Unauthenticated endpoint that makes us send a WhatsApp/SMS message to an
    // arbitrary number, so it is throttled by number and by caller IP before
    // anything is sent. See otp-rate-limit.service.ts for why both are needed.
    const ip = otpRateLimiter.extractIp(request.headers);
    const decision = await otpRateLimiter.check(data.phone, ip);

    if (!decision.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: decision.message ?? "Too many OTP requests.",
        },
        {
          status: 429,
          headers: decision.retryAfterSeconds
            ? { "Retry-After": String(decision.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    // Counted before delivery is attempted: a provider that errors or hangs
    // must not hand out free retries.
    await otpRateLimiter.record(data.phone, ip);

    const result = await otpService.sendOtp(
      data.phone,
      "LOGIN",
      data.channel ?? "whatsapp"
    );

    return NextResponse.json({
      success: true,
      message:
        result.channelUsed === "whatsapp"
          ? "OTP sent on WhatsApp."
          : "OTP sent via SMS.",
      channelUsed: result.channelUsed,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to send OTP.",
      },
      {
        status: 400,
      }
    );
  }
}
