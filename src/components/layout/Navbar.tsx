"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Heart,
  HelpCircle,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MoreVertical,
  Package,
  Search,
  SearchX,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { useSession } from "@/providers/SessionProvider";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { formatCurrency } from "@/lib/utils/currency";
import { ProductSearchResult } from "@/types/product";
import Logo from "@/components/shared/Logo";

const MAX_SUGGESTIONS = 6;

interface SearchSuggestResponse {
  success: boolean;
  data?: ProductSearchResult[];
}

export default function Navbar({ logoUrl = "/brand/logo-128.png" }: { logoUrl?: string }) {
  const router = useRouter();
  const { user, isAuthenticated } = useSession();
  const { itemCount } = useCart();
  const { logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSearchResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeField, setActiveField] = useState<"desktop" | "mobile" | null>(null);

  const debouncedQuery = useDebounce(query, 300);
  const requestIdRef = useRef(0);
  const desktopFormRef = useRef<HTMLFormElement>(null);
  const mobileFormRef = useRef<HTMLFormElement>(null);

  const QUICK_LINKS = [
    { label: "Saved Addresses", href: "/profile/addresses", icon: MapPin },
    { label: "Wishlist", href: "/profile", icon: Heart },
    { label: "Orders", href: "/orders", icon: Package },
    { label: "Contact Us", href: "/contact", icon: Mail },
    { label: "Help & Support", href: "/help", icon: HelpCircle },
  ];

  // True the instant the user types, until the debounced value below
  // catches up — so the dropdown can show a "searching" state right away
  // instead of popping from nothing straight to "No results".
  const isAwaitingDebounce = query.trim().length > 0 && query !== debouncedQuery;

  useEffect(() => {
    const trimmed = debouncedQuery.trim();

    if (!trimmed) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;

    fetch(`/api/products/search?q=${encodeURIComponent(trimmed)}`)
      .then((res) => res.json())
      .then((json: SearchSuggestResponse) => {
        if (requestId !== requestIdRef.current) return;
        setSuggestions(json.success ? (json.data ?? []).slice(0, MAX_SUGGESTIONS) : []);
      })
      .catch(() => {
        if (requestId === requestIdRef.current) setSuggestions([]);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setSuggestionsLoading(false);
      });
  }, [debouncedQuery]);

  // Escape and click-outside both close whichever dropdown is currently open.
  useEffect(() => {
    if (!activeField) return;

    function handlePointerDown(e: MouseEvent) {
      const formRef = activeField === "desktop" ? desktopFormRef : mobileFormRef;
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setActiveField(null);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setActiveField(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeField]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveField(null);
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  function closeSuggestions() {
    setActiveField(null);
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Logo size={38} logoUrl={logoUrl} />

          <form
            ref={desktopFormRef}
            onSubmit={handleSearch}
            className="hidden flex-1 px-10 lg:block"
          >
            <div className="relative flex items-center">
              <Search
                size={20}
                className="absolute left-4 text-gray-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setActiveField("desktop")}
                placeholder="Search for products..."
                autoComplete="off"
                className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-11 pr-28 outline-none transition focus:border-brand focus:bg-white"
              />
              <button
                type="submit"
                className="tap-shrink absolute right-1.5 rounded-full bg-brand px-5 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Search
              </button>

              <AnimatePresence>
                {activeField === "desktop" && query.trim().length > 0 && (
                  <SearchSuggestions
                    loading={isAwaitingDebounce || suggestionsLoading}
                    results={suggestions}
                    query={query}
                    onSelect={closeSuggestions}
                  />
                )}
              </AnimatePresence>
            </div>
          </form>

          <div className="hidden items-center gap-6 lg:flex">
            {isAuthenticated ? (
              <button
                onClick={logout}
                className="tap-shrink font-medium transition hover:text-brand"
              >
                Logout ({user?.firstName ?? "Account"})
              </button>
            ) : (
              <Link href="/login" className="font-medium transition hover:text-brand">
                Login
              </Link>
            )}

            <Link
              href="/cart"
              className="tap-shrink relative flex items-center gap-2 transition hover:text-brand"
            >
              <ShoppingCart size={20} />
              Cart
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span
                    key={itemCount}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white"
                  >
                    {itemCount > 9 ? "9+" : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            <Link
              href="/profile"
              className="tap-shrink flex items-center gap-2 transition hover:text-brand"
            >
              <User size={20} />
              Profile
            </Link>

            <div className="relative">
              <button
                onClick={() => setQuickMenuOpen((v) => !v)}
                className="tap-shrink rounded-full p-1.5 transition hover:bg-brand-50 hover:text-brand"
                aria-label="More options"
                aria-expanded={quickMenuOpen}
              >
                <MoreVertical size={20} />
              </button>

              <AnimatePresence>
                {quickMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setQuickMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border bg-white py-1.5 shadow-xl"
                    >
                      {QUICK_LINKS.map(({ label, href, icon: Icon }) => (
                        <Link
                          key={label}
                          href={href}
                          onClick={() => setQuickMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-brand-50 hover:text-brand"
                        >
                          <Icon size={16} />
                          {label}
                        </Link>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            onClick={() => setMobileOpen(true)}
            className="tap-shrink lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={28} />
          </button>
        </div>

        {/* Persistent search row for mobile/tablet — the form above is desktop-only */}
        <form
          ref={mobileFormRef}
          onSubmit={handleSearch}
          className="border-t px-4 py-2.5 lg:hidden"
        >
          <div className="relative flex items-center">
            <Search size={18} className="absolute left-3.5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setActiveField("mobile")}
              placeholder="Search for products..."
              autoComplete="off"
              className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-10 pr-16 text-sm outline-none transition focus:border-brand focus:bg-white"
            />
            <button
              type="submit"
              className="tap-shrink absolute right-1 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
            >
              Search
            </button>

            <AnimatePresence>
              {activeField === "mobile" && query.trim().length > 0 && (
                <SearchSuggestions
                  loading={isAwaitingDebounce || suggestionsLoading}
                  results={suggestions}
                  query={query}
                  onSelect={closeSuggestions}
                />
              )}
            </AnimatePresence>
          </div>
        </form>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[999] bg-black/40"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute right-0 h-full w-72 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b p-5">
                <Logo size={32} />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="tap-shrink"
                  aria-label="Close menu"
                >
                  <X size={25} />
                </button>
              </div>

              <nav className="flex flex-col">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between border-b p-4 transition hover:bg-gray-50 active:bg-gray-100"
                >
                  Home
                  <ChevronRight size={16} className="text-gray-300" />
                </Link>

                <Link
                  href="/cart"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between border-b p-4 transition hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingCart size={18} className="text-brand" />
                    Cart {itemCount > 0 && `(${itemCount})`}
                  </span>
                  <ChevronRight size={16} className="text-gray-300" />
                </Link>

                <Link
                  href="/orders"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between border-b p-4 transition hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="flex items-center gap-2">
                    <Package size={18} className="text-brand" />
                    Orders
                  </span>
                  <ChevronRight size={16} className="text-gray-300" />
                </Link>

                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between border-b p-4 transition hover:bg-gray-50 active:bg-gray-100"
                >
                  <span className="flex items-center gap-2">
                    <User size={18} className="text-brand" />
                    Profile
                  </span>
                  <ChevronRight size={16} className="text-gray-300" />
                </Link>

                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-2 border-b p-4 text-left text-red-500 transition hover:bg-red-50"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between border-b p-4 font-semibold text-brand transition hover:bg-brand-50"
                  >
                    Login / Sign up
                    <ChevronRight size={16} />
                  </Link>
                )}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface SearchSuggestionsProps {
  loading: boolean;
  results: ProductSearchResult[];
  query: string;
  onSelect: () => void;
}

/**
 * Autocomplete dropdown shared by the desktop and mobile search forms.
 * Anchored by the caller (each form wraps it in a `relative` container).
 */
function SearchSuggestions({ loading, results, query, onSelect }: SearchSuggestionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-gray-100 bg-white py-2 text-left shadow-xl"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" />
          Searching...
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center text-sm text-gray-400">
          <SearchX size={20} className="text-gray-300" />
          No products found for “{query.trim()}”
        </div>
      ) : (
        results.map((product) => {
          const thumbnail = product.images[0]?.url ?? "/placeholder-product.png";

          return (
            <Link
              key={product.id}
              href={`/product/${product.slug}`}
              onClick={onSelect}
              prefetch={false}
              className="tap-shrink flex items-center gap-3 px-4 py-2 transition hover:bg-brand-50"
            >
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                <Image
                  src={thumbnail}
                  alt={product.name}
                  fill
                  sizes="44px"
                  className="object-contain p-1"
                />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-800">
                  {product.name}
                </span>
                <span className="block text-xs font-semibold text-brand">
                  {formatCurrency(product.sellingPrice)}
                </span>
              </span>
            </Link>
          );
        })
      )}
    </motion.div>
  );
}
