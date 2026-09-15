/**
 * Fast2SMS WhatsApp Order Notifications
 *
 * 3 approved templates:
 *   #1  shopka_order_confirmation  — {{1}} = name, {{2}} = order ID
 *   #2  payment_completed          — {{1}} = amount (e.g. "₹499.00")
 *   #3  delivery_confirmation_1    — {{1}} = name, {{2}} = order ID
 *
 * Required env vars (add to .env.local AND Vercel):
 *   FAST2SMS_API_KEY                      — same key used by OTP
 *   FAST2SMS_WA_PHONE_NUMBER_ID           — same phone_number_id used by OTP
 *   FAST2SMS_WA_ORDER_CONFIRM_MSG_ID      — message_id for shopka_order_confirmation  (32752)
 *   FAST2SMS_WA_PAYMENT_MSG_ID            — message_id for payment_completed           (31622)
 *   FAST2SMS_WA_DELIVERY_MSG_ID           — message_id for delivery_confirmation_1     (31858)
 */

const BASE = "https://www.fast2sms.com/dev/whatsapp";

function toMobile(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return digits.slice(-10);
}

async function sendSimple(
  mobile: string,
  messageId: string,
  variables: string[]
): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const phoneNumberId = process.env.FAST2SMS_WA_PHONE_NUMBER_ID;

  if (!apiKey || !phoneNumberId || !messageId) return;

  const params = new URLSearchParams({
    message_id: messageId,
    phone_number_id: phoneNumberId,
    numbers: mobile,
    variables_values: variables.join("|"),
  });

  const res = await fetch(`${BASE}?${params.toString()}`, {
    method: "GET",
    headers: { authorization: apiKey, "cache-control": "no-cache" },
  });

  const json = await res.json().catch(() => null);

  if (!res.ok || json?.return === false) {
    const msg = Array.isArray(json?.message)
      ? json.message[0]
      : (json?.message ?? "Unknown error");
    throw new Error(`Fast2SMS WA notification failed (${res.status}): ${msg}`);
  }
}

/** Template #1 — shopka_order_confirmation */
export async function sendOrderConfirmation(
  phone: string,
  name: string,
  invoiceNumber: string
): Promise<void> {
  const messageId = process.env.FAST2SMS_WA_ORDER_CONFIRM_MSG_ID;
  if (!messageId) return;
  await sendSimple(toMobile(phone), messageId, [name, invoiceNumber]);
}

/** Template #2 — payment_completed */
export async function sendPaymentConfirmation(
  phone: string,
  amount: string
): Promise<void> {
  const messageId = process.env.FAST2SMS_WA_PAYMENT_MSG_ID;
  if (!messageId) return;
  await sendSimple(toMobile(phone), messageId, [amount]);
}

/** Template #3 — delivery_confirmation_1 */
export async function sendDeliveryConfirmation(
  phone: string,
  name: string,
  invoiceNumber: string
): Promise<void> {
  const messageId = process.env.FAST2SMS_WA_DELIVERY_MSG_ID;
  if (!messageId) return;
  await sendSimple(toMobile(phone), messageId, [name, invoiceNumber]);
}
