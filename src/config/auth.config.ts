/**
 * Central auth configuration constants (session + cookie behavior).
 * OTP-specific constants live in src/features/auth/constants/auth.constants.ts.
 */
export const SESSION_COOKIE_NAME = "shopka_session";
export const SESSION_DURATION_DAYS = 30;

export const PUBLIC_ROUTES = [
  "/",
  "/search",
  "/category",
  "/product",
  "/login",
  "/verify",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/auth/complete-profile",
  "/api/auth/session",
  "/api/auth/logout",
];

export const PROTECTED_ROUTES = [
  "/checkout",
  "/orders",
  "/profile",
  "/seller",
];

export const ADMIN_ONLY_ROUTES = ["/admin"];

export const ROLES = {
  CUSTOMER: "CUSTOMER",
  SELLER: "SELLER",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
