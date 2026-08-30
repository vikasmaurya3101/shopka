import { BaseOtpProvider } from "./otp.provider";

/**
 * WhatsApp OTP delivery via AiSensy (https://aisensy.com), a WhatsApp
 * Business Solution Provider built on Meta's Cloud API.
 *
 * Setup (see WHATSAPP_SETUP.md):
 * 1. Create an AiSensy account and get your WhatsApp Business number live.
 * 2. Create + get Meta approval for an "Authentication" category template
 *    with a single body variable for the code (e.g. "{{1}} is your Shopka
 *    verification code.").
 * 3. In AiSensy: Campaigns > +Launch > API Campaign, pick that template,
 *    name the campaign, and set it Live.
 * 4. Put your API key + that campaign name in .env:
 *      WHATSAPP_API_KEY=<AiSensy API key from Manage > API Key>
 *      WHATSAPP_CAMPAIGN_NAME=<the API campaign name from step 3>
 *
 * Docs: https://wiki.aisensy.com/en/articles/11501889-api-reference-docs
 */
const DEFAULT_AISENSY_URL = "https://backend.aisensy.com/campaign/t1/api/v2";

export class WhatsAppProvider extends BaseOtpProvider {
  isConfigured(): boolean {
    return Boolean(process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_CAMPAIGN_NAME);
  }

  async send(phone: string, otp: string): Promise<void> {
    const apiKey = process.env.WHATSAPP_API_KEY;
    const campaignName = process.env.WHATSAPP_CAMPAIGN_NAME;
    const apiUrl = process.env.WHATSAPP_API_URL || DEFAULT_AISENSY_URL;

    if (!apiKey || !campaignName) {
      throw new Error(
        "WhatsApp provider is not configured. Set WHATSAPP_API_KEY and " +
          "WHATSAPP_CAMPAIGN_NAME — see WHATSAPP_SETUP.md."
      );
    }

    const digits = phone.replace(/\D/g, "");
    const destination = digits.startsWith("91") ? `+${digits}` : `+91${digits}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        campaignName,
        destination,
        userName: destination,
        templateParams: [otp],
      }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || json?.success === false) {
      throw new Error(
        `WhatsApp OTP send failed (${response.status}): ${
          json?.message ?? (await response.text().catch(() => "Unknown error"))
        }`
      );
    }
  }
}

export const whatsappProvider = new WhatsAppProvider();
