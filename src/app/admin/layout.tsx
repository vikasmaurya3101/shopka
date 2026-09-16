import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Script from "next/script";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { getSession } from "@/lib/session";

/** Kept in sync with the header the middleware sets. */
const PATHNAME_HEADER = "x-shopka-pathname";
const LOGIN_PATH = "/admin/login";

export const metadata = {
  title: "Shopka Admin",
  manifest: "/admin.webmanifest",
  themeColor: "#e11d48",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shopka Admin",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get(PATHNAME_HEADER) ?? "";

  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) {
    return <>{children}</>;
  }

  const session = await getSession();

  if (!session) redirect(LOGIN_PATH);
  if (session.role !== "ADMIN") redirect("/");

  return (
    <>
      {/* PWA — register admin service worker */}
      <Script id="admin-sw" strategy="afterInteractive">{`
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', () => {
            navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' })
              .catch(() => {});
          });
        }
      `}</Script>

      {/* PWA meta — "Add to Home Screen" pe Shopka Admin khulega */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <link rel="manifest" href="/admin.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Shopka Admin" />
        <meta name="theme-color" content="#e11d48" />
      </head>

      <div className="min-h-screen bg-gray-50">
        <AdminSidebar />
        <div className="lg:pl-56 pt-14">
          {children}
        </div>
      </div>
    </>
  );
}
