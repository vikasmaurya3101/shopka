import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import productService from "@/features/products/service/product.service";

/**
 * Seller/admin inventory management: GET summary + low/out-of-stock
 * lists, PATCH to update a single product's stock count.
 */
export async function GET() {
  const session = await getSession();

  if (!session || (session.role !== "SELLER" && session.role !== "ADMIN")) {
    return NextResponse.json(
      { success: false, message: "Not authorized." },
      { status: 403 }
    );
  }

  try {
    const [summary, lowStock, outOfStock] = await Promise.all([
      productService.getInventorySummary(),
      productService.getLowStockProducts(),
      productService.getOutOfStockProducts(),
    ]);

    return NextResponse.json({
      success: true,
      data: { summary, lowStock, outOfStock },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, message: "Unable to load inventory data." },
      { status: 500 }
    );
  }
}

const UpdateStockDto = z.object({
  productId: z.string().min(1),
  stock: z.coerce.number().int().min(0),
});

export async function PATCH(request: NextRequest) {
  const session = await getSession();

  if (!session || (session.role !== "SELLER" && session.role !== "ADMIN")) {
    return NextResponse.json(
      { success: false, message: "Not authorized." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const data = UpdateStockDto.parse(body);

    const product = await productService.updateStock(
      data.productId,
      data.stock
    );

    return NextResponse.json({
      success: true,
      message: "Stock updated.",
      data: product,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unable to update stock.",
      },
      { status: 400 }
    );
  }
}
