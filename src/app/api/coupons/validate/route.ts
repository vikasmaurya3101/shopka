import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Validates a coupon code against the current cart subtotal and returns the discount it grants. */
export async function POST(request: NextRequest) {
  try {
    const { code, subtotal } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, message: "Enter a coupon code." },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    const now = new Date();

    if (
      !coupon ||
      !coupon.isActive ||
      coupon.validFrom > now ||
      coupon.validUntil < now
    ) {
      return NextResponse.json(
        { success: false, message: "This coupon is invalid or has expired." },
        { status: 400 }
      );
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json(
        { success: false, message: "This coupon has reached its usage limit." },
        { status: 400 }
      );
    }

    const orderAmount = Number(subtotal) || 0;
    const minOrderAmount = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;

    if (orderAmount < minOrderAmount) {
      return NextResponse.json(
        {
          success: false,
          message: `Add items worth ₹${minOrderAmount - orderAmount} more to use this coupon.`,
        },
        { status: 400 }
      );
    }

    let discountAmount = 0;

    if (coupon.type === "FLAT") {
      discountAmount = Number(coupon.discountValue);
    } else if (coupon.type === "PERCENTAGE") {
      discountAmount = (orderAmount * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
      }
    }
    // FREE_SHIPPING coupons grant 0 cart-level discount here — the cart page
    // waives the shipping fee itself when it sees this coupon type.

    discountAmount = Math.min(Math.round(discountAmount), orderAmount);

    return NextResponse.json({
      success: true,
      data: {
        code: coupon.code,
        type: coupon.type,
        discountAmount,
        description: coupon.description,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Unable to validate coupon." },
      { status: 500 }
    );
  }
}
