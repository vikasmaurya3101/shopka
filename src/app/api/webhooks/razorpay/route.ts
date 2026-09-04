import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Razorpay webhook — handles payment.captured and payment.failed events.
 *
 * Set up in your Razorpay dashboard:
 *   Webhook URL : https://shopka.in/api/webhooks/razorpay
 *   Secret      : RAZORPAY_WEBHOOK_SECRET (add to .env)
 *   Events      : payment.captured, payment.failed
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    // Deliberately a 5xx. Answering 200 told Razorpay the event was handled, so
    // it stopped retrying and every payment.captured was silently dropped —
    // orders stayed PENDING with the customer's money already taken, and nothing
    // surfaced the misconfiguration. A 500 makes Razorpay retry (its dashboard
    // then flags the failures) and the events survive until the secret is set.
    console.error(
      "[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not set — rejecting so Razorpay retries"
    );

    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  // Length-checked constant-time compare; the header is attacker-controlled.
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");

  if (
    expectedBuf.length !== signatureBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, signatureBuf)
  ) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  let event: {
    event: string;
    payload: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number;
          status?: string;
        };
      };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const razorpayPaymentId = event.payload?.payment?.entity?.id;
  const razorpayOrderId = event.payload?.payment?.entity?.order_id;

  if (!razorpayOrderId) {
    return NextResponse.json({ received: true });
  }

  if (event.event === "payment.captured") {
    // Find the DB order linked to this Razorpay order ID
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId },
      include: { order: true },
    });

    if (!payment) {
      // Payment record may not exist yet (create-order-for-existing hasn't
      // been completed by the browser). Create/update it now.
      const order = await prisma.order.findFirst({
        where: {
          payment: { razorpayOrderId },
        },
        include: { payment: true },
      });

      if (order && order.paymentStatus !== "PAID") {
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: { paymentStatus: "PAID", orderStatus: "CONFIRMED" },
          });

          if (order.payment) {
            await tx.payment.update({
              where: { id: order.payment!.id },
              data: {
                status: "PAID",
                razorpayPaymentId: razorpayPaymentId ?? undefined,
                paidAt: new Date(),
              },
            });
          }
        });
      }

      return NextResponse.json({ received: true });
    }

    // Already have the payment record
    if (payment.order.paymentStatus !== "PAID") {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: "PAID", orderStatus: "CONFIRMED" },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "PAID",
            razorpayPaymentId: razorpayPaymentId ?? undefined,
            paidAt: new Date(),
          },
        });
      });
    }
  } else if (event.event === "payment.failed") {
    // Optionally mark payment as failed — order stays PENDING so user can retry
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId },
    });
    if (payment && payment.status === "PENDING") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
    }
  }

  return NextResponse.json({ received: true });
}
