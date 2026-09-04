import bcrypt from "bcryptjs";

import { PASSWORD_BCRYPT_ROUNDS } from "../constants/auth.constants";

/**
 * Staff password hashing, alongside `otp.ts` which does the same for OTPs.
 * bcryptjs (not bcrypt) so nothing here needs a native build step — the rest of
 * the auth feature already depends on it.
 */

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_BCRYPT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * A real bcrypt hash of a value nobody can supply, used to burn the same ~250ms
 * on a missing user or a password-less customer as on a genuine wrong password.
 *
 * Without this the route answers "no such admin" measurably faster than "wrong
 * password", which turns the login into an oracle for enumerating which email
 * addresses are admins — the generic error message alone doesn't hide that.
 * Generated at module load, so it costs one hash per cold start rather than one
 * per request.
 */
const DUMMY_HASH_PROMISE = hashPassword(
  "timing-equaliser-not-a-real-password"
);

/**
 * Runs a throwaway comparison purely for its timing. Call this on every path
 * that rejects before reaching a real hash.
 */
export async function burnPasswordComparison(
  password: string
): Promise<void> {
  try {
    await comparePassword(password, await DUMMY_HASH_PROMISE);
  } catch {
    // The result is irrelevant — only the elapsed time matters.
  }
}
