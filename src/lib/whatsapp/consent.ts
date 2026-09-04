import { authRepository } from "@/features/auth/repositories/auth.repository";

/**
 * Send-time consent gate for WhatsApp messages.
 *
 * Meta's WhatsApp Business Messaging Policy treats the three template
 * categories differently, and conflating them is the usual way businesses get
 * their number quality rating dropped or their template rejected:
 *
 * - AUTHENTICATION — one-time codes. The user just asked for it, so no stored
 *   opt-in is required. This is the only category the login flow uses today.
 * - UTILITY — messages about a transaction the user themselves initiated
 *   (order confirmed, shipped, delivered). No marketing opt-in required, but an
 *   explicit opt-out ("STOP", or unticking the box) must still be honoured.
 * - MARKETING — offers, promotions, cart nudges, re-engagement. Requires a
 *   recorded, affirmative prior opt-in. No exceptions.
 *
 * Anything that sends a non-AUTHENTICATION WhatsApp message MUST route through
 * `canSendWhatsApp` / `assertCanSendWhatsApp` first. Nothing in the app sends
 * those yet; this exists so the first thing that does can't get it wrong.
 */
export type WhatsAppMessageCategory =
  | "AUTHENTICATION"
  | "UTILITY"
  | "MARKETING";

export interface WhatsAppConsentState {
  whatsappConsent: boolean;
  whatsappConsentAt: Date | null;
  whatsappOptOutAt: Date | null;
}

export interface ConsentDecision {
  allowed: boolean;
  /** Why, for logs and for the notification record. Never shown to customers. */
  reason: string;
}

/**
 * True when the user has actively told us to stop. A user who simply never
 * ticked the box is *not* opted out — they've expressed nothing, which still
 * permits utility messages about their own order but never marketing.
 */
export function hasOptedOutOfWhatsApp(state: WhatsAppConsentState): boolean {
  if (state.whatsappConsent) return false;

  return state.whatsappOptOutAt !== null;
}

export function canSendWhatsApp(
  state: WhatsAppConsentState,
  category: WhatsAppMessageCategory
): ConsentDecision {
  if (category === "AUTHENTICATION") {
    // The user triggered this themselves seconds ago by asking to log in.
    return { allowed: true, reason: "authentication template, user-initiated" };
  }

  if (hasOptedOutOfWhatsApp(state)) {
    return {
      allowed: false,
      reason: `user opted out on ${state.whatsappOptOutAt?.toISOString()}`,
    };
  }

  if (category === "MARKETING") {
    return state.whatsappConsent
      ? {
          allowed: true,
          reason: `marketing opt-in recorded ${
            state.whatsappConsentAt?.toISOString() ?? "(timestamp missing)"
          }`,
        }
      : { allowed: false, reason: "no marketing opt-in on record" };
  }

  return { allowed: true, reason: "utility message about the user's own order" };
}

/**
 * Loads the stored consent state and decides. Returns `allowed: false` for an
 * unknown user rather than throwing, so a caller looping over recipients can
 * skip and carry on.
 */
export async function canSendWhatsAppToUser(
  userId: string,
  category: WhatsAppMessageCategory
): Promise<ConsentDecision & { phone: string | null }> {
  const user = await authRepository.findWhatsappConsentState(userId);

  if (!user) {
    return { allowed: false, reason: "user not found", phone: null };
  }

  if (!user.phone) {
    return { allowed: false, reason: "user has no phone number", phone: null };
  }

  return { ...canSendWhatsApp(user, category), phone: user.phone };
}

/**
 * Throwing variant, for call sites where being blocked is a bug rather than an
 * expected skip.
 */
export async function assertCanSendWhatsApp(
  userId: string,
  category: WhatsAppMessageCategory
): Promise<string> {
  const decision = await canSendWhatsAppToUser(userId, category);

  if (!decision.allowed || !decision.phone) {
    throw new Error(
      `Refusing to send ${category} WhatsApp message to ${userId}: ${decision.reason}`
    );
  }

  return decision.phone;
}
