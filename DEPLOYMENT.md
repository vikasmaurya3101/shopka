# Deploying Shopka

This is a full-stack Next.js app (App Router) with a Postgres database via
Prisma — not a static frontend, so it needs a Node host, not just a CDN.
**Vercel is the fastest path today.**

## 1. Push the code to GitHub
```bash
cd shopka
git init
git add .
git commit -m "Shopka — Firebase auth, saved addresses, Razorpay, new logo"
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```

## 2. Import into Vercel
1. https://vercel.com/new → import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. Before the first deploy, add every environment variable from `.env`
   (Project → Settings → Environment Variables) — see the checklist below.
4. Deploy.

## 3. Environment variable checklist
| Variable | Where to get it |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Your Postgres provider (Supabase/Neon/Railway) |
| `NEXTAUTH_URL` | Your production URL, e.g. `https://shopka.vercel.app` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` (signs the session JWT — historical name, not related to NextAuth) |
| `WHATSAPP_API_KEY` / `WHATSAPP_CAMPAIGN_NAME` | AiSensy Dashboard (primary OTP channel) — see `WHATSAPP_SETUP.md` |
| `MESSAGECENTRAL_*` | Message Central Dashboard (SMS fallback) — see `MESSAGECENTRAL_SETUP.md` |
| `NEXT_PUBLIC_FIREBASE_*` (6 vars) | Firebase Console — see `FIREBASE_SETUP.md` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Console — see `FIREBASE_SETUP.md` |
| `RAZORPAY_KEY_ID` / `_KEY_SECRET` | Razorpay Dashboard — see `RAZORPAY_SETUP.md` |
| `CLOUDINARY_*` | Cloudinary Dashboard (product image uploads) |

## 4. Database migrations
Run once against your production database (locally, pointed at prod, or via
a Vercel deploy hook):
```bash
npx prisma migrate deploy
```

## 5. Firebase authorized domain
Add your live Vercel domain to **Firebase Console → Authentication →
Settings → Authorized domains**, or phone login will fail in production
(it works fine on `localhost` already).

## 6. Smoke test after deploy
- [ ] Home page loads with product data
- [ ] `/login` → phone OTP → real SMS arrives → account created
- [ ] `/profile/addresses` → add / edit / delete / set default
- [ ] `/checkout` → Cash on Delivery order places successfully
- [ ] `/checkout` → Pay Online → Razorpay test payment completes → order
      shows as `PAID`

## What changed today (quick summary)
- **Branding:** your logo is now the favicon, app icon, PWA manifest icon,
  Open Graph share image, and the navbar/login mark (`src/components/shared/Logo.tsx`).
- **Firebase Phone Auth:** real SMS OTP login, wired into the existing
  `/login` screen (see `FIREBASE_SETUP.md`).
- **Saved Addresses:** the "Saved Addresses" card on `/profile` now opens a
  full address book at `/profile/addresses` — add, edit, delete, set
  default, with animated transitions.
- **Razorpay:** a "Pay Online" option at checkout, with server-side payment
  signature verification (see `RAZORPAY_SETUP.md`).
- **UI polish:** subtle motion (framer-motion) on the mobile menu, cart
  badge, login steps, and address list; tap/hover micro-interactions
  throughout.

## Not included yet (flag if you want these before/after launch)
- Razorpay webhook reconciliation for abandoned-tab edge cases.
- Email/SMS order confirmation (Resend is already a dependency, unused so far).
- Automated tests / CI.
