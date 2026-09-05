export interface ReviewUserData {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profileImage: string | null;
}

export interface ReviewMediaData {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
  publicId: string | null;
}

export interface ReviewData {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
  user: ReviewUserData;
  media: ReviewMediaData[];
}

export interface RatingBreakdown {
  five: number;
  four: number;
  three: number;
  two: number;
  one: number;
}

export interface ReviewSummaryData {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: RatingBreakdown;
}

export interface ReviewListResponse {
  data: ReviewData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: ReviewSummaryData;
}
