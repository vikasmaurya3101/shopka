# Order Alert Emails — Zoho Mail SMTP Setup

Every new order sends an HTML alert to the sales inbox via **Nodemailer over
Zoho Mail SMTP**. No third-party email API is involved.

## 1. Environment variables

```
SMTP_HOST=smtp.zoho.in
SMTP_PORT=465
SMTP_USER=sales@shopka.in
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM=sales@shopka.in
ORDER_NOTIFICATION_EMAIL=sales@shopka.in
```

| Variable | Required | Notes |
|---|---|---|
| `SMTP_HOST` | yes | **Must match your Zoho data centre.** India `smtp.zoho.in`, US `smtp.zoho.com`, EU `smtp.zoho.eu`, Australia `smtp.zoho.com.au`. The wrong one fails authentication with otherwise-correct credentials. |
| `SMTP_PORT` | no | Defaults to `465` (implicit TLS). `587` also works and switches to STARTTLS automatically. |
| `SMTP_USER` | yes | The full mailbox address. |
| `SMTP_PASSWORD` | yes | An **app-specific password**, not your mailbox password — see below. |
| `SMTP_FROM` | no | Defaults to `SMTP_USER`. Must be an address the account owns or Zoho rejects the message. |
| `ORDER_NOTIFICATION_EMAIL` | yes | Where alerts are delivered. |

With `SMTP_HOST`, `SMTP_USER` or `SMTP_PASSWORD` missing, mail is skipped with a
console warning and **orders still complete normally** — so a local checkout
needs none of this.

## 2. Generate an app-specific password

Zoho rejects your normal mailbox password over SMTP whenever two-factor auth is
enabled.

1. Sign in at https://accounts.zoho.in (or `.com` for a US account).
2. **Settings → Security → App Passwords → Generate New Password**.
3. Name it something like `shopka-smtp`, copy the generated value into
   `SMTP_PASSWORD`. It is shown once.

## 3. Plan requirement — check this before debugging credentials

Zoho's Forever Free plan lists **"IMAP/POP/Active Sync not included"**. SMTP is
not named explicitly in that exclusion, and reports differ on whether free
mailboxes can send at all. If authentication fails with credentials you're
confident are correct, the mailbox likely needs **Mail Lite or above** rather
than a different password.

Verify before assuming a code problem: Zoho Mail → **Settings → Mail Accounts →
IMAP/SMTP**. If the SMTP section is absent or disabled, the plan is the blocker.

## 4. Test it

```bash
npm run dev
```

Place an order end to end. On success `sales@shopka.in` receives
`New order SHK-YYYY-NNNNNN — ₹x,xxx.xx (COD|Prepaid)`.

Failures never surface to the customer — check the server console for
`[orderEmail]` or `[mailer]` lines:

- `SMTP not configured — skipping alert` — one of the three required vars is unset.
- `ORDER_NOTIFICATION_EMAIL not set — skipping alert` — no recipient.
- `failed to send alert for …` followed by a Zoho error — credentials, host or plan.
  `EAUTH` points at the password or the plan; `ECONNECTION`/`ETIMEDOUT` at the host or port.

## 5. Production

Set the same six variables in your host's environment settings (Vercel →
Project → Settings → Environment Variables). `SMTP_PASSWORD` is a secret; it
must never be prefixed `NEXT_PUBLIC_`.

## How it's wired into the code

- `src/lib/mailer.ts` — the Zoho transporter. Reads and validates env, caches one
  instance, and returns `null` when unconfigured. Left unpooled deliberately: on
  serverless the container freezes between invocations and a pooled socket
  usually comes back dead.
- `src/lib/orderEmail.ts` — `sendOrderNotification()` builds the HTML and
  plain-text parts and sends them. **Returns `false` on every failure path and
  never throws**, so no caller can turn a mail problem into a failed order.
- `src/features/checkout/service/checkout.service.ts` — calls it *after*
  `prisma.$transaction` commits, un-awaited. Inside the transaction an SMTP stall
  would hold a database connection open; awaited, it would delay the customer's
  confirmation.

## Notes

- The alert's `Reply-To` is the customer's email when we have one, so the team
  can reply to them directly from the alert.
- Every interpolated value is HTML-escaped — product names and address landmarks
  are customer-supplied and would otherwise be an injection vector in webmail.
- Timestamps render in IST regardless of server timezone.
- Paying for a previously-placed COD order via `/api/orders/[id]/pay-now` does
  **not** send a second alert; only order placement does.
