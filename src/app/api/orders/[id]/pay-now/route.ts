import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPrepaidAmount } from "@/lib/utils/discount";
import {
  PaymentVerificationError,
  verifyRazorpayPayment,
} from "@/lib/razorpay-verify";

/**
 * Verifies a Razorpay payment for an existing PENDING order and marks it PAID.
 *
 * The signature alone is not enough here: it proves a payment happened against
 * some Razorpay order, not that it was *this* order's. Without the binding
 * below, one legitimately-paid ₹100 order's callback could be replayed against
 * a ₹5,000 pending order and settle it. `verifyRazorpayPayment` re-reads the
 * Razorpay order and requires the `shopkaOrderId`/`userId` notes we stamped in
 * create-order-for-existing, plus the exact amount, to match.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Login required." }, { status: 401 });
  }

  const { id } = await params;
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
    await request.json() as {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    };

  const order = await prisma.order.findUnique({
    where: { id },
    include: { payment: true, items: true, address: true },
  });

  if (!order || order.userId !== session.userId) {
    return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
  }

  if (order.paymentStatus !== "PENDING") {
    return NextResponse.json({ success: false, message: "Order is already paid." }, { status: 400 });
  }

  // Same figure create-order-for-existing quoted Razorpay for this order.
  const expectedPaise = Math.round(
    getPrepaidAmount(Number(order.totalAmount)) * 100
  );

  try {
    await verifyRazorpayPayment(
      { razorpayOrderId, razorpayPaymentId, razorpaySignature },
      { userId: session.userId, amountPaise: expectedPaise, dbOrderId: id }
    );
  } catch (error) {
    if (error instanceof PaymentVerificationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }

    console.error("PAY NOW VERIFY ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Unable to verify this payment." },
      { status: 500 }
    );
  }

  // Mark payment then order as paid, in that order, so the row we return already
  // carries the settled payment rather than the PENDING one it replaced.
  const updated = await prisma.$transaction(async (tx) => {
    if (order.payment) {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: {
          status: "PAID",
          method: "RAZORPAY",
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          paidAt: new Date(),
        },
      });
    } else {
      await tx.payment.create({
        data: {
          orderId: id,
          method: "RAZORPAY",
          status: "PAID",
          amount: order.totalAmount,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          paidAt: new Date(),
        },
      });
    }

    return tx.order.update({
      where: { id },
      data: {
        paymentStatus: "PAID",
        orderStatus: "CONFIRMED",
      },
      include: { payment: true, items: true, address: true },
    });
  });

  return NextResponse.json({ success: true, data: updated });
}
