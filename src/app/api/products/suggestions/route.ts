import { NextRequest, NextResponse } from "next/server";

import productService from "@/features/products/service/product.service";

/** Below this the result set is too broad to be a useful suggestion. */
const MIN_QUERY_LENGTH = 2;
const MAX_SUGGESTIONS = 6;

/**
 * Autocomplete feed for the navbar search box. Kept separate from
 * /api/products/search because this is called on (debounced) keystrokes:
 * it selects only the columns the dropdown renders, skipping the long-form
 * `description` and the brand/category/seller relations.
 */
export async function GET(request: NextRequest) {
  const keyword = (request.nextUrl.searchParams.get("q") ?? "").trim();

  // Too-short queries aren't an error — the dropdown just has nothing to show.
  if (keyword.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const products = await productService.suggest(keyword, MAX_SUGGESTIONS);

    return NextResponse.json(
      { success: true, data: products },
      {
        headers: {
          // Suggestions aren't user-specific and the same prefixes get typed
          // over and over, so let the CDN absorb the repeat traffic.
          "Cache-Control":
            "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("PRODUCT SUGGESTIONS ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load suggestions." },
      { status: 500 }
    );
  }
}
