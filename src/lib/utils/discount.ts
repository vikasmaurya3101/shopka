export function calculateDiscountPercentage(
  mrp: number,
  sellingPrice: number
): number {
  if (mrp <= 0) return 0;
  return Math.round(((mrp - sellingPrice) / mrp) * 100);
}

export function calculateSaving(mrp: number, sellingPrice: number): number {
  return Math.max(0, mrp - sellingPrice);
}

export function hasDiscount(mrp: number, sellingPrice: number): boolean {
  return sellingPrice < mrp;
}

/**
 * Flat 5% extra discount applied when paying online (prepaid).
 * Calculated as a percentage of the subtotal at call-time.
 */
export const PREPAID_DISCOUNT_PERCENT = 5;

/** @deprecated use PREPAID_DISCOUNT_PERCENT */
export const PREPAID_DISCOUNT = 15;

export function getPrepaidAmount(subtotal: number): number {
  return Math.max(0, subtotal - Math.round((subtotal * PREPAID_DISCOUNT_PERCENT) / 100));
}
