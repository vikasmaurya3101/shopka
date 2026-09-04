import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { notifyAdminsOfNewOrder } from "@/lib/notify";
import { sendOrderNotification } from "@/lib/orderEmail";
import { calculateOrderTotals } from "@/lib/utils/order-total";
import { toShippableLines } from "@/lib/utils/shipping";
import {
  RazorpayPaymentDetails,
  verifyRazorpayPayment,
  verifyRazorpaySignature,
} from "@/lib/razorpay-verify";

function generateInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SHK-${y}-${rand}`;
}

export class CheckoutService {
  async placeOrder(
    userId: string,
    addressId: string,
    paymentMethod: "COD" | "RAZORPAY" | "UPI",
    razorpayDetails?: RazorpayPaymentDetails,
    geo?: {
      city?: string | null;
      region?: string | null;
      country?: string | null;
      ip?: string | null;
    }
  ) {
    if (paymentMethod === "RAZORPAY") {
      verifyRazorpaySignature(razorpayDetails ?? {});
    }

    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== userId) {
      throw new Error("Delivery address not found.");
    }

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { displayOrder: "asc" } },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error("Your cart is empty.");
    }

    for (const item of cart.items) {
      if (item.quantity > item.product.stock) {
        throw new Error(
          `${item.product.name} only has ${item.product.stock} unit(s) left.`
        );
      }
    }

    let subtotal = new Prisma.Decimal(0);
    let mrpTotal = new Prisma.Decimal(0);

    const orderItemsData = cart.items.map((item) => {
      const sellingPrice = new Prisma.Decimal(item.product.sellingPrice);
      const mrp = new Prisma.Decimal(item.product.mrp);
      const lineTotal = sellingPrice.mul(item.quantity);

      subtotal = subtotal.add(lineTotal);
      mrpTotal = mrpTotal.add(mrp.mul(item.quantity));

      return {
        productId: item.productId,
        productName: item.product.name,
        productImage:
          item.product.images.find((img) => img.isThumbnail)?.url ??
          item.product.images[0]?.url ??
          null,
        sku: item.product.sku,
        quantity: item.quantity,
        mrp: item.product.mrp,
        sellingPrice: item.product.sellingPrice,
        taxAmount: new Prisma.Decimal(0),
        totalAmount: lineTotal,
      };
    });

    const totals = calculateOrderTotals({
      subtotal: subtotal.toNumber(),
      lines: toShippableLines(cart.items),
      isPrepaid: paymentMethod === "RAZORPAY",
    });

    const shippingCharge = new Prisma.Decimal(totals.shipping);
    const taxTotal = new Prisma.Decimal(0);
    const totalAmount = new Prisma.Decimal(totals.payable);
    const discountAmount = mrpTotal
      .sub(subtotal)
      .add(totals.prepaidDiscount);

    if (paymentMethod === "RAZORPAY") {
      await verifyRazorpayPayment(razorpayDetails ?? {}, {
        userId,
        amountPaise: Math.round(totals.payable * 100),
      });
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          userId,
          addressId,
          subtotal,
          discountAmount,
          shippingCharge,
          taxAmount: taxTotal,
          totalAmount,
          orderStatus: paymentMethod === "RAZORPAY" ? "CONFIRMED" : "PENDING",
          paymentStatus: paymentMethod === "RAZORPAY" ? "PAID" : "PENDING",
          shipmentStatus: "PENDING",
          items: { create: orderItemsData },
          payment: {
            create: {
              method: paymentMethod,
              status: paymentMethod === "RAZORPAY" ? "PAID" : "PENDING",
              amount: totalAmount,
              ...(paymentMethod === "RAZORPAY"
                ? {
                    razorpayOrderId: razorpayDetails?.razorpayOrderId,
                    razorpayPaymentId: razorpayDetails?.razorpayPaymentId,
                    razorpaySignature: razorpayDetails?.razorpaySignature,
                    paidAt: new Date(),
                  }
                : {}),
            },
          },
        },
        include: { items: true, payment: true, address: true, user: true },
      });

      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      await notifyAdminsOfNewOrder(tx, created);

      return created;
    });

    void sendOrderNotification({
      id: order.id,
      invoiceNumber: order.invoiceNumber,
      placedAt: order.placedAt,
      subtotal: order.subtotal.toString(),
      shippingCharge: order.shippingCharge.toString(),
      discountAmount: order.discountAmount.toString(),
      totalAmount: order.totalAmount.toString(),
      paymentStatus: order.paymentStatus,
      paymentMethod: order.payment?.method ?? paymentMethod,
      items: order.items.map((item) => ({
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice.toString(),
        totalAmount: item.totalAmount.toString(),
      })),
      address: order.address,
      customer: {
        firstName: order.user.firstName,
        lastName: order.user.lastName,
        email: order.user.email,
        phone: order.user.phone,
      },
      geo,
    });

    return order;
  }
}

export const checkoutService = new CheckoutService();
export default checkoutService;
