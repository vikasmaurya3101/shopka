import { PREPAID_DISCOUNT_PERCENT } from "./discount";
import { calculateShipping, ShippableLine } from "./shipping";

export interface OrderTotalsInput {
  subtotal: number;
  lines: ShippableLine[];
  isPrepaid: boolean;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  prepaidDiscount: number;
  payable: number;
}

/**
 * Single source of truth for what a customer is charged.
 * Prepaid discount = flat 5% off the subtotal (after product discounts).
 */
export function calculateOrderTotals({
  subtotal,
  lines,
  isPrepaid,
}: OrderTotalsInput): OrderTotals {
  const shipping = calculateShipping(lines);
  const prepaidDiscount = isPrepaid
    ? Math.min(
        Math.round((subtotal * PREPAID_DISCOUNT_PERCENT) / 100),
        subtotal + shipping
      )
    : 0;

  return {
    subtotal,
    shipping,
    prepaidDiscount,
    payable: subtotal + shipping - prepaidDiscount,
  };
}
