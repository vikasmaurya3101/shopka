import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getRazorpayInstance } from "@/lib/razorpay";

export interface RazorpayPaymentDetails {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

/**
 * Raised when a Razorpay payment can't be trusted. `status` is the HTTP status
 * the caller should return, so every paid flow reports the same failure the
 * same way instead of collapsing everything into a generic 400.
 */
export class PaymentVerificationError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PaymentVerificationError";
    this.status = status;
  }
}

/** Length-checked constant-time compare — the signature is attacker-supplied. */
function signaturesMatch(expected: string, provided: string) {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Verifies the HMAC-SHA256 signature Razorpay's checkout returns after a
 * successful payment. This proves the two ids were issued together by Razorpay
 * and weren't tampered with — but nothing more. It says nothing about *which*
 * of our orders the payment was for, or *how much* was collected, which is why
 * every caller must also go through `verifyRazorpayPayment`.
 *
 * https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/build-integration/#step-5-verify-payment-signature
 */
export function verifyRazorpaySignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: RazorpayPaymentDetails) {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    throw new PaymentVerificationError(
      "Razorpay isn't configured on the server.",
      500
    );
  }

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new PaymentVerificationError("Missing payment verification details.");
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (!signaturesMatch(expected, razorpaySignature)) {
    throw new PaymentVerificationError(
      "Payment verification failed. Please contact support."
    );
  }
}

export interface RazorpayPaymentExpectation {
  /** The signed-in user the Razorpay order must have been created for. */
  userId: string;
  /** Exactly what we expect Razorpay to have collected, in paise. */
  amountPaise: number;
  /**
   * Our own `Order.id`, for the Pay Now flow where the order already exists.
   * Omitted at first checkout, where the order is created after payment.
   */
  dbOrderId?: string;
}

/** One retry, because a transient 5xx here would strand a real payment. */
async function fetchRazorpayOrder(razorpayOrderId: string, paymentId: string) {
  let razorpay;

  try {
    razorpay = getRazorpayInstance();
  } catch {
    throw new PaymentVerificationError(
      "Razorpay isn't configured on the server.",
      500
    );
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await razorpay.orders.fetch(razorpayOrderId);
    } catch (error) {
      console.error(
        `[razorpay-verify] orders.fetch(${razorpayOrderId}) attempt ${attempt} failed:`,
        error
      );
    }
  }

  // Fail closed: we will not bank an unverified amount. The money is safe at
  // Razorpay and the payment.captured webhook reconciles the order, so tell the
  // customer not to pay twice and log the id support will need.
  console.error(
    `[razorpay-verify] UNVERIFIED PAYMENT needs reconciliation: order=${razorpayOrderId} payment=${paymentId}`
  );

  throw new PaymentVerificationError(
    `We couldn't confirm this payment with Razorpay just now. Please don't pay again — ` +
      `your money is safe and the order will update shortly. Quote payment ID ${paymentId} if you contact support.`,
    502
  );
}

/**
 * The check that actually protects the money.
 *
 * A valid signature only proves "Razorpay processed a payment against Razorpay
 * order X". On its own that let two things through:
 *
 *  - Paying for a cheap cart, then growing the cart before calling /api/checkout,
 *    so an expensive order got persisted as PAID against a small payment.
 *  - Replaying one legitimately-paid `(order_id, payment_id, signature)` triple
 *    against a different, more expensive PENDING order.
 *
 * So we re-read the order back from Razorpay and require that it is one *we*
 * created, for *this* user, for *this* order where applicable, and for exactly
 * the amount we are about to persist. `notes` is set server-side at create time
 * and can't be forged without our key secret, which is what makes it load-bearing.
 *
 * Must be called with the final computed amount, i.e. AFTER totals are worked
 * out — verifying before that is what made the amount unchecked in the first place.
 */
export async function verifyRazorpayPayment(
  details: RazorpayPaymentDetails,
  { userId, amountPaise, dbOrderId }: RazorpayPaymentExpectation
) {
  verifyRazorpaySignature(details);

  // Non-null after verifyRazorpaySignature, which rejects missing ids.
  const razorpayOrderId = details.razorpayOrderId!;
  const razorpayPaymentId = details.razorpayPaymentId!;

  // A payment id may only ever settle one order. `Payment.razorpayPaymentId` is
  // unique in the schema, so a concurrent double-submit still loses at insert
  // time — this lookup exists to turn that into a clear message instead of a
  // constraint violation.
  const alreadyUsed = await prisma.payment.findFirst({
    where: { razorpayPaymentId },
    select: { orderId: true },
  });

  if (alreadyUsed) {
    throw new PaymentVerificationError(
      "This payment has already been applied to an order.",
      409
    );
  }

  const rzpOrder = await fetchRazorpayOrder(razorpayOrderId, razorpayPaymentId);
  const notes = (rzpOrder.notes ?? {}) as Record<string, string | number>;

  if (notes.userId === undefined || String(notes.userId) !== userId) {
    console.error(
      `[razorpay-verify] owner mismatch: order=${razorpayOrderId} notes.userId=${String(
        notes.userId
      )} session=${userId}`
    );

    throw new PaymentVerificationError(
      "This payment belongs to a different account.",
      403
    );
  }

  if (dbOrderId && String(notes.shopkaOrderId ?? "") !== dbOrderId) {
    console.error(
      `[razorpay-verify] order mismatch: rzp=${razorpayOrderId} notes.shopkaOrderId=${String(
        notes.shopkaOrderId
      )} expected=${dbOrderId}`
    );

    throw new PaymentVerificationError(
      "This payment wasn't created for this order."
    );
  }

  if (Number(rzpOrder.amount) !== amountPaise) {
    console.error(
      `[razorpay-verify] AMOUNT MISMATCH needs reconciliation: order=${razorpayOrderId} ` +
        `payment=${razorpayPaymentId} razorpay=${String(
          rzpOrder.amount
        )} expected=${amountPaise}`
    );

    throw new PaymentVerificationError(
      "The amount paid doesn't match this order. Nothing has been charged twice — please contact support."
    );
  }

  return rzpOrder;
}
