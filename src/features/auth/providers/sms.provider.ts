import { BaseOtpProvider } from "./otp.provider";

/**
 * Generic SMS API OTP provider, used as a fallback when WhatsApp
 * delivery fails or isn't configured. Configure SMS_API_URL /
 * SMS_API_KEY in .env for your vendor (e.g. MSG91, Twilio, Fast2SMS).
 * Adjust the request body below to match your provider's payload shape.
 */
export class SmsProvider extends BaseOtpProvider {
  isConfigured(): boolean {
    return Boolean(process.env.SMS_API_URL && process.env.SMS_API_KEY);
  }

  async send(phone: string, otp: string): Promise<void> {
    const apiUrl = process.env.SMS_API_URL;
    const apiKey = process.env.SMS_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error("SMS provider is not configured.");
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: phone,
        message: `Your Shopka OTP is ${otp}. It expires in 5 minutes.`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `SMS OTP send failed (${response.status}): ${errorText}`
      );
    }
  }
}

export const smsProvider = new SmsProvider();
