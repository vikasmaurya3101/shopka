import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import productService from "@/features/products/service/product.service";
import { serializeData } from "@/lib/serialize";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import ProductPrice from "@/components/product/ProductPrice";
import ProductRating from "@/components/product/ProductRating";
import SimilarProducts from "@/components/product/SimilarProducts";
import ProductActions from "@/components/product/ProductActions";
import DeliveryInfo from "@/components/product/DeliveryInfo";
import ProductReviews from "@/components/product/ProductReviews";
import TrackProductView from "@/components/product/TrackProductView";
import Breadcrumbs from "@/components/shared/Breadcrumbs";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

const getProduct = cache(async (slug: string) => {
  const raw = await productService.getProductBySlug(slug);
  return serializeData(raw);
});

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await getProduct(slug);
    if (!product) return { title: "Product Not Found" };

    const title = product.seoTitle || product.name;
    const description =
      product.seoDescription ||
      product.shortDescription ||
      `Buy ${product.name} online at Shopka — best price, fast delivery across India.`;
    const image = product.images?.[0]?.url;

    return {
      title,
      description,
      alternates: { canonical: `/product/${product.slug}` },
      openGraph: {
        title,
        description,
        images: image ? [{ url: image, width: 1200, height: 1200 }] : undefined,
        type: "website",
      },
    };
  } catch {
    return { title: "Product Not Found" };
  }
}

function getEstimatedDelivery() {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  let product;
  try {
    product = await getProduct(slug);
  } catch {
    notFound();
  }

  if (!product) notFound();

  const [reviewsPage, reviewSummary] = await Promise.all([
    productService.getProductReviews(product.id, 1, 5),
    productService.getReviewSummary(product.id),
  ]);

  const initialReviews = serializeData(reviewsPage.data);

  return (
    <main className="min-h-screen bg-gray-50 pb-28 sm:pb-6">
      <TrackProductView productId={product.id} />

      {/* ── Breadcrumb ── */}
      <div className="bg-white px-4 py-2.5 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: product.category.name, href: `/category/${product.category.slug}` },
              { label: product.name },
            ]}
          />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
        {/* ── Main card ── */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="lg:grid lg:grid-cols-2 lg:gap-0">

            {/* Left — image gallery */}
            <div className="p-4 sm:p-6 lg:border-r lg:border-gray-100">
              <ProductImageGallery
                images={product.images}
                productName={product.name}
              />
            </div>

            {/* Right — product info */}
            <div className="flex flex-col gap-4 px-4 pb-6 pt-0 sm:px-6 sm:pt-2 lg:pt-6">

              {/* Brand + badges */}
              <div className="flex flex-wrap items-center gap-2">
                {product.brand && (
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    {product.brand.name}
                  </span>
                )}
                {product.isBestSeller && (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-600">
                    🏆 Bestseller
                  </span>
                )}
                {product.isTrending && (
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand">
                    🔥 Trending
                  </span>
                )}
                {product.isNewArrival && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
                    ✨ New Arrival
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-xl font-bold leading-snug text-gray-900 sm:text-2xl lg:text-3xl">
                {product.name}
              </h1>

              {/* Rating */}
              <ProductRating
                rating={product.avgRating}
                totalReviews={product.totalReviews}
              />

              {/* Price */}
              <ProductPrice
                mrp={product.mrp}
                sellingPrice={product.sellingPrice}
                discountPercent={product.discountPercent}
                size="lg"
              />

              {/* Short description */}
              {product.shortDescription && (
                <p className="text-sm leading-relaxed text-gray-600">
                  {product.shortDescription}
                </p>
              )}

              {/* Stock */}
              <p className="text-sm">
                {product.stock === 0 ? (
                  <span className="font-semibold text-red-600">Out of stock</span>
                ) : product.stock <= 10 ? (
                  <span className="inline-flex animate-pulse items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-bold text-red-600">
                    ⚠ Only {product.stock} left — order soon!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-gray-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {product.stock} in stock
                  </span>
                )}
              </p>

              {/* Delivery info */}
              <DeliveryInfo
                estimatedDeliveryLabel={getEstimatedDelivery()}
                codAllowed={product.codAllowed}
                freeDelivery={Number(product.shippingCharge) === 0}
              />

              {/* Seller */}
              {product.seller?.businessName && (
                <p className="text-xs text-gray-400">
                  Sold by:{" "}
                  <span className="font-medium text-gray-600">
                    {product.seller.businessName}
                  </span>
                </p>
              )}

              {/* Actions — hidden on mobile (sticky bar handles it) */}
              <div className="hidden sm:block">
                <ProductActions
                  productId={product.id}
                  productName={product.name}
                  productSlug={product.slug}
                  inStock={product.stock > 0}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-gray-100 px-4 py-5 sm:px-6">
            <h2 className="mb-3 text-base font-bold text-gray-800">
              Product Description
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
              {product.description}
            </p>
          </div>
        </div>

        {/* Reviews & Similar */}
        <div className="mt-4 sm:mt-6">
          <ProductReviews
            productId={product.id}
            initialReviews={initialReviews}
            initialSummary={reviewSummary}
            initialTotalPages={reviewsPage.totalPages}
          />
        </div>

        <div className="mt-4 sm:mt-6">
          <SimilarProducts products={product.relatedProducts ?? []} />
        </div>
      </div>

      {/* Sticky bottom bar — mobile only */}
      <div className="fixed inset-x-0 bottom-0 z-50 sm:hidden">
        <div
          className="border-t border-gray-100 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.10)] backdrop-blur-md"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <ProductActions
            productId={product.id}
            productName={product.name}
            productSlug={product.slug}
            inStock={product.stock > 0}
          />
        </div>
      </div>
    </main>
  );
}
