import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import checkoutService from "@/features/checkout/service/checkout.service";
import { CheckoutDto } from "@/features/checkout/dto/checkout.dto";
import { PaymentVerificationError } from "@/lib/razorpay-verify";

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Login required." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const data = CheckoutDto.parse(body);

    const order = await checkoutService.placeOrder(
      session.userId,
      data.addressId,
      data.paymentMethod,
      {
        razorpayOrderId: data.razorpayOrderId,
        razorpayPaymentId: data.razorpayPaymentId,
        razorpaySignature: data.razorpaySignature,
      },
      {
        city: request.headers.get("x-vercel-ip-city") ?? null,
        region: request.headers.get("x-vercel-ip-country-region") ?? null,
        country: request.headers.get("x-vercel-ip-country") ?? null,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      }
    );

    return NextResponse.json({
      success: true,
      message: "Order placed successfully.",
      data: order,
    });
  } catch (error) {
    console.error(error);

    const status =
      error instanceof PaymentVerificationError ? error.status : 400;

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to place order.",
      },
      { status }
    );
  }
}