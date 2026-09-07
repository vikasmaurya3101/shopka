import { BaseOtpProvider } from "./otp.provider";

/**
 * WhatsApp OTP delivery via Fast2SMS WhatsApp Business API.
 *
 * Fast2SMS uses Meta's Cloud API underneath. They have two ways to send
 * a template — "Simple" (GET with query params) and "META Format" (POST
 * with Meta-style JSON). We use the Simple GET because it needs only a
 * message_id + phone_number_id, both fetched once from the dashboard.
 *
 * Endpoint:
 *   GET https://www.fast2sms.com/dev/whatsapp
 *   Header: authorization: <FAST2SMS_API_KEY>
 *   Params: message_id, phone_number_id, numbers, variables_values
 *
 * Setup (.env):
 *   FAST2SMS_API_KEY=<your Fast2SMS API key>
 *   FAST2SMS_WA_PHONE_NUMBER_ID=<phone_number_id from Fast2SMS dashboard>
 *   FAST2SMS_WA_MESSAGE_ID=<message_id of your OTP template>
 *
 * How to get message_id & phone_number_id:
 *   GET https://www.fast2sms.com/dev/dlt_manager/whatsapp?type=template
 *   Header: authorization: <FAST2SMS_API_KEY>
 *   Find your approved OTP template and note: message_id, phone_number_id
 *
 * The OTP template must have one variable {{1}} in the body.
 * Example: "{{1}} is your Shopka OTP. Valid for 5 minutes. Do not share."
 *
 * Docs: https://docs.fast2sms.com/reference/sendwhatsappmessage
 */

const FAST2SMS_WA_URL = "https://www.fast2sms.com/dev/whatsapp";

export class WhatsAppProvider extends BaseOtpProvider {
  isConfigured(): boolean {
    return Boolean(
      process.env.FAST2SMS_API_KEY &&
      process.env.FAST2SMS_WA_PHONE_NUMBER_ID &&
      process.env.FAST2SMS_WA_MESSAGE_ID
    );
  }

  async send(phone: string, otp: string): Promise<void> {
    const apiKey = process.env.FAST2SMS_API_KEY;
    const phoneNumberId = process.env.FAST2SMS_WA_PHONE_NUMBER_ID;
    const messageId = process.env.FAST2SMS_WA_MESSAGE_ID;

    if (!apiKey || !phoneNumberId || !messageId) {
      throw new Error(
        "Fast2SMS WhatsApp is not configured. Set FAST2SMS_API_KEY, " +
        "FAST2SMS_WA_PHONE_NUMBER_ID, and FAST2SMS_WA_MESSAGE_ID in .env."
      );
    }

    // Fast2SMS accepts 10-digit numbers only (no country code)
    const digits = phone.replace(/\D/g, "");
    const mobile = digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.slice(-10);

    const params = new URLSearchParams({
      message_id: messageId,
      phone_number_id: phoneNumberId,
      numbers: mobile,
      variables_values: otp, // fills {{1}} in the template body
    });

    const response = await fetch(`${FAST2SMS_WA_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        authorization: apiKey,
        "cache-control": "no-cache",
      },
    });

    const json = await response.json().catch(() => null);

    // Fast2SMS returns { return: true } on success
    if (!response.ok || json?.return === false) {
      throw new Error(
        `Fast2SMS WhatsApp OTP send failed (${response.status}): ${
          Array.isArray(json?.message)
            ? json.message[0]
            : (json?.message ?? "Unknown error")
        }`
      );
    }
  }
}

export const whatsappProvider = new WhatsAppProvider();
