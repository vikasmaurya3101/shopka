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
   * consent was given; withdrawing clears it, so the column never claims a
   * consent that is no longer held.
   */
  async setWhatsappConsent(userId: string, consent: boolean) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        whatsappConsent: consent,
        whatsappConsentAt: consent ? new Date() : null,
      },
      select: { id: true, whatsappConsent: true, whatsappConsentAt: true },
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