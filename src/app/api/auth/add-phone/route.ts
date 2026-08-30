import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, createSession } from "@/lib/session";
import { otpService } from "@/features/auth/services/otp.service";
import { authRepository } from "@/features/auth/repositories/auth.repository";

const AddPhoneDto = z.object({
  phone: z.string().trim().min(10).max(15),
  otp: z.string().trim().min(4).max(6),
});

/**
 * Verifies an OTP and attaches the phone number to the CURRENTLY LOGGED IN
 * user — for any account that doesn't have one yet (e.g. legacy accounts
 * from the now-removed Google sign-in). Reuses the same OTP records
 * /api/auth/send-otp creates (purpose LOGIN).
 */
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Login required." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { phone, otp } = AddPhoneDto.parse(body);

    const existing = await authRepository.findUser(phone);

    if (existing && existing.id !== session.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "That phone number is already linked to another account.",
        },
        { status: 409 }
      );
    }

    await otpService.verifyOtp(phone, otp, "LOGIN");

    const user = await authRepository.attachPhone(session.userId, phone);

    await createSession({
      userId: user.id,
      phone: user.phone,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: "Phone number verified.",
      data: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phoneVerified: user.phoneVerified,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to verify phone.",
      },
      { status: 400 }
    );
  }
}
