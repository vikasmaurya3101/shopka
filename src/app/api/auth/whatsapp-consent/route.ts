import { NextRequest, NextResponse } from "next/server";

import { authRepository } from "@/features/auth/repositories/auth.repository";
import { getSession } from "@/lib/session";

/**
 * Records an explicit WhatsApp opt-in / opt-out for the signed-in user.
 *
 * Used by the checkout consent checkbox. Consent is optional — refusing it must
 * never block an order — so this endpoint only ever writes the flag and never
 * gates anything else.
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
    const consent = body?.consent;

    if (typeof consent !== "boolean") {
      return NextResponse.json(
        { success: false, message: "`consent` must be a boolean." },
        { status: 400 }
      );
    }

    const user = await authRepository.setWhatsappConsent(session.userId, consent);

    return NextResponse.json({
      success: true,
      message: consent
        ? "WhatsApp updates turned on."
        : "WhatsApp updates turned off.",
      // Shaped as SessionUser rather than returned wholesale, so internal
      // columns like firebaseUid and the consent audit timestamps stay server-side.
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
    console.error("WhatsApp consent update error:", error);

    return NextResponse.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
