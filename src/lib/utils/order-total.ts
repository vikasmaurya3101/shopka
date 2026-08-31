import { PREPAID_DISCOUNT } from "./discount";
import { calculateShipping } from "./shipping";

export interface OrderTotalsInput {
  /** Sum of sellingPrice × quantity across all cart items. */
  subtotal: number;
  /** True only when every item in the cart is flagged freeShipping. */
  allItemsFreeShipping: boolean;
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
  allItemsFreeShipping,
  isPrepaid,
}: OrderTotalsInput): OrderTotals {
  const shipping = calculateShipping(subtotal, allItemsFreeShipping);
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
