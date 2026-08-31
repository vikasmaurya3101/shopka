import type { Decimal } from "@prisma/client/runtime/library";

/**
 * Delivery charges are set per product (`Product.shippingCharge`) and default to
 * 0, so a catalogue nobody has touched ships everything free. There is no flat
 * fee and no order-value threshold: whatever the admin set on the product is
 * what the customer pays.
 */

/**
 * A rupee charge as it can reach us: a raw Prisma `Decimal` on the server, or the
 * string it serialises to once it has crossed into a client component.
 */
export type ChargeAmount = number | string | Decimal;

export interface ShippableLine {
  productId: string;
  shippingCharge: ChargeAmount;
}

/**
 * Delivery total for a cart: each product's own charge, counted once no matter
 * how many units are ordered. Ordering three of a ₹50-delivery item costs ₹50,
 * not ₹150.
 */
export function calculateShipping(lines: ShippableLine[]): number {
  const seen = new Set<string>();
  let total = 0;

  for (const line of lines) {
    if (seen.has(line.productId)) continue;
    seen.add(line.productId);
    total += Number(line.shippingCharge) || 0;
  }

  return total;
}

/**
 * Maps anything cart-item shaped onto the input `calculateShipping` wants. Cart,
 * checkout, the Razorpay order and the persisted order all share this so they
 * can't disagree about which field the charge comes from.
 */
export function toShippableLines(
  items: { productId: string; product: { shippingCharge: ChargeAmount } }[]
): ShippableLine[] {
  return items.map((item) => ({
    productId: item.productId,
    shippingCharge: item.product.shippingCharge,
  }));
}
