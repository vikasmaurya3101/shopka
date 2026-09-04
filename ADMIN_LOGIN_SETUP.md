# Admin Login — Setup Guide

Staff sign in with **email + password** at `/admin/login`. Customers keep using
the OTP flow at `/login`; the two are separate routes that issue the same
`shopka_session` cookie.

## No new environment variables

This feature adds none. It signs the same session JWT the OTP flow does, so
`NEXTAUTH_SECRET` — already required — is the only secret involved.

## 1. Apply the migration

One additive, nullable column:

```bash
npx prisma migrate deploy
```

`users.password` holds a bcrypt hash and stays `NULL` for every customer. No
existing row changes.

## 2. Create the first admin

```bash
ADMIN_EMAIL=you@shopka.in ADMIN_PASSWORD='a-long-unique-password' npm run seed:admin
```

- Upserts by email, so re-running it **rotates** the password rather than
  creating a duplicate.
- An existing customer with that email is **promoted in place** — their orders,
  addresses and cart are untouched.
- Minimum 10 characters. Credentials come from the environment on purpose: a
  default password committed to the repo is the kind of thing that reaches
  production.

To rotate later, run the same command with a new `ADMIN_PASSWORD`.

## 3. Sign in

Go to `/admin/login`. On success you land on `/admin`.

## Who can sign in

Only `role === "ADMIN"` **and** `isActive === true` **and** a password set. A
SELLER or CUSTOMER with a password is rejected exactly like a wrong password —
one generic "Incorrect email or password." for every rejection, so the form
can't be used to discover which addresses are admin accounts.

Note that an admin whose `email` is `NULL` cannot use this form at all; give them
an email via `seed:admin` (or the admin panel) first.

## How /admin/* is protected

Two independent gates:

1. **`src/middleware.ts`** — for any `/admin/*` path except `/admin/login`, it
   verifies the session JWT and requires `role === "ADMIN"`. No session →
   redirect to `/admin/login?redirect=…`. A signed-in non-admin → redirect to
   `/`, not back to a login form their credentials already satisfy.
2. **`src/app/admin/layout.tsx`** — re-checks the session server-side where the
   pages actually render, so a narrowed middleware matcher can't silently expose
   the panel.

Before this, middleware only checked that *a* session cookie existed. Any
signed-in customer could load `/admin/*` and render the panel shell — the APIs
behind it rejected them, but the pages did not.

## Security notes

- **Rate limiting** is per caller IP: 20 failed attempts per 15 minutes, then
  `429` with `Retry-After`. It is deliberately **not** keyed by email — an
  email-keyed lockout would let anyone who guesses the admin address lock the
  real admin out on demand. bcrypt at cost 12 (~250ms per guess) is what makes
  brute force expensive.
- The counter lives **in memory**, so on serverless it is per-instance and an
  attacker spread across instances gets more attempts than 20. Move it to
  Postgres or Upstash if this endpoint ever draws real attention.
- Every rejecting path spends one bcrypt comparison, including "no such user",
  so response time can't be used to enumerate admin emails. Verified: a missing
  address and a wrong password both answer in ~0.7s.
- `?redirect=` is only honoured for paths starting `/admin`, so it can't bounce a
  freshly-authenticated admin to an external URL.
- `/admin/login` is `noindex, nofollow`.

## Files

| File | Role |
|---|---|
| `prisma/migrations/20260904000000_add_user_password/` | adds `users.password` |
| `prisma/seed-admin.ts` | creates/promotes an admin, hashes the password |
| `src/features/auth/utils/password.ts` | bcryptjs hash/compare + timing equaliser |
| `src/app/api/auth/admin-login/route.ts` | the credentials endpoint |
| `src/app/admin/login/page.tsx` · `AdminLoginForm.tsx` | the form |
| `src/middleware.ts` | role gate on `/admin/*` |
| `src/app/admin/layout.tsx` | server-side re-check, renders login bare |
| `src/lib/session.ts` | `verifySessionToken()` for edge-runtime use |
