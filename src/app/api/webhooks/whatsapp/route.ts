import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { authRepository } from "@/features/auth/repositories/auth.repository";

/**
 * Inbound WhatsApp webhook — the opt-out path.
 *
 * The WhatsApp Business Messaging Policy requires a business to honour a user's
 * request to stop receiving messages, and our Terms and Privacy Policy both
 * promise that replying "STOP" works. Without this route that promise was
 * unenforceable: nothing was listening to inbound messages at all.
 *
 * Point your BSP at `POST /api/webhooks/whatsapp`:
 *  - AiSensy: Manage > Integrations (or Settings > Webhook) > set the URL to
 *    `https://shopka.in/api/webhooks/whatsapp?token=<WHATSAPP_WEBHOOK_TOKEN>`.
 *  - Meta Cloud API direct: use the same URL, set `WHATSAPP_WEBHOOK_TOKEN` as
 *    the Verify Token and subscribe to the `messages` field. GET below answers
 *    the hub challenge; set `WHATSAPP_APP_SECRET` to also check the payload
 *    signature.
 *
 * Always replies 200, even for junk: a BSP that gets an error retries, and
 * retries on an unparseable payload are pure noise.
 */

/** Words a user might send to unsubscribe. Matched on the whole message. */
const STOP_WORDS = new Set([
  "stop",
  "unsubscribe",
  "unsub",
  "opt out",
  "optout",
  "opt-out",
  "cancel",
  "quit",
  "band karo",
  "bandh karo",
  "stop messages",
]);

interface InboundMessage {
  phone: string;
  text: string;
}

/**
 * Reduces the last 10 digits to the format `User.phone` is stored in (a bare
 * 10-digit Indian number, per `sendOtpSchema`), so an inbound `+919812345678`
 * or `919812345678` both match the stored `9812345678`.
 */
function toLocalPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  if (digits.length < 10) return null;

  return digits.slice(-10);
}

function isStopRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/[.!]+$/, "");

  return STOP_WORDS.has(normalized);
}

/**
 * Pulls (phone, text) pairs out of whichever envelope arrived. Meta's Cloud API
 * shape and AiSensy's flatter shape are both handled, because AiSensy's payload
 * format is not contractually stable and a missed opt-out is a policy breach.
 */
function extractMessages(payload: unknown): InboundMessage[] {
  const out: InboundMessage[] = [];

  const push = (phone: unknown, text: unknown) => {
    if (typeof phone !== "string" || typeof text !== "string") return;

    const local = toLocalPhone(phone);
    if (!local) return;

    out.push({ phone: local, text });
  };

  const visit = (node: unknown, depth: number) => {
    if (depth > 8 || node === null || typeof node !== "object") return;

    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }

    const obj = node as Record<string, unknown>;

    // Meta Cloud API: { from, type: "text", text: { body } }
    const from = obj.from ?? obj.waId ?? obj.wa_id ?? obj.mobile ?? obj.phone;
    const textNode = obj.text;
    const body =
      typeof textNode === "string"
        ? textNode
        : typeof textNode === "object" && textNode !== null
          ? (textNode as Record<string, unknown>).body
          : undefined;

    if (from !== undefined) {
      push(from, body ?? obj.body ?? obj.messageText ?? obj.message);
    }

    for (const value of Object.values(obj)) visit(value, depth + 1);
  };

  visit(payload, 0);

  return out;
}

/**
 * Rejects a request only when a secret is actually configured. If none is set we
 * still process it: the sole effect of this route is unsubscribing someone, and
 * silently ignoring a genuine opt-out is the bigger failure.
 */
function isAuthorized(request: NextRequest, rawBody: string): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const signature = request.headers.get("x-hub-signature-256");

  if (appSecret && signature) {
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  const token = process.env.WHATSAPP_WEBHOOK_TOKEN;

  if (!token) {
    console.warn(
      "WhatsApp webhook received with no WHATSAPP_WEBHOOK_TOKEN configured — " +
        "processing anyway, but set one so only your BSP can call this."
    );
    return true;
  }

  const provided =
    request.nextUrl.searchParams.get("token") ??
    request.headers.get("x-webhook-token");

  return provided === token;
}

/** Meta's subscription handshake. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const token = process.env.WHATSAPP_WEBHOOK_TOKEN;

  if (
    params.get("hub.mode") === "subscribe" &&
    token &&
    params.get("hub.verify_token") === token
  ) {
    return new NextResponse(params.get("hub.challenge") ?? "", { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!isAuthorized(request, rawBody)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 }
    );
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: true, handled: 0 });
  }

  const messages = extractMessages(payload);
  const optedOut = new Set<string>();

  for (const message of messages) {
    if (!isStopRequest(message.text)) continue;
    if (optedOut.has(message.phone)) continue;

    optedOut.add(message.phone);

    try {
      const user = await authRepository.recordWhatsappOptOutByPhone(
        message.phone
      );

      // Logged either way: in an opt-in dispute the evidence that we received
      // and acted on a STOP is the point of this route.
      console.info(
        user
          ? `WhatsApp opt-out honoured for user ${user.id}.`
          : "WhatsApp opt-out received from a number with no account; nothing to unsubscribe."
      );
    } catch (error) {
      console.error("Failed to record WhatsApp opt-out:", error);
    }
  }

  return NextResponse.json({ success: true, handled: optedOut.size });
}
