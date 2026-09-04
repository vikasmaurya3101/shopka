import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sendCancelNotification } from "@/lib/orderEmail";

const CANCELLABLE_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Login required." },
      { status: 401 }
    );
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { reason } = body as { reason?: string };

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payment: true },
  });

  if (!order || order.userId !== session.userId) {
    return NextResponse.json(
      { success: false, message: "Order not found." },
      { status: 404 }
    );
  }

  if (!CANCELLABLE_STATUSES.includes(order.orderStatus)) {
    return NextResponse.json(
      {
        success: false,
        message:
          order.orderStatus === "SHIPPED" ||
          order.orderStatus === "OUT_FOR_DELIVERY"
            ? "This order has already shipped and can't be cancelled. You can request a return once it's delivered."
            : "This order can no longer be cancelled.",
      },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    const shouldRefund = order.payment?.status === "PAID";

    if (shouldRefund) {
      await tx.payment.update({
        where: { orderId: id },
        data: { status: "REFUNDED" },
      });
    }

    const result = await tx.order.update({
      where: { id },
      data: {
        orderStatus: "CANCELLED",
        cancelReason: reason ?? null,
        ...(shouldRefund ? { paymentStatus: "REFUNDED" } : {}),
      },
      include: { items: true, payment: true, address: true },
    });

    const admins = await tx.user.findMany({
      where: { role: { in: ["ADMIN", "SELLER"] }, isActive: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "PUSH" as const,
          title: "Order Cancelled by Customer",
          message: `Order ${order.invoiceNumber} was cancelled by the customer.${
            reason ? ` Reason: ${reason}` : ""
          }`,
          status: "SENT" as const,
          sentAt: new Date(),
          metadata: { orderId: id },
        })),
      });
    }

    return result;
  });

  // Cancel email — un-awaited, order already cancelled hai
  void sendCancelNotification({
    id: updated.id,
    invoiceNumber: order.invoiceNumber,
    cancelledAt: new Date(),
    totalAmount: updated.totalAmount.toString(),
    paymentStatus: updated.paymentStatus,
    cancelReason: reason ?? null,
    items: updated.items.map((item) => ({
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      sellingPrice: item.sellingPrice.toString(),
      totalAmount: item.totalAmount.toString(),
    })),
    address: updated.address,
    customer: {
      firstName: null,
      lastName: null,
      email: null,
      phone: updated.address.phone,
    },
    geo: {
      city: request.headers.get("x-vercel-ip-city") ?? null,
      region: request.headers.get("x-vercel-ip-country-region") ?? null,
      country: request.headers.get("x-vercel-ip-country") ?? null,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}