/** Flat shipping fee, waived above the free-shipping threshold. */
export const FLAT_SHIPPING_FEE = 40;
export const FREE_SHIPPING_THRESHOLD = 499;

export function calculateShipping(subtotal: number, allItemsFreeShipping: boolean): number {
  if (allItemsFreeShipping) return 0;
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return FLAT_SHIPPING_FEE;
}
