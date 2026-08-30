"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/providers/SessionProvider";
import { CartData, CartItemData } from "@/types/cart";
import { ProductCardData } from "@/types/product";

const GUEST_CART_KEY = "shopka_guest_cart";

interface GuestLine {
  productId: string;
  quantity: number;
}

function readGuestCart(): GuestLine[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeGuestCart(lines: GuestLine[]) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines));
  } catch {
    // localStorage unavailable — guest cart just won't persist across reloads
  }
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * Cart hook with a guest mode: logged-out users get a fully working local
 * cart (localStorage), so browsing/adding items never forces a login. Login
 * is only required at checkout. On login, the local cart is merged into the
 * server cart and cleared.
 */
export function useCart() {
  const { isAuthenticated } = useSession();
  const [cart, setCart] = useState<CartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const fetchGuestCart = useCallback(async () => {
    const lines = readGuestCart();

    if (lines.length === 0) {
      setCart(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/products/by-ids?ids=${lines.map((l) => l.productId).join(",")}`
      );
      const json: ApiResponse<ProductCardData[]> = await res.json();
      const products = json.success ? json.data ?? [] : [];

      const items: CartItemData[] = lines
        .map((line) => {
          const product = products.find((p) => p.id === line.productId);
          return product
            ? { id: line.productId, productId: line.productId, quantity: line.quantity, product }
            : null;
        })
        .filter((item): item is CartItemData => item !== null);

      setCart({ id: "guest", userId: "guest", items });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchServerCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      const json: ApiResponse<CartData> = await res.json();
      setCart(json.success ? json.data ?? null : null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCart = useCallback(async () => {
    setIsLoading(true);
    if (isAuthenticated) await fetchServerCart();
    else await fetchGuestCart();
  }, [isAuthenticated, fetchServerCart, fetchGuestCart]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // On login, merge whatever was in the guest cart into the server cart once.
  useEffect(() => {
    if (!isAuthenticated) return;

    const lines = readGuestCart();
    if (lines.length === 0) return;

    (async () => {
      for (const line of lines) {
        await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: line.productId, quantity: line.quantity }),
        }).catch(() => null);
      }
      writeGuestCart([]);
      await fetchServerCart();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const addToCart = useCallback(
    async (productId: string, quantity = 1) => {
      if (!isAuthenticated) {
        const lines = readGuestCart();
        const existing = lines.find((l) => l.productId === productId);

        if (existing) existing.quantity += quantity;
        else lines.push({ productId, quantity });

        writeGuestCart(lines);
        setIsMutating(true);
        await fetchGuestCart();
        setIsMutating(false);
        toast.success("Added to cart");
        return true;
      }

      setIsMutating(true);

      try {
        const res = await fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, quantity }),
        });

        const json: ApiResponse<CartData> = await res.json();

        if (!json.success) {
          toast.error(json.message ?? "Unable to add to cart.");
          return false;
        }

        setCart(json.data ?? null);
        toast.success("Added to cart");
        return true;
      } finally {
        setIsMutating(false);
      }
    },
    [isAuthenticated, fetchGuestCart]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (!isAuthenticated) {
        const lines = readGuestCart().map((l) =>
          l.productId === itemId ? { ...l, quantity } : l
        );
        writeGuestCart(lines);
        setIsMutating(true);
        await fetchGuestCart();
        setIsMutating(false);
        return true;
      }

      setIsMutating(true);

      try {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        });

        const json: ApiResponse<CartData> = await res.json();

        if (!json.success) {
          toast.error(json.message ?? "Unable to update cart.");
          return false;
        }

        setCart(json.data ?? null);
        return true;
      } finally {
        setIsMutating(false);
      }
    },
    [isAuthenticated, fetchGuestCart]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (!isAuthenticated) {
        writeGuestCart(readGuestCart().filter((l) => l.productId !== itemId));
        setIsMutating(true);
        await fetchGuestCart();
        setIsMutating(false);
        toast.success("Removed from cart");
        return true;
      }

      setIsMutating(true);

      try {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: "DELETE",
        });

        const json: ApiResponse<CartData> = await res.json();

        if (!json.success) {
          toast.error(json.message ?? "Unable to remove item.");
          return false;
        }

        setCart(json.data ?? null);
        toast.success("Removed from cart");
        return true;
      } finally {
        setIsMutating(false);
      }
    },
    [isAuthenticated, fetchGuestCart]
  );

  const itemCount =
    cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return {
    cart,
    itemCount,
    isLoading,
    isMutating,
    addToCart,
    updateQuantity,
    removeItem,
    refresh: fetchCart,
  };
}

export default useCart;
