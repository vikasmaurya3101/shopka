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

// Deduped per-request: generateMetadata() and the page body both need the
// same product, and this ensures we only hit the DB once for it.
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

  if (!product) {
    notFound();
  }

  const [reviewsPage, reviewSummary] = await Promise.all([
    productService.getProductReviews(product.id, 1, 5),
    productService.getReviewSummary(product.id),
  ]);

  const initialReviews = serializeData(reviewsPage.data);

  return (
    // Extra bottom padding on mobile keeps content clear of the fixed
    // Add to Cart / Buy Now bar rendered by ProductActions; sm:p-6 resets it
    // back to normal once that bar is hidden at the sm breakpoint.
    <main className="min-h-screen bg-white p-4 pb-28 sm:p-6">
      <TrackProductView productId={product.id} />

      <div className="mx-auto max-w-6xl">
        <Breadcrumbs
          className="mb-4"
          items={[
            { label: "Home", href: "/" },
            { label: product.category.name, href: `/category/${product.category.slug}` },
            { label: product.name },
          ]}
        />

        <div className="grid gap-8 rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8 lg:grid-cols-2">
          <ProductImageGallery
            images={product.images}
            productName={product.name}
          />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {product.brand && (
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                  {product.brand.name}
                </p>
              )}
              {product.isBestSeller && (
                <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold text-gold-dark">
                  🏆 Bestseller
                </span>
              )}
              {product.isTrending && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand">
                  🔥 Trending
                </span>
              )}
              {product.isNewArrival && (
                <span className="rounded-full bg-success-light px-2.5 py-0.5 text-[11px] font-bold text-success">
                  ✨ New Arrival
                </span>
              )}
            </div>

            <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
              {product.name}
            </h1>

            <div className="mt-3">
              <ProductRating
                rating={product.avgRating}
                totalReviews={product.totalReviews}
              />
            </div>

            <div className="mt-4">
              <ProductPrice
                mrp={product.mrp}
                sellingPrice={product.sellingPrice}
                discountPercent={product.discountPercent}
                size="lg"
              />
            </div>

            {product.shortDescription && (
              <p className="mt-4 text-gray-600">
                {product.shortDescription}
              </p>
            )}

            <p className="mt-4 text-sm">
              {product.stock === 0 ? (
                <span className="font-semibold text-red-600">Out of stock</span>
              ) : product.stock <= 10 ? (
                <span className="inline-flex animate-pulse items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 font-bold text-red-600">
                  ⚠ Only {product.stock} left in stock — order soon!
                </span>
              ) : (
                <span className="text-gray-500">{product.stock} in stock</span>
              )}
            </p>

            <DeliveryInfo
              estimatedDeliveryLabel={getEstimatedDelivery()}
              codAllowed={product.codAllowed}
              freeDelivery={Number(product.shippingCharge) === 0}
            />

            {product.seller?.businessName && (
              <p className="mt-2 text-xs text-gray-400">
                Sold by: {product.seller.businessName}
              </p>
            )}

            <div className="mt-6">
              <ProductActions
                productId={product.id}
                productName={product.name}
                productSlug={product.slug}
                inStock={product.stock > 0}
              />
            </div>

            <div className="mt-8 border-t pt-6">
              <h2 className="mb-2 font-semibold text-gray-800">
                Product Description
              </h2>
              <p className="whitespace-pre-line text-sm text-gray-600">
                {product.description}
              </p>
            </div>
          </div>
        </div>

        <ProductReviews
          productId={product.id}
          initialReviews={initialReviews}
          initialSummary={reviewSummary}
          initialTotalPages={reviewsPage.totalPages}
        />

        <SimilarProducts products={product.relatedProducts ?? []} />
      </div>
    </main>
  );
}
