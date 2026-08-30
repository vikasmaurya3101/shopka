# Message Central (VerifyNow) — SMS OTP Fallback

`/login` now tries **WhatsApp first** (see `WHATSAPP_SETUP.md`) and falls
back to SMS automatically after 30 seconds, or immediately if WhatsApp
isn't configured. This doc covers that SMS fallback, via **Message Central
VerifyNow** — no DLT registration, no GST, and it comes with free credits.

(Firebase Phone Auth needs the Blaze billing plan for real SMS, which is
why this exists as an alternative — see the bottom of this file.)

Firebase Phone Auth code is still in the project (`src/lib/firebase.ts`,
`firebaseSendOtp` / `firebaseVerifyOtp` in `useAuth.ts`) — switching back
later is a small change, described at the bottom of this file.

## 1. Get your credentials
1. Log into https://console.messagecentral.com
2. Go to **Developer Guide** (left sidebar) or the **Account Information**
   section on the Home page
3. Copy your **Customer ID** and **Auth Token**

## 2. Add them to `.env`
```
OTP_PROVIDER=messagecentral
MESSAGECENTRAL_CUSTOMER_ID=<your customer id>
MESSAGECENTRAL_AUTH_TOKEN=<your auth token>
```

If that Auth Token ever expires, you have two options: grab a fresh one
from the dashboard again, or set `MESSAGECENTRAL_PASSWORD` (your Message
Central account password) instead — the code will then generate and cache
a fresh token automatically via their `/auth/v1/authentication/token` API,
so you don't have to babysit it:
```
MESSAGECENTRAL_PASSWORD=<your account password>
```
(Leave `MESSAGECENTRAL_AUTH_TOKEN` blank if you use this option — the code
prefers the static token when both are set.)

## 3. Restart and test
```
npm run dev
```
Go to `/login`, enter a real 10-digit number, click **Send OTP** — you
should get a real SMS. Enter the code to log in.

## How it works
Unlike the other providers in `src/features/auth/providers/`, Message
Central generates and checks the OTP on their own servers (that's the part
that's exempt from DLT — a branded/custom SMS with your own senderId would
need it, but their default system-generated OTP route doesn't). So:
- `sendOtp()` in `otp.service.ts` calls Message Central's `/verification/v3/send`
  (deliberately without `senderId` or a custom `message` — adding those
  shifts it toward their branded-SMS product, which does need DLT) and
  stores the `verificationId` they return (reusing the `otpHash` column on
  the `OtpVerification` table — it's just a string, no schema change needed)
- `verifyOtp()` calls their `/verification/v3/validateOtp` with that
  `verificationId` and the code the user typed, instead of comparing against
  a locally-hashed OTP

## Credits and going live
- New accounts start with free credits (₹10 in testing) — enough for
  dozens of OTPs while you finish launching
- Top up from the dashboard's **Credits** section when you're getting real
  signups; pricing is pay-as-you-go, no DLT paperwork for this OTP-specific
  route
- If you eventually want your own branded sender ID instead of a shared
  one, that's when DLT registration becomes relevant — not needed to launch

## Switching to Firebase Phone Auth later (once Blaze is enabled)
In `src/app/login/page.tsx`, swap the three functions pulled from
`useAuth()`:
```diff
- sendOtp,
- verifyOtp,
- completeProfile,
+ firebaseSendOtp,
+ firebaseVerifyOtp,
+ firebaseCompleteProfile,
```
And update the three handler functions to call the `firebase*` versions
(they were already written for this — see the comments left in
`useAuth.ts` and the git history / previous version of `login/page.tsx`).
Everything else — reCAPTCHA container, Firebase config — is already in
place from before.
