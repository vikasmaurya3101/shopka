/**
 * Message Central "VerifyNow" OTP provider.
 *
 * Unlike the other providers in this folder (which send a message
 * containing an OTP *we* generated), Message Central generates and
 * validates the OTP on their end via a two-step verification API. This
 * is the specific product of theirs that's exempt from India's DLT
 * registration requirement — a plain custom/branded SMS send would still
 * need it (that one requires a senderId + DLT template/entity).
 *
 * Docs: MessageNow / VerifyNow SMS API (Message Central dashboard).
 * See MESSAGECENTRAL_SETUP.md for how to get credentials.
 */

const BASE_URL = "https://cpaas.messagecentral.com";

let cachedToken: { value: string; fetchedAt: number } | null = null;
const TOKEN_TTL_MS = 1000 * 60 * 60 * 6; // refresh every 6h to be safe

/**
 * Returns a usable authToken. If MESSAGECENTRAL_AUTH_TOKEN is set (the
 * ready-made token from the dashboard's Developer Guide), that's used
 * directly. Otherwise, if MESSAGECENTRAL_CUSTOMER_ID + _PASSWORD are set,
 * a fresh token is generated (and cached) via Message Central's token API
 * — this is the officially documented fallback for when the dashboard
 * token expires.
 */
async function getAuthToken(): Promise<string> {
  const staticToken = process.env.MESSAGECENTRAL_AUTH_TOKEN;
  if (staticToken) return staticToken;

  const customerId = process.env.MESSAGECENTRAL_CUSTOMER_ID;
  const password = process.env.MESSAGECENTRAL_PASSWORD;

  if (!customerId || !password) {
    throw new Error(
      "Message Central isn't configured. Set MESSAGECENTRAL_AUTH_TOKEN " +
        "(from the dashboard), or MESSAGECENTRAL_CUSTOMER_ID + " +
        "MESSAGECENTRAL_PASSWORD so a token can be generated automatically " +
        "— see MESSAGECENTRAL_SETUP.md."
    );
  }

  if (cachedToken && Date.now() - cachedToken.fetchedAt < TOKEN_TTL_MS) {
    return cachedToken.value;
  }

  const key = Buffer.from(password, "utf-8").toString("base64");

  const url =
    `${BASE_URL}/auth/v1/authentication/token` +
    `?customerId=${encodeURIComponent(customerId)}` +
    `&key=${encodeURIComponent(key)}&scope=NEW&country=91`;

  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "*/*" },
  });

  const json = await response.json().catch(() => null);
  const token = json?.token ?? json?.data?.token;

  if (!response.ok || !token) {
    throw new Error(
      `Message Central token generation failed (${response.status}): ` +
        (json?.message ?? "Unknown error")
    );
  }

  cachedToken = { value: token, fetchedAt: Date.now() };
  return token;
}

function getCustomerId(): string {
  const customerId = process.env.MESSAGECENTRAL_CUSTOMER_ID;

  if (!customerId) {
    throw new Error(
      "MESSAGECENTRAL_CUSTOMER_ID isn't set — see MESSAGECENTRAL_SETUP.md."
    );
  }

  return customerId;
}

export const messageCentralProvider = {
  isConfigured(): boolean {
    return Boolean(
      process.env.MESSAGECENTRAL_AUTH_TOKEN ||
        (process.env.MESSAGECENTRAL_CUSTOMER_ID && process.env.MESSAGECENTRAL_PASSWORD)
    );
  },

  /**
   * Asks Message Central to generate and send an OTP to the given
   * 10-digit Indian mobile number. Returns their verificationId, which
   * must be passed back into verifyOtp() to check the code later.
   *
   * Deliberately omits senderId/message/messageType — leaving those out
   * keeps this on their default system-generated OTP route, which is the
   * one that doesn't require DLT registration. Adding a custom senderId
   * or message shifts it toward their branded-SMS product, which does.
   */
  async sendOtp(phone: string): Promise<string> {
    const authToken = await getAuthToken();
    const customerId = getCustomerId();

    const url =
      `${BASE_URL}/verification/v3/send` +
      `?countryCode=91&customerId=${encodeURIComponent(customerId)}` +
      `&flowType=SMS&type=OTP&mobileNumber=${encodeURIComponent(phone)}` +
      `&otpLength=6`;

    const response = await fetch(url, {
      method: "POST",
      headers: { authToken },
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json?.data?.verificationId) {
      throw new Error(
        `Message Central OTP send failed (${response.status}): ` +
          (json?.message ?? json?.data?.errorMessage ?? "Unknown error")
      );
    }

    return String(json.data.verificationId);
  },

  /**
   * Validates the code the user typed against the verificationId
   * returned by sendOtp().
   */
  async verifyOtp(verificationId: string, code: string): Promise<boolean> {
    const authToken = await getAuthToken();

    const url =
      `${BASE_URL}/verification/v3/validateOtp` +
      `?verificationId=${encodeURIComponent(verificationId)}` +
      `&code=${encodeURIComponent(code)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { authToken },
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        `Message Central OTP verification failed (${response.status}): ` +
          (json?.message ?? "Unknown error")
      );
    }

    // Message Central returns data.verificationStatus === "VERIFICATION_COMPLETED" on success
    return json?.data?.verificationStatus === "VERIFICATION_COMPLETED";
  },
};
