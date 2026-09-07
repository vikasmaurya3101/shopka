# WhatsApp OTP Setup — Fast2SMS WhatsApp Business API

Login sends OTPs via **Fast2SMS WhatsApp Business API** (Meta Cloud API wrapper).
Falls back to mock mode (console log) in dev when credentials are not set.

## 1. Get your Fast2SMS API Key
1. Login at https://www.fast2sms.com/dashboard
2. Go to **Dev API** → copy your **API Key**

## 2. Create & get an OTP template approved
1. In Fast2SMS dashboard → **WhatsApp Manager** → **Templates** → Create
2. Category: **Authentication** (no DLT needed, Meta-approved OTP category)
3. Body text example:
   ```
   {{1}} is your Shopka OTP. Valid for 5 minutes. Do not share it with anyone.
   ```
   (`{{1}}` is the variable where the OTP code goes)
4. Submit for Meta approval — Authentication templates are usually approved in minutes.

## 3. Get phone_number_id and message_id
Call this API once to get the IDs you need:
```
GET https://www.fast2sms.com/dev/dlt_manager/whatsapp?type=template
Header: authorization: <your FAST2SMS_API_KEY>
```
From the response, find your approved OTP template and copy:
- `phone_number_id` → `FAST2SMS_WA_PHONE_NUMBER_ID`
- `message_id`      → `FAST2SMS_WA_MESSAGE_ID`

## 4. Add to .env.local
```env
OTP_PROVIDER=whatsapp
FAST2SMS_API_KEY=<your Fast2SMS API key>
FAST2SMS_WA_PHONE_NUMBER_ID=<phone_number_id from step 3>
FAST2SMS_WA_MESSAGE_ID=<message_id from step 3>
```

## 5. Test
```bash
npm run dev
```
Go to `/login`, enter a real 10-digit number → you should receive a WhatsApp message
with the OTP within seconds.

## How it works in code
- `src/features/auth/providers/whatsapp.provider.ts` — calls Fast2SMS Simple Template API:
  `GET /dev/whatsapp?message_id=&phone_number_id=&numbers=&variables_values=<OTP>`
- `src/features/auth/services/otp.service.ts` — generates OTP, calls provider, stores hash in DB
- Rate limit: **max 3 OTP requests per 30 minutes** per number (server-enforced)
- UI resend cooldown: **60 seconds** between resend button presses

## Opt-out webhook (optional, for production)
To honour customers who reply STOP to your WhatsApp messages:
1. Set `WHATSAPP_WEBHOOK_TOKEN=<random secret>` in .env
2. In Fast2SMS dashboard → WhatsApp Webhooks → set URL to:
   `https://shopka.in/api/webhooks/whatsapp?token=<WHATSAPP_WEBHOOK_TOKEN>`

## API docs reference
- Send Template (Simple): https://docs.fast2sms.com/reference/sendwhatsappmessage
- Get Template details: https://docs.fast2sms.com/reference/get-waba-template-details
- Authentication templates: https://docs.fast2sms.com/reference/sendauthenticationtemplate
