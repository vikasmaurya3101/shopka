import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { authRepository } from "@/features/auth/repositories/auth.repository";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Finishes onboarding a user who just verified their phone number via
 * Firebase (a session already exists at this point — see
 * /api/auth/firebase — but the profile still needs a name).
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
    const { firstName, lastName, email } = body;

    if (!firstName?.trim()) {
      return NextResponse.json(
        { success: false, message: "First name is required." },
        { status: 400 }
      );
    }

    const trimmedEmail: string | undefined = email?.trim() || undefined;

    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (trimmedEmail) {
      const existingEmail = await authRepository.findUserByEmail(trimmedEmail);
      if (existingEmail && existingEmail.id !== session.userId) {
        return NextResponse.json(
          {
            success: false,
            message: "That email is already linked to another account.",
          },
          { status: 409 }
        );
      }
    }

    const user = await authRepository.updateProfile(
      session.userId,
      firstName.trim(),
      lastName?.trim() || undefined,
      trimmedEmail
    );

    return NextResponse.json({
      success: true,
      message: "Profile completed successfully.",
      data: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phoneVerified: user.phoneVerified,
        whatsappConsent: user.whatsappConsent,
      },
    });
  } catch (error) {
    console.error("FIREBASE COMPLETE PROFILE ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
