import { NextRequest, NextResponse } from "next/server";

import { authRepository } from "@/features/auth/repositories/auth.repository";
import { createSession } from "@/lib/session";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * How long a verified OTP stays usable as proof of ownership — long enough to
 * type a name and email on the profile step, short enough that a stale code
 * can't be picked up much later.
 */
const OTP_PROOF_MAX_AGE_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { phone, firstName, lastName, email, whatsappConsent } = body;

    if (!phone || !firstName?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone and first name are required.",
        },
        { status: 400 }
      );
    }

    // This endpoint creates an account with `phoneVerified: true` and issues a
    // session, so the caller has to prove they actually received a code on this
    // number. Nothing else in the request body does that. Checking it before the
    // "already exists" branch below also stops the route being used to test
    // whether an arbitrary number is registered.
    const proof = await authRepository.findVerifiedOtp(
      phone,
      "LOGIN",
      OTP_PROOF_MAX_AGE_MS
    );

    if (!proof) {
      return NextResponse.json(
        {
          success: false,
          message: "Verify your phone number before completing your profile.",
        },
        { status: 401 }
      );
    }

    const trimmedEmail: string | undefined = email?.trim() || undefined;

    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid email address.",
        },
        { status: 400 }
      );
    }

    const existingUser = await authRepository.findUser(phone);

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "User already exists.",
        },
        { status: 409 }
      );
    }

    if (trimmedEmail) {
      const existingEmail = await authRepository.findUserByEmail(trimmedEmail);

      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            message: "That email is already linked to another account.",
          },
          { status: 409 }
        );
      }
    }

    const user = await authRepository.createUser({
      phone,
      firstName: firstName.trim(),
      lastName: lastName?.trim() || undefined,
      email: trimmedEmail,
      // Opt-in only counts when the client sends a literal `true`; anything else
      // (absent, null, "false") is treated as no consent.
      whatsappConsent: whatsappConsent === true,
    });

    // Burn the proof so the same verified code can't be replayed to mint a
    // second account (or to re-attach the number after it's been changed).
    await authRepository.consumeOtp(proof.id);

    await createSession({
      userId: user.id,
      phone: user.phone,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: "Profile completed successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Complete profile error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}
