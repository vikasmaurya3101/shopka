/**
 * Fast2SMS WhatsApp Order Notifications
 * Same API pattern as WhatsAppProvider (OTP) — jo OTP bhejta hai wahi kaam karta hai.
 *
 * Env vars needed (Vercel + .env.local):
 *   FAST2SMS_API_KEY                      — same as OTP
 *   FAST2SMS_WA_PHONE_NUMBER_ID           — same as OTP
 *   FAST2SMS_WA_ORDER_CONFIRM_MSG_ID      — 32752
 *   FAST2SMS_WA_PAYMENT_MSG_ID            — 31622
 *   FAST2SMS_WA_DELIVERY_MSG_ID           — 31858
 */

const FAST2SMS_WA_URL = "https://www.fast2sms.com/dev/whatsapp";

function toMobile(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits.slice(-10);
}

async function sendTemplate(
  phone: string,
  messageId: string,
  variables: string[]
): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const phoneNumberId = process.env.FAST2SMS_WA_PHONE_NUMBER_ID;

  if (!apiKey || !phoneNumberId || !messageId) {
    console.warn("[WA] Missing env vars — skipping notification");
    return;
  }

  const params = new URLSearchParams({
    message_id: messageId,
    phone_number_id: phoneNumberId,
    numbers: toMobile(phone),
    variables_values: variables.join("|"),
  });

  console.log(`[WA] Sending to ${toMobile(phone)}, message_id=${messageId}`);

  const res = await fetch(`${FAST2SMS_WA_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      authorization: apiKey,
      "cache-control": "no-cache",
    },
  });

  const json = await res.json().catch(() => null);
  console.log("[WA] Response:", JSON.stringify(json));

  if (!res.ok || json?.return === false) {
    const msg = Array.isArray(json?.message)
      ? json.message[0]
      : (json?.message ?? "Unknown error");
    throw new Error(`Fast2SMS WA failed (${res.status}): ${msg}`);
  }
}

/** Template #1 — shopka_order_confirmation: "Hi {{1}}, order {{2}} ready..." */
export async function sendOrderConfirmation(
  phone: string,
  name: string,
  invoiceNumber: string
): Promise<void> {
  const messageId = process.env.FAST2SMS_WA_ORDER_CONFIRM_MSG_ID ?? "";
  await sendTemplate(phone, messageId, [name, invoiceNumber]);
}

/** Template #2 — payment_completed: "amount: {{1}}" */
export async function sendPaymentConfirmation(
  phone: string,
  amount: string
): Promise<void> {
  const messageId = process.env.FAST2SMS_WA_PAYMENT_MSG_ID ?? "";
  await sendTemplate(phone, messageId, [amount]);
}

/** Template #3 — delivery_confirmation_1: "Hi {{1}}, order {{2}} delivered..." */
export async function sendDeliveryConfirmation(
  phone: string,
  name: string,
  invoiceNumber: string
): Promise<void> {
  const messageId = process.env.FAST2SMS_WA_DELIVERY_MSG_ID ?? "";
  await sendTemplate(phone, messageId, [name, invoiceNumber]);
}
