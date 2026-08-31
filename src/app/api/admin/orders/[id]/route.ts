import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  OrderStatus,
  ShipmentStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

async function requireAdmin() {
  const session = await getSession();

  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return null;
  }

  return session;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Not authorized." },
      { status: 403 }
    );
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payment: true,
      address: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          profileImage: true,
          createdAt: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json(
      { success: false, message: "Order not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: order });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Not authorized." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await request.json();
  const { orderStatus, shipmentStatus, trackingNumber, trackingUrl, shippingCharge } =
    body as {
      orderStatus?: OrderStatus;
      shipmentStatus?: ShipmentStatus;
      trackingNumber?: string;
      trackingUrl?: string;
      shippingCharge?: number;
    };

  const existing = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payment: true },
  });

  if (!existing) {
    return NextResponse.json(
      { success: false, message: "Order not found." },
      { status: 404 }
    );
  }

  // Per-order delivery override. Refused once the money is in: editing a paid
  // order's total would leave the record disagreeing with what the gateway
  // actually captured. COD / PENDING orders are fair game.
  const isChargingDelivery = shippingCharge !== undefined;

  if (isChargingDelivery) {
    if (
      typeof shippingCharge !== "number" ||
      !Number.isFinite(shippingCharge) ||
      shippingCharge < 0
    ) {
      return NextResponse.json(
        { success: false, message: "Delivery charge must be 0 or more." },
        { status: 400 }
      );
    }

    if (
      existing.paymentStatus === "PAID" ||
      existing.payment?.status === "PAID"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This order is already paid — the delivery charge can't be changed. Issue a refund or a separate adjustment instead.",
        },
        { status: 409 }
      );
    }
  }

  const newShipping = isChargingDelivery
    ? new Prisma.Decimal(Number(shippingCharge).toFixed(2))
    : null;

  // Adjust by delta rather than re-deriving `subtotal + shipping - discount`:
  // `discountAmount` bundles MRP savings that were never part of `subtotal`, so
  // the formula wouldn't reproduce the stored total.
  const newTotal = newShipping
    ? Prisma.Decimal.max(
        0,
        new Prisma.Decimal(existing.totalAmount)
          .minus(existing.shippingCharge)
          .plus(newShipping)
      )
    : null;

  const isDeliveryOnlyChange =
    !!newShipping && !orderStatus && !shipmentStatus;

  const RESTOCK_STATUSES: OrderStatus[] = ["CANCELLED", "RETURNED"];
  const wasAlreadyRestocked = RESTOCK_STATUSES.includes(existing.orderStatus);
  const isNewlyRestockable =
    !!orderStatus &&
    RESTOCK_STATUSES.includes(orderStatus) &&
    !wasAlreadyRestocked;

  const isNewlyCancelled =
    orderStatus === "CANCELLED" && existing.orderStatus !== "CANCELLED";
  const isNewlyDelivered =
    orderStatus === "DELIVERED" && existing.orderStatus !== "DELIVERED";
  const shouldMarkRefunded =
    (orderStatus === "CANCELLED" || orderStatus === "REFUNDED") &&
    existing.payment?.status === "PAID";

  const updated = await prisma.$transaction(async (tx) => {
    // Cancelling or returning restocks inventory. If it was already paid, we
    // also mark the payment refunded (the actual refund still needs to be
    // issued via your payment gateway — this just reflects it in the record).
    if (isNewlyRestockable) {
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    if (shouldMarkRefunded) {
      await tx.payment.update({
        where: { orderId: id },
        data: { status: "REFUNDED" as PaymentStatus },
      });
    }

    const order = await tx.order.update({
      where: { id },
      data: {
        ...(orderStatus ? { orderStatus } : {}),
        ...(shipmentStatus ? { shipmentStatus } : {}),
        ...(trackingNumber !== undefined ? { trackingNumber } : {}),
        ...(trackingUrl !== undefined ? { trackingUrl } : {}),
        ...(isNewlyDelivered && !existing.deliveredAt
          ? { deliveredAt: new Date() }
          : {}),
        ...(shouldMarkRefunded ? { paymentStatus: "REFUNDED" as PaymentStatus } : {}),
        ...(newShipping && newTotal
          ? { shippingCharge: newShipping, totalAmount: newTotal }
          : {}),
      },
      include: { items: true, payment: true, address: true, user: true },
    });

    await tx.notification.create({
      data: {
        userId: existing.userId,
        type: "PUSH",
        title: isNewlyCancelled
          ? "Order Cancelled"
          : isDeliveryOnlyChange
            ? "Delivery Charge Updated"
            : "Order Update",
        message: isNewlyCancelled
          ? `Your order ${existing.invoiceNumber} has been cancelled.`
          : isDeliveryOnlyChange
            ? `${
                newShipping!.isZero()
                  ? `Delivery on your order ${existing.invoiceNumber} is now free`
                  : `Delivery on your order ${existing.invoiceNumber} is now ₹${newShipping!.toFixed(2)}`
              }. Your total is ₹${newTotal!.toFixed(2)}.`
            : `Your order ${existing.invoiceNumber} is now ${
                orderStatus ?? existing.orderStatus
              }.`,
        status: "SENT",
        sentAt: new Date(),
        metadata: { orderId: id },
      },
    });

    return order;
  });

  return NextResponse.json({ success: true, data: updated });
}