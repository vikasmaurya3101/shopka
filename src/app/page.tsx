import { Suspense } from "react";
import { getHomeData } from "@/actions/get-home-data";
import { prisma } from "@/lib/prisma";
import LoginRequiredNotice from "@/components/shared/LoginRequiredNotice";
import Hero from "@/components/home/Hero";
import CategoryIconRow from "@/components/home/CategoryIconRow";
import ChampionCategories from "@/components/home/ChampionCategories";
import FlashSale from "@/components/home/FlashSale";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import TrendingProducts from "@/components/home/TrendingProducts";
import BestSellerProducts from "@/components/home/BestSellerProducts";
import NewArrivalProducts from "@/components/home/NewArrivalProducts";
import TopDeals from "@/components/home/TopDeals";
import BrandSection from "@/components/home/BrandSection";
import RecentlyViewed from "@/components/home/RecentlyViewed";
import Newsletter from "@/components/home/Newsletter";
import { unstable_cache } from "next/cache";

export const revalidate = 60;

const HERO_KEYS = [
  "logo_url",
  "hero_badge",
  "hero_title",
  "hero_subtitle",
  "hero_cta",
  "hero_card1_label", "hero_card1_value",
  "hero_card2_label", "hero_card2_value",
  "hero_card3_label", "hero_card3_value",
  "champion_section_title",
];

const getHeroSettings = unstable_cache(
  async () => {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: HERO_KEYS } } });
    const s: Record<string, string> = {};
    for (const row of rows) s[row.key] = row.value;
    return s;
  },
  ["hero-settings"],
  { revalidate: 60 }
);

/**
 * The headline numbers, read off the actual catalogue instead of being typed in.
 *
 * The hero used to advertise a hardcoded "Up to 80% off" and "Free Shipping — On
 * All Orders". Neither was checked against the products on sale, and the first
 * was simply untrue. Deriving them means the banner can't drift into a
 * misleading claim as prices and delivery charges change.
 */
const getStorefrontClaims = unstable_cache(
  async () => {
    const [discount, chargedProducts] = await Promise.all([
      prisma.product.aggregate({
        where: { isPublished: true, stock: { gt: 0 } },
        _max: { discountPercent: true },
      }),
      prisma.product.count({
        where: { isPublished: true, shippingCharge: { gt: 0 } },
      }),
    ]);

    return {
      // Floored, so we never round a 79.4% discount up into a claim of 80%.
      maxDiscountPercent: Math.floor(Number(discount._max.discountPercent ?? 0)),
      everythingShipsFree: chargedProducts === 0,
    };
  },
  ["storefront-claims"],
  { revalidate: 300 }
);

export default async function HomePage() {
  const [homeData, s, claims] = await Promise.all([
    getHomeData(),
    getHeroSettings(),
    getStorefrontClaims(),
  ]);

  // Only advertise a discount worth advertising, and only the one that exists.
  const discountClaim =
    claims.maxDiscountPercent >= 5
      ? `Up to ${claims.maxDiscountPercent}% off`
      : undefined;

  const deliveryClaim = claims.everythingShipsFree
    ? { label: "Free Delivery", value: "On All Orders" }
    : { label: "Free Delivery", value: "On Most Products" };

  const {
    categories,
    featuredProducts,
    flashSaleProducts,
    flashSaleEndsAt,
    newArrivals,
    trendingProducts,
    bestSellerProducts,
    brands,
  } = homeData;

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={null}>
        <LoginRequiredNotice />
      </Suspense>
      <Hero
        badge={
          s["hero_badge"] ||
          (discountClaim ? `${discountClaim.toUpperCase()} · SHOP NOW` : undefined)
        }
        title={s["hero_title"]}
        subtitle={s["hero_subtitle"]}
        cta={s["hero_cta"]}
        logoUrl={s["logo_url"]}
        card1Label={s["hero_card1_label"] || (discountClaim ? "Top Deal" : undefined)}
        card1Value={s["hero_card1_value"] || discountClaim}
        card2Label={s["hero_card2_label"] || deliveryClaim.label}
        card2Value={s["hero_card2_value"] || deliveryClaim.value}
        card3Label={s["hero_card3_label"]}
        card3Value={s["hero_card3_value"]}
      />
      <CategoryIconRow categories={categories} />
      <ChampionCategories
        products={featuredProducts}
        sectionTitle={s["champion_section_title"]}
      />
      <FlashSale products={flashSaleProducts} endsAt={flashSaleEndsAt} />
      <FeaturedProducts products={featuredProducts} />
      <TrendingProducts products={trendingProducts} />
      <TopDeals products={flashSaleProducts} />
      <BestSellerProducts products={bestSellerProducts} />
      <NewArrivalProducts products={newArrivals} />
      <BrandSection brands={brands} />
      <RecentlyViewed />
      <Newsletter />
    </div>
  );
}
