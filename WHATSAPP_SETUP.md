# WhatsApp OTP Setup (AiSensy) — Primary Login Channel

Login now tries **WhatsApp first**, and automatically falls back to SMS via
Message Central (see `MESSAGECENTRAL_SETUP.md`) after 30 seconds, or
immediately if WhatsApp isn't configured/fails. This doc covers the WhatsApp
side, via **AiSensy** (a WhatsApp Business Solution Provider on top of
Meta's Cloud API).

## Why AiSensy
Chosen over Interakt/WATI for the lowest entry price, self-serve setup, and
a simple REST API — no CRM/Shopify features needed here, just OTP delivery.
If you'd rather use Interakt or WATI instead, only
`src/features/auth/providers/whatsapp.provider.ts` needs to change — the
rest of the app just calls `whatsappProvider.send(phone, otp)`.

## 1. Create an AiSensy account + get WhatsApp Business API live
1. Sign up at https://aisensy.com and follow their onboarding to connect a
   WhatsApp Business number (this goes through Meta's standard business
   verification — can take a few days the first time).

## 2. Create and get approval for an OTP template
1. In AiSensy: **Templates → Create Template**.
2. Category: **Authentication** (Meta's purpose-built OTP category — faster
   approval, and required for OTP-style use, as marketing/utility templates
   aren't meant for codes).
3. Body: a single variable for the code, e.g.
   `{{1}} is your Shopka verification code. Valid for 5 minutes.`
4. Submit for Meta's approval (usually fast for Authentication templates,
   often within minutes to a few hours).

## 3. Create the API Campaign
1. In AiSensy: **Campaigns → +Launch → API Campaign**.
2. Name it (e.g. `login-otp`), pick the approved template from step 2, and
   set it **Live**.

## 4. Add credentials to `.env`
```
WHATSAPP_API_KEY=<AiSensy API key, from Manage > API Key>
WHATSAPP_CAMPAIGN_NAME=<the API Campaign name from step 3, e.g. login-otp>
```
`WHATSAPP_API_URL` is optional — it defaults to AiSensy's endpoint
(`https://backend.aisensy.com/campaign/t1/api/v2`). Only set it if you
switch providers without rewriting the provider file.

## 5. Test it
```bash
npm run dev
```
Go to `/login`, enter a real number, and continue — you should get a
WhatsApp message with the code within a few seconds. If WhatsApp isn't
configured yet (or the send fails), the app transparently sends the code
by SMS instead via Message Central, so login keeps working either way.

## How it works in code
- `src/features/auth/providers/whatsapp.provider.ts` — calls AiSensy's
  Campaign API with the OTP as the template's body variable.
- `src/features/auth/services/otp.service.ts` — `sendOtp(phone, purpose,
  channel)`: tries WhatsApp when `channel` is `"whatsapp"` (the default);
  on failure/not-configured, falls through to Message Central (or a
  generic SMS provider if that's not configured either) in the same call.
  Records which provider actually delivered the code (`OtpVerification.
  provider`) so `verifyOtp()` checks it the right way regardless of which
  channel ends up being used.
- `src/app/login/page.tsx` — starts a 30s countdown after a WhatsApp send;
  auto-triggers the SMS fallback (`sendOtp(phone, "sms")`) if the user
  hasn't verified by then, and exposes the same action as a "Send on SMS
  instead" / "Resend" control.

## Migrating the database
This adds one column (`OtpVerification.provider`, defaults to `"mock"`,
non-breaking). Run once your `DATABASE_URL`/`DIRECT_URL` point at the
target database:
```bash
npx prisma migrate dev --name add_otp_provider   # local
npx prisma migrate deploy                        # production/CI
```
