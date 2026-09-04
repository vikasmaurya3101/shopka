// src/lib/mailer.ts  — Resend version (SMTP drop-in replacement)
// npm install resend

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export function isMailerConfigured(): boolean {
  return resend !== null;
}

export function getMailFrom(): string | null {
  if (!resend) return null;
  return process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || null;
}

// getTransporter() is only used in orderEmail.ts via sendMail —
// we replace that with resend.emails.send() below, so this stub
// keeps TypeScript happy if anything else imports it.
export function getTransporter() {
  return resend ? {} : null;
}

export async function verifyMailer(): Promise<boolean> {
  return resend !== null;
}

/**
 * Thin wrapper so orderEmail.ts needs zero changes.
 * Call this instead of transporter.sendMail().
 */
export async function sendMail({
  from,
  to,
  replyTo,
  subject,
  text,
  html,
}: {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  if (!resend) throw new Error("Resend not configured");

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: replyTo,
    subject,
    text,
    html,
  });

  if (error) throw error;
}