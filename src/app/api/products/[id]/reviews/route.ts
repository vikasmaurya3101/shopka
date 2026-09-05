import { NextRequest, NextResponse } from "next/server";
import productService from "@/features/products/service/product.service";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") ?? "1") || 1;
    const limit = Number(searchParams.get("limit") ?? "5") || 5;
    const filter = searchParams.get("filter") ?? "all"; // all | photos | 5 | 4 | 3 | 2 | 1

    const [reviews, summary] = await Promise.all([
      productService.getProductReviews(id, page, limit, filter),
      productService.getReviewSummary(id),
    ]);

    return NextResponse.json({
      success: true,
      data: { ...reviews, summary },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to load reviews." },
      { status: 400 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Login required." }, { status: 401 });
  }

  try {
    const { id: productId } = await params;
    const body = await request.json();
    const { rating, title, comment, mediaItems } = body as {
      rating: number;
      title?: string;
      comment?: string;
      mediaItems?: { url: string; publicId?: string; type: "IMAGE" | "VIDEO" }[];
    };

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, message: "Rating must be 1–5." }, { status: 400 });
    }

    // Check if user already reviewed this product
    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId: session.userId, productId } },
    });
    if (existing) {
      return NextResponse.json({ success: false, message: "You have already reviewed this product." }, { status: 409 });
    }

    // Check if verified purchase
    const order = await prisma.order.findFirst({
      where: {
        userId: session.userId,
        orderStatus: "DELIVERED",
        items: { some: { productId } },
      },
    });

    const review = await prisma.review.create({
      data: {
        userId: session.userId,
        productId,
        rating,
        title: title?.trim() || null,
        comment: comment?.trim() || null,
        isVerifiedPurchase: !!order,
        ...(mediaItems && mediaItems.length > 0
          ? {
              media: {
                create: mediaItems.map((m) => ({
                  url: m.url,
                  publicId: m.publicId ?? null,
                  type: m.type,
                })),
              },
            }
          : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, profileImage: true } },
        media: true,
      },
    });

    // Refresh product rating
    await productService.refreshRating(productId);

    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to submit review." },
      { status: 500 }
    );
  }
}
