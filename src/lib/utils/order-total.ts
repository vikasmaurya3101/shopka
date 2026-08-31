import { PREPAID_DISCOUNT } from "./discount";
import { calculateShipping, ShippableLine } from "./shipping";

export interface OrderTotalsInput {
  /** Sum of sellingPrice × quantity across all cart items. */
  subtotal: number;
  /** Cart lines, for the per-product delivery charges. */
  lines: ShippableLine[];
  /** True when paying online (Razorpay), which earns the flat prepaid discount. */
  isPrepaid: boolean;
}

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  prepaidDiscount: number;
  /** What the customer is actually charged. */
  payable: number;
}

/**
 * Single source of truth for what a customer is charged. Shared by the cart
 * summary, the checkout summary, the Razorpay order amount and the persisted
 * Order row, so those four numbers can't drift apart.
 *
 * Shipping is added on top of the subtotal; the prepaid discount then comes off
 * that shipped total and is capped so `payable` can never go negative.
 */
export function calculateOrderTotals({
  subtotal,
  lines,
  isPrepaid,
}: OrderTotalsInput): OrderTotals {
  const shipping = calculateShipping(lines);
  const prepaidDiscount = isPrepaid
    ? Math.min(PREPAID_DISCOUNT, subtotal + shipping)
    : 0;

  return {
    subtotal,
    shipping,
    prepaidDiscount,
    payable: subtotal + shipping - prepaidDiscount,
  };
}
