import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { unstable_cache } from "next/cache";
import "./globals.css";
import AuthProvider from "@/providers/AuthProvider";
import ThemeProvider from "@/providers/ThemeProvider";
import ToastProvider from "@/providers/ToastProvider";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { prisma } from "@/lib/prisma";

const getLogoUrl = unstable_cache(
  async () => {
    try {
      const s = await prisma.siteSetting.findUnique({ where: { key: "logo_url" } });
      return s?.value || "/brand/logo-128.png";
    } catch {
      return "/brand/logo-128.png";
    }
  },
  ["site-logo-url"],
  { revalidate: 60 }
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://shopka.in"),
  title: {
    default: "Shopka — All Trending Products here",
    template: "%s | Shopka",
  },
  description:
    "Smart Shopping Starts Here — India's trusted online shopping destination for best prices, fast delivery & 24x7 support.",
  icons: {
    icon: [
      { url: "/brand/logo-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/logo-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Shopka — All Trending Products here",
    description:
      "India's trusted online shopping destination for best prices, fast delivery & 24x7 support.",
    images: [{ url: "/brand/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
};

export const viewport = {
  themeColor: "#160a2e",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const logoUrl = await getLogoUrl();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <Navbar logoUrl={logoUrl} />
              <main className="flex-1">{children}</main>
              <Footer />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}