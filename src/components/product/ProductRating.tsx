import { Star } from "lucide-react";
import { ratingStars } from "@/lib/utils/rating";

interface ProductRatingProps {
  rating: number | string;
  totalReviews?: number;
  size?: number;
  showCount?: boolean;
}

export default function ProductRating({
  rating,
  totalReviews = 0,
  size = 14,
  showCount = true,
}: ProductRatingProps) {
  const numericRating = Number(rating) || 0;
  const { full, half, empty } = ratingStars(numericRating);

  if (numericRating === 0 && totalReviews === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-400">
        <Star size={11} className="text-gray-300" /> No ratings yet
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Score pill */}
      <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 ring-1 ring-amber-200">
        <Star size={13} className="fill-amber-400 text-amber-400" />
        <span className="text-sm font-extrabold text-amber-600">
          {numericRating.toFixed(1)}
        </span>
      </div>

      {/* Star strip */}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} size={size} className="fill-amber-400 text-amber-400" />
        ))}
        {half && (
          <span className="relative inline-block" style={{ width: size, height: size }}>
            {/* empty star bg */}
            <Star size={size} className="text-gray-200" />
            {/* filled half on top */}
            <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
              <Star size={size} className="fill-amber-400 text-amber-400" />
            </span>
          </span>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} size={size} className="fill-gray-200 text-gray-200" />
        ))}
      </div>

      {/* Review count */}
      {showCount && totalReviews > 0 && (
        <span className="text-sm text-gray-500">
          ({totalReviews.toLocaleString("en-IN")} ratings)
        </span>
      )}
    </div>
  );
}
