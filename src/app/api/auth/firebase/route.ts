import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

/**
 * Verifies a Firebase Phone Auth ID token (obtained client-side after OTP
 * confirmation), then either logs the matching user in or reports that
 * this is a new phone number so the client can collect a name/email.
 *
 * Response shape intentionally mirrors /api/auth/verify-otp so both flows
 * work with the same useAuth() hook on the client.
 */
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json(
        { success: false, message: "Firebase ID token is required." },
        { status: 400 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const phone = decoded.phone_number;
    const firebaseUid = decoded.uid;

    if (!phone) {
      return NextResponse.json(
        { success: false, message: "No phone number on this token." },
        { status: 400 }
      );
    }

    // Store phone the same way the rest of the app does (digits only, no +country code)
    const normalizedPhone = phone.replace(/^\+91/, "").replace(/\D/g, "");

    let user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          phoneVerified: true,
          firebaseUid,
          role: "CUSTOMER",
        },
      });
    } else if (!user.firebaseUid || !user.phoneVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true, firebaseUid },
      });
    }

    const isNewUser = !user.firstName;

    // Only start the session once we have at least a phone-verified account.
    // If the profile still needs a name, the client shows the "complete
    // profile" step and calls /api/auth/firebase-complete-profile, which
    // creates the session once that's done.
    if (!isNewUser) {
      await createSession({
        userId: user.id,
        phone: user.phone,
        role: user.role,
      });
    } else {
      // Still needed temporarily so /api/auth/firebase-complete-profile
      // knows which (already-created) user record to finish setting up.
      await createSession({
        userId: user.id,
        phone: user.phone,
        role: user.role,
      });
    }

    return NextResponse.json({
      success: true,
      isNewUser,
      message: isNewUser
        ? "Phone verified. Complete your profile."
        : "Login successful.",
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
    console.error("FIREBASE AUTH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Authentication failed.",
      },
      { status: 401 }
    );
  }
}
