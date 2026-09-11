import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CreateProductDto } from "@/features/products/dto/create-product.dto";
import productService from "@/features/products/service/product.service";

interface ImportRow {
  name: string;
  description: string;
  sku: string;
  category: string;
  subCategory?: string;
  mrp: string | number;
  sellingPrice: string | number;
  stock?: string | number;
  imageUrl?: string;
  isPublished?: string | boolean;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return NextResponse.json(
      { success: false, message: "Not authorized." },
      { status: 403 }
    );
  }

  const { rows } = (await request.json()) as { rows: ImportRow[] };

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { success: false, message: "No rows to import." },
      { status: 400 }
    );
  }

  // Fetch all lookup data upfront
  const [categories, subCategories, sellers, brands] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.subCategory.findMany({ select: { id: true, name: true, categoryId: true } }),
    prisma.seller.findMany({ select: { id: true, businessName: true } }),
    prisma.brand.findMany({ select: { id: true, name: true } }),
  ]);

  const categoryByName = new Map(
    categories.map((c) => [c.name.trim().toLowerCase(), c.id])
  );
  const subCategoryByName = new Map(
    subCategories.map((s) => [s.name.trim().toLowerCase(), { id: s.id, categoryId: s.categoryId }])
  );

  // Default seller & brand (fallback to first available)
  const defaultSellerId = sellers[0]?.id ?? undefined;
  const defaultBrandId = brands.find(
    (b) => b.name.toLowerCase() === "generic"
  )?.id ?? brands[0]?.id ?? undefined;

  const results: { row: number; name: string; success: boolean; message: string }[] =
    [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = i + 2;

    const categoryName = String(raw.category ?? "").trim().toLowerCase();
    const categoryId = categoryByName.get(categoryName);

    if (!categoryId) {
      results.push({
        row: rowNum,
        name: raw.name ?? "",
        success: false,
        message: `Unknown category "${raw.category}". Available: ${categories.map((c) => c.name).join(", ")}`,
      });
      continue;
    }

    // Optional subCategory lookup
    let subCategoryId: string | undefined = undefined;
    if (raw.subCategory) {
      const subCategoryName = String(raw.subCategory).trim().toLowerCase();
      const found = subCategoryByName.get(subCategoryName);
      if (found && found.categoryId === categoryId) {
        subCategoryId = found.id;
      }
    }

    const baseSlug = slugify(raw.name ?? "");
    // Make slug unique by appending SKU suffix
    const slug = `${baseSlug}-${String(raw.sku ?? "").toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

    const candidate = {
      name: raw.name,
      slug,
      description: raw.description,
      sku: raw.sku,
      categoryId,
      subCategoryId,
      sellerId: defaultSellerId,
      brandId: defaultBrandId,
      mrp: Number(raw.mrp),
      sellingPrice: Number(raw.sellingPrice),
      stock: raw.stock ? Number(raw.stock) : 0,
      isPublished:
        String(raw.isPublished ?? "").toUpperCase() === "TRUE" ||
        raw.isPublished === true,
      images: raw.imageUrl
        ? [{ url: raw.imageUrl, isThumbnail: true, displayOrder: 0 }]
        : [],
    };

    const parsed = CreateProductDto.safeParse(candidate);

    if (!parsed.success) {
      results.push({
        row: rowNum,
        name: raw.name ?? "",
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid data",
      });
      continue;
    }

    try {
      await productService.createProduct(parsed.data);

      results.push({
        row: rowNum,
        name: parsed.data.name,
        success: true,
        message: "Created",
      });
    } catch (error) {
      results.push({
        row: rowNum,
        name: raw.name ?? "",
        success: false,
        message: error instanceof Error ? error.message : "Unable to create",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;

  return NextResponse.json({
    success: true,
    message: `${successCount} of ${rows.length} products created.`,
    data: results,
  });
}
