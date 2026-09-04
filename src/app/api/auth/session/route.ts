import { NextResponse } from "next/server";

import { getSession } from "@/lib/session";
import { authRepository } from "@/features/auth/repositories/auth.repository";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
      });
    }

    const user = await authRepository.findUserById(session.userId);

    if (!user) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phoneVerified: user.phoneVerified,
        // Exposed so the checkout / profile consent controls can render the
        // user's actual stored choice instead of defaulting to unticked every
        // time, which silently misrepresented an existing opt-in as absent.
        whatsappConsent: user.whatsappConsent,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to get session.",
      },
      {
        status: 500,
      }
    );
  }
}