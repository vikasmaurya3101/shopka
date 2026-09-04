import { NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

const PUBLIC_ROUTES = [
  "/",
  "/search",
  "/category",
  "/product",
  "/login",
  "/verify",
  "/admin/login",
  "/api/auth/send-otp",
  "/api/auth/verify-otp",
  "/api/auth/complete-profile",
  "/api/auth/session",
  "/api/auth/logout",
  "/api/auth/admin-login",
];

const PROTECTED_ROUTES = [
  "/checkout",
  "/orders",
  "/profile",
  "/seller",
  "/admin",
];

/** Routes only `role === "ADMIN"` may reach. */
const ADMIN_ROUTES = ["/admin"];

/**
 * Header the admin layout reads to tell "/admin/login" apart from the pages it
 * guards. Server components can't see the pathname, and the login page has to
 * render without the panel chrome around it.
 */
const PATHNAME_HEADER = "x-shopka-pathname";

function withPathname(request: NextRequest) {
  const headers = new Headers(request.headers);

  headers.set(PATHNAME_HEADER, request.nextUrl.pathname);

  return NextResponse.next({ request: { headers } });
}

export async function middleware(request: NextRequest) {
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
    return withPathname(request);
  }

  // Protected routes
  const isProtected = PROTECTED_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(route + "/")
  );

  if (!isProtected) {
    return withPathname(request);
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  const isAdminRoute = ADMIN_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(route + "/")
  );

  if (!token) {
    // Send staff to the staff form and customers to theirs, so neither lands on
    // a login screen that can't issue the session they need.
    const loginUrl = new URL(
      isAdminRoute ? "/admin/login" : "/login",
      request.url
    );

    loginUrl.searchParams.set("redirect", pathname);

    return NextResponse.redirect(loginUrl);
  }

  // Admin pages need the role, not just a cookie. Verifying the JWT here rather
  // than trusting its presence is the point: before this, any signed-in customer
  // could load /admin/* and render the panel — the APIs behind it rejected them,
  // but the pages themselves did not.
  if (isAdminRoute) {
    const session = await verifySessionToken(token);

    if (!session) {
      const loginUrl = new URL("/admin/login", request.url);

      loginUrl.searchParams.set("redirect", pathname);

      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== "ADMIN") {
      // A signed-in non-admin isn't asked to log in again — that would be a
      // pointless loop for someone whose credentials are already valid. They're
      // sent to the storefront instead.
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return withPathname(request);
}

export const config = {
  matcher: ["/((?!.*\\.).*)"],
};
