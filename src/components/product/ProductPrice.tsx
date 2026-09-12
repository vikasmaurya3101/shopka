import { formatCurrency } from "@/lib/utils/currency";
import { hasDiscount } from "@/lib/utils/discount";

interface ProductPriceProps {
  mrp: number | string;
  sellingPrice: number | string;
  discountPercent?: number | string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: { price: "text-base", mrp: "text-xs", badge: "text-[10px] px-1.5 py-0.5" },
  md: { price: "text-xl",   mrp: "text-sm",  badge: "text-xs px-2 py-0.5" },
  lg: { price: "text-3xl",  mrp: "text-base",badge: "text-sm px-2.5 py-1" },
};

export default function ProductPrice({
  mrp,
  sellingPrice,
  discountPercent,
  size = "md",
}: ProductPriceProps) {
  const c = sizeClasses[size];
  const showDiscount = hasDiscount(Number(mrp), Number(sellingPrice));
  const pct = discountPercent !== undefined ? Math.round(Number(discountPercent)) : 0;

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      {/* Main price */}
      <span className={`font-extrabold tracking-tight text-gray-900 ${c.price}`}>
        {formatCurrency(sellingPrice)}
      </span>

      {showDiscount && (
        <span className={`font-medium text-gray-400 line-through ${c.mrp}`}>
          {formatCurrency(mrp)}
        </span>
      )}

      {showDiscount && pct > 0 && (
        <span
          className={`inline-flex items-center rounded-full bg-green-50 font-bold text-green-600 ${c.badge}`}
        >
          {pct}% off
        </span>
      )}
    </div>
  );
}
