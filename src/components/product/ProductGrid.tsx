import { ProductCardData } from "@/types/product";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: ProductCardData[];
  emptyMessage?: string;
}

export default function ProductGrid({
  products,
  emptyMessage = "No products found.",
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-5">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
