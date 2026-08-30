# Shopka — Fixed Files (2026-07-23)

Copy these files into your project at the **exact same paths**, overwriting
the existing ones. Nothing else in your project needs to change.

## 1. `package.json`
Replaces your root `package.json`.
**What changed:** `build` now runs `prisma generate` first, and a
`postinstall` script was added — this makes sure Vercel always generates a
fresh Prisma client on deploy, removing one possible cause of the
product-page 404s.

## 2. `src/components/shared/LoginRequiredNotice.tsx` (new file)
**What it does:** Shows a "Please login to continue." toast when
`middleware.ts` redirects someone away from /cart, /profile, etc. for not
being logged in. Previously this redirect happened silently with no
feedback.

## 3. `src/app/page.tsx`
**What changed:** Mounts `<LoginRequiredNotice />` (wrapped in `<Suspense>`)
so the toast above actually shows up on the homepage, which is where the
middleware redirects to.

## 4. `src/features/auth/providers/messagecentral.provider.ts`
**What changed:** Fixed the `/verification/v3/send` request — was sending
`type=SMS`, now sends `type=OTP` per Message Central's official docs. This
is the fix for the "Support for Old MessageNow/VerifyNow-WA is
discontinued" error, confirmed via their dashboard Test Pad working while
the app's exact request (with the wrong `type` value) did not.

## After copying these files in:
```bash
git add .
git commit -m "Fix OTP type param, add login-required toast, ensure prisma generate on build"
git push
```
Vercel will auto-redeploy. Then test **Send OTP** again on your live site.

## Still outstanding (not code — needs your dashboard access):
- [ ] Confirm `npx prisma migrate deploy` has been run against your
      **production** Supabase database (not just locally)
