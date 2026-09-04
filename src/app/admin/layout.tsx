import { headers } from "next/headers";
import { redirect } from "next/navigation";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { getSession } from "@/lib/session";

/** Kept in sync with the header the middleware sets. */
const PATHNAME_HEADER = "x-shopka-pathname";

const LOGIN_PATH = "/admin/login";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? "";

  // The login form lives under /admin but must render bare — wrapping it in the
  // panel chrome would show the sidebar to someone who isn't signed in yet.
  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    return <>{children}</>;
  }

  // Second gate behind the middleware, not a replacement for it. Middleware can
  // be bypassed by config mistakes (a narrowed matcher, a route that stops
  // matching), and the cost of being wrong here is an unauthenticated admin
  // panel, so the check is repeated where the pages actually render.
  const session = await getSession();

  if (!session) {
    redirect(LOGIN_PATH);
  }

  if (session.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      {/* offset for fixed sidebar (desktop) and fixed top header */}
      <div className="lg:pl-56 pt-14">
        {children}
      </div>
    </div>
  );
}
