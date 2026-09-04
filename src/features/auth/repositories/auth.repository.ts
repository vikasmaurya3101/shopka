import { OtpChannel, OtpPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class AuthRepository {
  // ============================
  // OTP
  // ============================

  async clearPendingOtp(
    phone: string,
    purpose: OtpPurpose
  ) {
    return prisma.otpVerification.deleteMany({
      where: {
        phone,
        purpose,
        isVerified: false,
      },
    });
  }

  async createOtp(data: {
    phone: string;
    otpHash: string;
    purpose: OtpPurpose;
    channel: OtpChannel;
    provider: string;
    expiresAt: Date;
  }) {
    return prisma.otpVerification.create({
      data: {
        phone: data.phone,
        otpHash: data.otpHash,
        purpose: data.purpose,
        channel: data.channel,
        provider: data.provider,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findLatestOtp(
    phone: string,
    purpose: OtpPurpose
  ) {
    return prisma.otpVerification.findFirst({
      where: {
        phone,
        purpose,
        isVerified: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async increaseAttempts(id: string) {
    return prisma.otpVerification.update({
      where: {
        id,
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  }

  async markVerified(id: string) {
    return prisma.otpVerification.update({
      where: {
        id,
      },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
  }

  /**
   * Finds a recently *verified* OTP for this phone — the proof that whoever is
   * calling actually received a code on that number.
   *
   * Endpoints that mint an account or attach a phone MUST call this before
   * trusting a `phone` from the request body. Without it, `verify-otp` can
   * simply be skipped, because nothing else in the request proves ownership.
   */
  async findVerifiedOtp(
    phone: string,
    purpose: OtpPurpose,
    maxAgeMs: number
  ) {
    return prisma.otpVerification.findFirst({
      where: {
        phone,
        purpose,
        isVerified: true,
        verifiedAt: { gte: new Date(Date.now() - maxAgeMs) },
      },
      orderBy: { verifiedAt: "desc" },
    });
  }

  /**
   * Burns a verified OTP so a single code can't be replayed into two accounts.
   * Callers should invoke this immediately after the privileged action succeeds.
   */
  async consumeOtp(id: string) {
    return prisma.otpVerification.deleteMany({ where: { id } });
  }

  /**
   * Deletes OTP rows past their usefulness — verification codes and the phone
   * numbers attached to them are not kept once they can no longer be used.
   * Called opportunistically on each send so no cron job is required.
   *
   * Filters on `expiresAt` rather than `createdAt` because only the former is
   * indexed; they differ by a fixed OTP lifetime, so the effect is the same.
   */
  async purgeStaleOtps(olderThanMs: number) {
    return prisma.otpVerification.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - olderThanMs) } },
    });
  }

  // ============================
  // OTP RATE LIMITING
  // ============================

  /**
   * Records that a code was requested. Written before the message goes out, so
   * a provider that hangs or errors still counts against the limit — otherwise
   * a failing channel would hand out unlimited retries.
   */
  async logOtpRequest(phone: string, ip: string | null) {
    return prisma.otpRequestLog.create({ data: { phone, ip } });
  }

  async countOtpRequestsByPhone(phone: string, windowMs: number) {
    return prisma.otpRequestLog.count({
      where: { phone, createdAt: { gte: new Date(Date.now() - windowMs) } },
    });
  }

  async countOtpRequestsByIp(ip: string, windowMs: number) {
    return prisma.otpRequestLog.count({
      where: { ip, createdAt: { gte: new Date(Date.now() - windowMs) } },
    });
  }

  /** Drops request logs older than the widest window any limit uses. */
  async purgeOtpRequestLogs(olderThanMs: number) {
    return prisma.otpRequestLog.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - olderThanMs) } },
    });
  }

  // ============================
  // USER
  // ============================

  async findUser(phone: string) {
    return prisma.user.findUnique({
      where: {
        phone,
      },
    });
  }

  async findUserById(id: string) {
    return prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async attachPhone(userId: string, phone: string) {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        phone,
        phoneVerified: true,
      },
    });
  }

  async createUser(data: {
    phone: string;
    firstName: string;
    lastName?: string;
    email?: string;
    whatsappConsent?: boolean;
  }) {
    const consented = data.whatsappConsent === true;

    return prisma.user.create({
      data: {
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName ?? null,
        email: data.email && data.email.trim() ? data.email.trim() : null,
        phoneVerified: true,
        // Opt-in is explicit and optional, so an absent/false flag stays false
        // and leaves the timestamp null rather than recording a consent event.
        whatsappConsent: consented,
        whatsappConsentAt: consented ? new Date() : null,
      },
    });
  }

  /**
   * Records an explicit WhatsApp opt-in or opt-out. Granting stamps the moment
   * consent was given; withdrawing clears it and stamps `whatsappOptOutAt`, so
   * we can evidence that the opt-out was honoured even if the user later opts
   * back in — which `whatsappConsentAt` alone cannot show.
   */
  async setWhatsappConsent(userId: string, consent: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        whatsappConsent: consent,
        whatsappConsentAt: consent ? new Date() : null,
        ...(consent ? {} : { whatsappOptOutAt: new Date() }),
      },
      // The SessionUser fields, because the route hands this straight back for
      // the browser to put into the session. The consent audit timestamps are
      // deliberately not selected — they are evidence we keep, not data the
      // client needs.
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phoneVerified: true,
        whatsappConsent: true,
      },
    });
  }

  /**
   * Honours an inbound "STOP" (or equivalent) arriving on the WhatsApp webhook,
   * where all we have is the sender's number. Returns null when the number
   * isn't a registered user — there is then nothing of ours to unsubscribe.
   */
  async recordWhatsappOptOutByPhone(phone: string) {
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (!user) return null;

    return prisma.user.update({
      where: { id: user.id },
      data: {
        whatsappConsent: false,
        whatsappConsentAt: null,
        whatsappOptOutAt: new Date(),
      },
      select: { id: true, whatsappOptOutAt: true },
    });
  }

  /** Consent state for the send-time gate in `src/lib/whatsapp/consent.ts`. */
  async findWhatsappConsentState(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        whatsappConsent: true,
        whatsappConsentAt: true,
        whatsappOptOutAt: true,
      },
    });
  }

  async updateProfile(
    userId: string,
    firstName: string,
    lastName?: string,
    email?: string
  ) {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        firstName,
        lastName: lastName ?? null,
        ...(email !== undefined
          ? { email: email.trim() ? email.trim() : null }
          : {}),
      },
    });
  }

  async verifyPhone(userId: string) {
    return prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        phoneVerified: true,
      },
    });
  }
}

export const authRepository = new AuthRepository();