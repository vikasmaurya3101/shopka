import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { notifyAdminsOfNewOrder } from "@/lib/notify";
import { calculateOrderTotals } from "@/lib/utils/order-total";

interface RazorpayPaymentDetails {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

/**
 * Verifies the HMAC-SHA256 signature Razorpay returns after a successful
 * payment, proving the payment really happened and wasn't tampered with.
 * https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/build-integration/#step-5-verify-payment-signature
 */
function verifyRazorpaySignature({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: RazorpayPaymentDetails) {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  if (!secret) {
    throw new Error("Razorpay isn't configured on the server.");
  }

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new Error("Missing payment verification details.");
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expected !== razorpaySignature) {
    throw new Error("Payment verification failed. Please contact support.");
  }
}

function generateInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  // SHK = Shopka. Orders placed before the rename still carry the old "BM-"
  // prefix; those are historical records and are left untouched.
  return `SHK-${y}-${rand}`;
}

export class CheckoutService {
  async placeOrder(
    userId: string,
    addressId: string,
    paymentMethod: "COD" | "RAZORPAY" | "UPI",
    razorpayDetails?: RazorpayPaymentDetails
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

    // Shipping/prepaid maths live in calculateOrderTotals() so the amount we
    // charge here is identical to what the cart and checkout summaries showed
    // and to the Razorpay order created in /api/payments/razorpay/create-order.
    const totals = calculateOrderTotals({
      subtotal: subtotal.toNumber(),
      allItemsFreeShipping: cart.items.every((item) => item.product.freeShipping),
      isPrepaid: paymentMethod === "RAZORPAY",
    });

    const shippingCharge = new Prisma.Decimal(totals.shipping);
    const taxTotal = new Prisma.Decimal(0);
    const totalAmount = new Prisma.Decimal(totals.payable);
    // Savings the customer made off MRP — product-level discount plus the
    // prepaid discount. Shipping is a charge, not a discount, so it stays out.
    const discountAmount = mrpTotal
      .sub(subtotal)
      .add(totals.prepaidDiscount);


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
        include: { items: true, payment: true, address: true },
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

    return order;
  }
}

export const checkoutService = new CheckoutService();
export default checkoutService;
