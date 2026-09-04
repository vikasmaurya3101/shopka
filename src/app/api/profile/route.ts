import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { authRepository } from "@/features/auth/repositories/auth.repository";
import { getSession } from "@/lib/session";

/** Hoisted so the refine below doesn't rebuild a schema on every request. */
const emailAddress = z.email();

const UpdateProfileDto = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "Please enter your first name.")
    .max(50, "First name must be 50 characters or less."),
  lastName: z
    .string()
    .trim()
    .max(50, "Last name must be 50 characters or less.")
    .optional(),
  // An empty string is how the form says "remove my email", so it has to pass
  // validation while anything else must still be a real address.
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || emailAddress.safeParse(value).success, {
      message: "Enter a valid email address.",
    })
    .optional(),
});

/**
 * Lets the signed-in user correct their own name and email.
 *
 * This is what fulfils the "you may view and correct your name and email from
 * My Account" promise in section 9 of the Privacy Policy, i.e. the right to
 * correction under India's DPDP Act 2023. It deliberately cannot change the
 * phone number: that is the account identifier and needs an OTP, which is what
 * /add-phone and /api/auth/add-phone are for.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "You must be signed in." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = UpdateProfileDto.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            parsed.error.issues[0]?.message ?? "Please check the details you entered.",
        },
        { status: 400 }
      );
    }

    const user = await authRepository.updateProfile(
      session.userId,
      parsed.data.firstName,
      // Blank means "no last name", which the column stores as NULL — passing
      // "" through would leave an empty string sitting where NULL belongs.
      parsed.data.lastName || undefined,
      parsed.data.email
    );

    return NextResponse.json({
      success: true,
      message: "Profile updated.",
      // Shaped exactly like SessionUser so the browser can pass it straight to
      // `setUser` — no other user columns are exposed.
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
    // `User.email` is unique, so a second account claiming the same address
    // surfaces as P2002 rather than as a validation failure.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "That email is already linked to another account.",
        },
        { status: 409 }
      );
    }

    console.error("Profile update error:", error);

    return NextResponse.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
