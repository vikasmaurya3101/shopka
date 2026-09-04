import nodemailer, { type Transporter } from "nodemailer";

/**
 * Zoho Mail SMTP transport, used for transactional mail we send ourselves
 * (today: the new-order alert to the sales inbox).
 *
 * Zoho specifics that are easy to get wrong:
 *  - The data centre decides the host. An account created on zoho.in must use
 *    smtp.zoho.in; smtp.zoho.com will authenticate-fail with the same
 *    credentials. Hence SMTP_HOST is configurable rather than hard-coded.
 *  - SMTP_PASSWORD must be an application-specific password generated in Zoho
 *    (Settings -> Security -> App Passwords) whenever two-factor auth is on.
 *    Your normal mailbox password is rejected.
 *  - Zoho refuses to send when the From address isn't one the authenticated
 *    account actually owns, so SMTP_FROM defaults to SMTP_USER.
 */

/** Resolved once — reading and validating env on every send is wasted work. */
interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

let cachedTransporter: Transporter | null = null;

function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD;

  // Any one of these missing means SMTP simply isn't set up — a local dev
  // checkout must still work, so callers treat null as "skip sending".
  if (!host || !user || !password) return null;

  const port = Number(process.env.SMTP_PORT ?? 465);

  if (!Number.isInteger(port) || port <= 0) {
    console.error(`[mailer] SMTP_PORT is not a valid port: ${process.env.SMTP_PORT}`);
    return null;
  }

  return {
    host,
    port,
    user,
    password,
    from: process.env.SMTP_FROM?.trim() || user,
  };
}

/**
 * True when SMTP is configured. Lets callers skip mail entirely in dev instead
 * of logging a failure on every order.
 */
export function isMailerConfigured(): boolean {
  return readSmtpConfig() !== null;
}

/** The From header to send as, or null when SMTP isn't configured. */
export function getMailFrom(): string | null {
  return readSmtpConfig()?.from ?? null;
}

/**
 * Returns the shared transporter, or null when SMTP isn't configured.
 *
 * Left unpooled (nodemailer's default): on serverless the container freezes
 * between invocations, and a pooled socket usually comes back dead —
 * reconnecting per send is both simpler and more reliable at our volume. The
 * explicit timeouts matter for the same reason; without them a stalled TLS
 * handshake can hold the function open until the platform kills it.
 */
export function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const config = readSmtpConfig();

  if (!config) return null;

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    // 465 is implicit TLS; 587 starts plaintext and upgrades via STARTTLS.
    // Derived from the port so the two can't be set inconsistently.
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    auth: {
      user: config.user,
      pass: config.password,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return cachedTransporter;
}

/**
 * One-off credential check, for a health route or a manual script. Not called on
 * the order path — it costs a full extra connection per order and a working
 * `sendMail` already proves the same thing.
 */
export async function verifyMailer(): Promise<boolean> {
  const transporter = getTransporter();

  if (!transporter) return false;

  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error("[mailer] SMTP verification failed:", error);
    return false;
  }
}
