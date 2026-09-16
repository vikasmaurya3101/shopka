"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }

    // Already installed? skip
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Dismissed before? skip for 7 days
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setShow(false);
  }

  function handleDismiss() {
    setShow(false);
    localStorage.setItem("pwa-banner-dismissed", String(Date.now()));
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl bg-white p-4 shadow-2xl shadow-black/20 border border-gray-100 flex items-center gap-3">
      {/* Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-192.png" alt="Shopka" className="h-12 w-12 rounded-xl shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">Install Shopka App</p>
        <p className="text-xs text-gray-500 mt-0.5">Home screen pe add karo — fast & offline</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white"
        >
          <Download size={13} /> Install
        </button>
        <button onClick={handleDismiss} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
