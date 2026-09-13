import { BaseOtpProvider } from "./otp.provider";

/**
 * SMS OTP delivery via StartMessaging API.
 *
 * Sends OTP as an SMS to the user's mobile number.
 *
 * Setup (.env):
 *   STARTMESSAGING_API_KEY=<your StartMessaging API key>
 *   STARTMESSAGING_TEMPLATE_ID=<your approved OTP template ID>
 *
 * The template must include {otp} and {appName} variables.
 * Example: "Your Shopka OTP is {otp}. Valid for 5 minutes. Do not share."
 *
 * Docs: https://startmessaging.com
 */

const STARTMESSAGING_URL = "https://api.startmessaging.com/otp/send";
const APP_NAME = "Shopka";

export class SmsProvider extends BaseOtpProvider {
  isConfigured(): boolean {
    return Boolean(
      process.env.STARTMESSAGING_API_KEY &&
        process.env.STARTMESSAGING_TEMPLATE_ID
    );
  }

  async send(phone: string, otp: string): Promise<void> {
    const apiKey = process.env.STARTMESSAGING_API_KEY;
    const templateId = process.env.STARTMESSAGING_TEMPLATE_ID;

    if (!apiKey || !templateId) {
      throw new Error(
        "StartMessaging is not configured. Set STARTMESSAGING_API_KEY and " +
          "STARTMESSAGING_TEMPLATE_ID in .env."
      );
    }

    // Normalize to E.164 (+91XXXXXXXXXX)
    const digits = phone.replace(/\D/g, "");
    const normalized =
      digits.startsWith("91") && digits.length === 12
        ? `+${digits}`
        : `+91${digits.slice(-10)}`;

    const response = await fetch(STARTMESSAGING_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        phoneNumber: normalized,
        templateId,
        variables: { otp, appName: APP_NAME },
      }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || json?.success === false) {
      throw new Error(
        `StartMessaging OTP send failed (${response.status}): ${
          json?.message ?? "Unknown error"
        }`
      );
    }
  }
}

export const smsProvider = new SmsProvider();
