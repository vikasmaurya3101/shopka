import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import {
  burnPasswordComparison,
  comparePassword,
} from "@/features/auth/utils/password";

/**
 * Email + password sign-in for staff, issuing the same `shopka_session` cookie
 * the OTP flow issues. It is deliberately a separate route from the customer
 * OTP endpoints rather than a mode of them: customers have no password at all,
 * and keeping the surfaces apart means a bug in one can't grant the other's
 * privileges.
 *
 * Only `role === "ADMIN"` may sign in here. A CUSTOMER or SELLER with a password
 * set is rejected exactly like a wrong password.
 */

const AdminLoginDto = z.object({
  email: z.string().trim().toLowerCase().email(),
  // No length floor on the way in: rejecting a short password with a distinct
  // message would confirm the address exists. The floor belongs on the
  // *setting* side, which is why the seed script enforces it instead.
  password: z.string().min(1),
});

/**
 * One message for every rejection — wrong address, wrong password, not an admin,
 * deactivated. Distinguishing them tells an attacker which admin emails are
 * real, and that is worth more to them than it is to a legitimate admin who
 * mistyped.
 */
const GENERIC_FAILURE = "Incorrect email or password.";

/**
 * Per-process throttle on failed attempts, keyed by caller IP only.
 *
 * Deliberately *not* keyed by email as well. An email-keyed lockout hands
 * anyone who can guess the admin's address a remote off-switch: ten bad
 * attempts and the real admin is locked out for the window. That trades a
 * brute-force risk we already price in (bcrypt at cost 12 makes each guess cost
 * ~250ms) for a denial-of-service we don't. Testing caught exactly this — a
 * correct password was rejected because unrelated failures had burned the
 * counter.
 *
 * Also deliberately in memory: the only prod migration this feature needs is one
 * additive column. On serverless the counter is per-instance, so an attacker
 * spread across instances gets more than the number below suggests — this stops
 * the cheap single-source case, and bcrypt's per-guess cost carries the rest. If
 * this endpoint ever draws real attention, move the counter to Postgres or
 * Upstash; the shape of the check doesn't change.
 */
const MAX_FAILURES = 20;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

const failures = new Map<string, { count: number; firstAt: number }>();

function isLockedOut(key: string | null): boolean {
  if (!key) return false;

  const entry = failures.get(key);

  if (!entry) return false;

  if (Date.now() - entry.firstAt > FAILURE_WINDOW_MS) {
    failures.delete(key);
    return false;
  }

  return entry.count >= MAX_FAILURES;
}

function recordFailure(key: string | null): void {
  if (!key) return;

  const now = Date.now();
  const entry = failures.get(key);

  if (!entry || now - entry.firstAt > FAILURE_WINDOW_MS) {
    failures.set(key, { count: 1, firstAt: now });
  } else {
    entry.count += 1;
  }

  // The map only holds keys that failed recently; drop stale ones so a
  // long-lived instance can't accumulate them without bound.
  if (failures.size > 5_000) {
    for (const [existing, value] of failures) {
      if (now - value.firstAt > FAILURE_WINDOW_MS) failures.delete(existing);
    }
  }
}

function clearFailures(key: string | null): void {
  if (key) failures.delete(key);
}

function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return headers.get("x-real-ip")?.trim() || null;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request." },
      { status: 400 }
    );
  }

  const parsed = AdminLoginDto.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: GENERIC_FAILURE },
      { status: 401 }
    );
  }

  const { email, password } = parsed.data;
  const throttleKey = clientIp(request.headers);

  if (isLockedOut(throttleKey)) {
    return NextResponse.json(
      {
        success: false,
        message: "Too many failed attempts. Please try again in 15 minutes.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(FAILURE_WINDOW_MS / 1000) },
      }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      phone: true,
      role: true,
      password: true,
      isActive: true,
    },
  });

  // Every rejecting branch spends a bcrypt comparison before answering, so the
  // response time can't be used to tell "no such user" from "wrong password".
  if (!user || !user.password || user.role !== "ADMIN" || !user.isActive) {
    await burnPasswordComparison(password);
    recordFailure(throttleKey);

    return NextResponse.json(
      { success: false, message: GENERIC_FAILURE },
      { status: 401 }
    );
  }

  const matches = await comparePassword(password, user.password);

  if (!matches) {
    recordFailure(throttleKey);

    return NextResponse.json(
      { success: false, message: GENERIC_FAILURE },
      { status: 401 }
    );
  }

  clearFailures(throttleKey);

  // Same cookie, same shape, same 30-day lifetime as an OTP login — so every
  // existing `getSession()` guard across the app recognises this session
  // without changes. `role` is read from the database here, never from input.
  await createSession({
    userId: user.id,
    phone: user.phone,
    role: user.role,
  });

  return NextResponse.json({
    success: true,
    data: { id: user.id, role: user.role },
  });
}
