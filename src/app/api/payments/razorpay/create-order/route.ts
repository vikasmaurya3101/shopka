import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getRazorpayInstance } from "@/lib/razorpay";
import { calculateOrderTotals } from "@/lib/utils/order-total";

/**
 * Creates a Razorpay order sized to the user's current cart total, so the
 * checkout page can open the Razorpay payment modal against it. The actual
 * order/payment record in our DB is only created afterwards, in
 * /api/checkout, once the payment is confirmed & the signature verified.
 */
export async function POST() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Login required." },
      { status: 401 }
    );
  }

  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: session.userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Your cart is empty." },
        { status: 400 }
      );
    }

    let subtotal = new Prisma.Decimal(0);

    for (const item of cart.items) {
      const sellingPrice = new Prisma.Decimal(item.product.sellingPrice);
      const lineTotal = sellingPrice.mul(item.quantity);

      subtotal = subtotal.add(lineTotal);
    }

    // Mirrors checkout.service.placeOrder() exactly — same helper, same inputs —
    // so the amount Razorpay collects always equals the order we then persist.
    const totals = calculateOrderTotals({
      subtotal: subtotal.toNumber(),
      allItemsFreeShipping: cart.items.every((item) => item.product.freeShipping),
      isPrepaid: true,
    });
    const amountInPaise = Math.round(totals.payable * 100);

    const razorpay = getRazorpayInstance();

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `ord_${Date.now()}_${session.userId.slice(-8)}`,
      notes: { userId: session.userId },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error("RAZORPAY CREATE ORDER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to start payment. Please try again.",
      },
      { status: 500 }
    );
  }
}
