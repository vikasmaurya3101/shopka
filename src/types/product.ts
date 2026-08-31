/**
 * Client-safe product types matching the shape of JSON returned by the
 * /api/products/* routes. Decimal fields (Prisma) serialize as strings
 * over the wire, so they're typed as `number | string` and should be
 * formatted with src/lib/utils/currency.ts helpers, which accept both.
 */

export interface ProductImageData {
  id: string;
  url: string;
  altText: string | null;
  isThumbnail: boolean;
  displayOrder: number;
}

export interface BrandData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

export interface SubCategoryData {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
}

export interface SellerData {
  id: string;
  businessName: string;
  isApproved: boolean;
}

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  sku: string;
  mrp: number | string;
  sellingPrice: number | string;
  discountPercent: number | string;
  stock: number;
  isFeatured: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  /** Per-product delivery charge; 0 means free delivery (the default). */
  shippingCharge: number | string;
  codAllowed: boolean;
  avgRating: number | string;
  totalReviews: number;
  images: ProductImageData[];
  brand: BrandData | null;
  category: CategoryData;
  subCategory: SubCategoryData | null;
  seller: SellerData | null;
}

export interface ProductDetailsData extends ProductCardData {
  description: string;
  minOrderQuantity: number;
  taxPercent: number | string;
  relatedProducts?: ProductCardData[];
}

/**
 * Lightweight product shape returned by GET /api/products/suggestions, which
 * backs the navbar search-autocomplete dropdown. productRepository.suggest()
 * selects only these columns plus one image — no long-form `description` and
 * no brand/category/subCategory relations — because the endpoint is hit on
 * every (debounced) keystroke. Intentionally narrower than ProductCardData.
 */
export interface ProductSearchResult {
  id: string;
  name: string;
  slug: string;
  mrp: number | string;
  sellingPrice: number | string;
  stock: number;
  images: ProductImageData[];
}

export type ProductSort =
  | "latest"
  | "oldest"
  | "price_low"
  | "price_high"
  | "rating"
  | "discount"
  | "popular";

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  subCategoryId?: string;
  brandId?: string;
  sellerId?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  trending?: boolean;
  bestSeller?: boolean;
  newArrival?: boolean;
  inStock?: boolean;
  sort?: ProductSort;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface HomePageData {
  categories: CategoryData[];
  featuredProducts: ProductCardData[];
  flashSaleProducts: ProductCardData[];
  flashSaleEndsAt: string | null;
  newArrivals: ProductCardData[];
  trendingProducts: ProductCardData[];
  bestSellerProducts: ProductCardData[];
  brands: BrandData[];
}
