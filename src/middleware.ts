import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = [
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

const PROTECTED_ROUTES = [
  "/checkout",
  "/orders",
  "/profile",
  "/seller",
  "/admin",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow Next.js assets
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Public routes
  const isPublic = PUBLIC_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(route + "/")
  );

  if (isPublic) {
    return NextResponse.next();
  }

  // Protected routes
  const isProtected = PROTECTED_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(route + "/")
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const session =
    request.cookies.get("shopka_session");

  if (!session) {
    const loginUrl = new URL("/login", request.url);

    loginUrl.searchParams.set(
      "redirect",
      pathname
    );

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\.).*)"],
};