import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ProductFilters } from "../types/product.types";

class ProductRepository {
  private readonly include = {
    brand: true,
    seller: true,
    category: true,
    subCategory: true,

    images: {
      orderBy: {
        displayOrder: "asc",
      },
    },
  } satisfies Prisma.ProductInclude;

  private buildWhere(
    filters: ProductFilters
  ): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      isPublished: true,
    };

    if (filters.search) {
      where.OR = [
        {
          name: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          searchKeywords: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (filters.categoryId)
      where.categoryId = filters.categoryId;

    if (filters.subCategoryId)
      where.subCategoryId = filters.subCategoryId;

    if (filters.brandId)
      where.brandId = filters.brandId;

    if (filters.sellerId)
      where.sellerId = filters.sellerId;

    if (filters.featured)
      where.isFeatured = true;

    if (filters.trending)
      where.isTrending = true;

    if (filters.bestSeller)
      where.isBestSeller = true;

    if (filters.newArrival)
      where.isNewArrival = true;

    if (filters.inStock) {
      where.stock = {
        gt: 0,
      };
    }

    if (
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined
    ) {
      where.sellingPrice = {
        gte: filters.minPrice,
        lte: filters.maxPrice,
      };
    }

    return where;
  }

  private buildOrderBy(
    sort?: string
  ): Prisma.ProductOrderByWithRelationInput {
    switch (sort) {
      case "price_low":
        return {
          sellingPrice: "asc",
        };

      case "price_high":
        return {
          sellingPrice: "desc",
        };

      case "discount":
        return {
          discountPercent: "desc",
        };

      case "rating":
        return {
          avgRating: "desc",
        };

      case "popular":
        return {
          totalReviews: "desc",
        };

      default:
        return {
          createdAt: "desc",
        };
    }
  }
    async getHomeData() {
    const now = new Date();

    const [
      categories,
      featuredProducts,
      activeFlashSale,
      newArrivals,
      trendingProducts,
      bestSellerProducts,
      brands,
    ] = await prisma.$transaction([
      prisma.category.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          displayOrder: "asc",
        },
        take: 8,
      }),

      prisma.product.findMany({
        where: {
          isPublished: true,
          isFeatured: true,
        },
        include: this.include,
        take: 8,
      }),

      prisma.flashSale.findFirst({
        where: {
          isActive: true,
          startsAt: { lte: now },
          endsAt: { gte: now },
        },
        orderBy: {
          startsAt: "desc",
        },
        include: {
          products: {
            where: {
              product: {
                isPublished: true,
              },
            },
            include: {
              product: {
                include: this.include,
              },
            },
          },
        },
      }),

      prisma.product.findMany({
        where: {
          isPublished: true,
          isNewArrival: true,
        },
        include: this.include,
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      }),

      prisma.product.findMany({
        where: {
          isPublished: true,
          isTrending: true,
        },
        include: this.include,
        take: 8,
      }),

      prisma.product.findMany({
        where: {
          isPublished: true,
          isBestSeller: true,
        },
        include: this.include,
        take: 8,
      }),

      prisma.brand.findMany({
        where: {
          isActive: true,
        },
        take: 12,
      }),
    ]);

    const flashSaleProducts = (activeFlashSale?.products ?? [])
      .slice(0, 8)
      .map((flashSaleProduct) => {
        const { product, flashPrice } = flashSaleProduct;
        const mrp = Number(product.mrp);
        const discountPercent =
          mrp > 0 ? Math.round(((mrp - Number(flashPrice)) / mrp) * 100) : 0;

        return {
          ...product,
          sellingPrice: flashPrice,
          discountPercent,
        };
      });

    return {
      categories,
      featuredProducts,
      flashSaleProducts,
      flashSaleEndsAt: activeFlashSale?.endsAt ?? null,
      newArrivals,
      trendingProducts,
      bestSellerProducts,
      brands,
    };
  }

  async getFeaturedProducts(limit = 8) {
    return prisma.product.findMany({
      where: {
        isPublished: true,
        isFeatured: true,
      },
      include: this.include,
      take: limit,
    });
  }

  async getTrendingProducts(limit = 8) {
    return prisma.product.findMany({
      where: {
        isPublished: true,
        isTrending: true,
      },
      include: this.include,
      take: limit,
    });
  }

  async getBestSellerProducts(limit = 8) {
    return prisma.product.findMany({
      where: {
        isPublished: true,
        isBestSeller: true,
      },
      include: this.include,
      take: limit,
    });
  }

  async getNewArrivalProducts(limit = 8) {
    return prisma.product.findMany({
      where: {
        isPublished: true,
        isNewArrival: true,
      },
      include: this.include,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }

  async getFlashSaleProducts(limit = 8) {
    return prisma.product.findMany({
      where: {
        isPublished: true,
      },
      include: this.include,
      orderBy: {
        discountPercent: "desc",
      },
      take: limit,
    });
  }

  async getBrands() {
    return prisma.brand.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async getCategories() {
    return prisma.category.findMany({
      where: {
        isActive: true,
      },
      include: {
        subCategories: {
          where: {
            isActive: true,
          },
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
      orderBy: {
        displayOrder: "asc",
      },
    });
  }
    async findAll(filters: ProductFilters) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const skip = (page - 1) * limit;

    const where = this.buildWhere(filters);

    const orderBy = this.buildOrderBy(filters.sort);

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        include: this.include,
        orderBy,
        skip,
        take: limit,
      }),

      prisma.product.count({
        where,
      }),
    ]);

    return {
      data: products,

      total,

      page,

      limit,

      totalPages: Math.ceil(total / limit),

      hasNext: page * limit < total,

      hasPrevious: page > 1,
    };
  }

  async findById(id: string) {
    return prisma.product.findUnique({
      where: {
        id,
      },

      include: {
        ...this.include,

        reviews: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return prisma.product.findUnique({
      where: {
        slug,
      },

      include: {
        ...this.include,

        reviews: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }

  async exists(id: string) {
    const count = await prisma.product.count({
      where: {
        id,
      },
    });

    return count > 0;
  }

  async count(filters: ProductFilters = {}) {
    return prisma.product.count({
      where: this.buildWhere(filters),
    });
  }

  async search(
    keyword: string,
    limit = 10
  ) {
    return prisma.product.findMany({
      where: {
        isPublished: true,

        OR: [
          {
            name: {
              contains: keyword,
              mode: "insensitive",
            },
          },

          {
            description: {
              contains: keyword,
              mode: "insensitive",
            },
          },

          {
            searchKeywords: {
              contains: keyword,
              mode: "insensitive",
            },
          },
        ],
      },

      include: {
        images: {
          take: 1,
          orderBy: {
            displayOrder: "asc",
          },
        },
      },

      take: limit,
    });
  }

  /**
   * Narrow variant of search() for navbar autocomplete. Selects only the
   * columns the dropdown renders — notably skipping `description`, which is
   * long-form text and would otherwise be shipped on every keystroke.
   */
  async suggest(
    keyword: string,
    limit = 6
  ) {
    return prisma.product.findMany({
      where: {
        isPublished: true,

        OR: [
          {
            name: {
              contains: keyword,
              mode: "insensitive",
            },
          },

          {
            searchKeywords: {
              contains: keyword,
              mode: "insensitive",
            },
          },
        ],
      },

      select: {
        id: true,
        name: true,
        slug: true,
        mrp: true,
        sellingPrice: true,
        stock: true,

        images: {
          take: 1,
          orderBy: {
            displayOrder: "asc",
          },
          select: {
            id: true,
            url: true,
            altText: true,
            isThumbnail: true,
            displayOrder: true,
          },
        },
      },

      // Cheapest-first is a poor match for "what did I mean?", so keep the
      // catalogue's own ordering and let relevance come from the name match.
      orderBy: {
        totalReviews: "desc",
      },

      take: limit,
    });
  }

  async getRelatedProducts(
    productId: string,
    categoryId: string,
    limit = 8
  ) {
    return prisma.product.findMany({
      where: {
        isPublished: true,

        categoryId,

        id: {
          not: productId,
        },
      },

      include: this.include,

      take: limit,
    });
  }
    async create(data: Prisma.ProductCreateInput) {
    return prisma.product.create({
      data,
      include: this.include,
    });
  }

  async update(
    id: string,
    data: Prisma.ProductUpdateInput
  ) {
    return prisma.product.update({
      where: {
        id,
      },
      data,
      include: this.include,
    });
  }

  async delete(id: string) {
    return prisma.product.delete({
      where: {
        id,
      },
    });
  }

  async publish(id: string) {
    return prisma.product.update({
      where: {
        id,
      },
      data: {
        isPublished: true,
      },
    });
  }

  async unPublish(id: string) {
    return prisma.product.update({
      where: {
        id,
      },
      data: {
        isPublished: false,
      },
    });
  }

  async updateStock(
    productId: string,
    stock: number
  ) {
    return prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        stock,
      },
    });
  }

  async incrementStock(
    productId: string,
    quantity: number
  ) {
    return prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        stock: {
          increment: quantity,
        },
      },
    });
  }

  async decrementStock(
    productId: string,
    quantity: number
  ) {
    return prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        stock: {
          decrement: quantity,
        },
      },
    });
  }

  async replaceImages(
    productId: string,
    images: {
      url: string;
      altText?: string;
      isThumbnail?: boolean;
      displayOrder?: number;
    }[]
  ) {
    await prisma.productImage.deleteMany({
      where: {
        productId,
      },
    });

    if (!images.length) return;

    await prisma.productImage.createMany({
      data: images.map((image, index) => ({
        productId,

        url: image.url,

        altText: image.altText,

        isThumbnail:
          image.isThumbnail ?? index === 0,

        displayOrder:
          image.displayOrder ?? index,
      })),
    });
  }

  async addImages(
    productId: string,
    images: {
      url: string;
      altText?: string;
      isThumbnail?: boolean;
      displayOrder?: number;
    }[]
  ) {
    return prisma.productImage.createMany({
      data: images.map((image, index) => ({
        productId,

        url: image.url,

        altText: image.altText,

        isThumbnail:
          image.isThumbnail ?? false,

        displayOrder:
          image.displayOrder ?? index,
      })),
    });
  }

  async deleteImage(imageId: string) {
    return prisma.productImage.delete({
      where: {
        id: imageId,
      },
    });
  }

  async getSellerProducts(
    sellerId: string,
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;

    const [products, total] =
      await prisma.$transaction([
        prisma.product.findMany({
          where: {
            sellerId,
          },

          include: this.include,

          orderBy: {
            createdAt: "desc",
          },

          skip,

          take: limit,
        }),

        prisma.product.count({
          where: {
            sellerId,
          },
        }),
      ]);

    return {
      data: products,

      total,

      page,

      limit,

      totalPages: Math.ceil(total / limit),
    };
  }

  async getCategoryProducts(
    categoryId: string,
    page = 1,
    limit = 20
  ) {
    return this.findAll({
      categoryId,
      page,
      limit,
    });
  }

  async getBrandProducts(
    brandId: string,
    page = 1,
    limit = 20
  ) {
    return this.findAll({
      brandId,
      page,
      limit,
    });
  }

  async getSubCategoryProducts(
    subCategoryId: string,
    page = 1,
    limit = 20
  ) {
    return this.findAll({
      subCategoryId,
      page,
      limit,
    });
  }
    async getProductReviews(
    productId: string,
    page = 1,
    limit = 10,
    filter = "all"
  ) {
    const skip = (page - 1) * limit;

    // Build where clause based on filter
    const ratingNum = parseInt(filter);
    const where: Record<string, unknown> = { productId };
    if (!isNaN(ratingNum) && ratingNum >= 1 && ratingNum <= 5) {
      where.rating = ratingNum;
    } else if (filter === "photos") {
      where.media = { some: {} };
    }

    const [reviews, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
          media: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getReviewSummary(productId: string) {
    const reviews = await prisma.review.findMany({
      where: {
        productId,
      },

      select: {
        rating: true,
      },
    });

    const totalReviews = reviews.length;

    const average =
      totalReviews === 0
        ? 0
        : reviews.reduce(
            (sum, review) => sum + review.rating,
            0
          ) / totalReviews;

    const ratingBreakdown = {
      five: reviews.filter((r) => r.rating === 5).length,
      four: reviews.filter((r) => r.rating === 4).length,
      three: reviews.filter((r) => r.rating === 3).length,
      two: reviews.filter((r) => r.rating === 2).length,
      one: reviews.filter((r) => r.rating === 1).length,
    };

    return {
      averageRating: Number(average.toFixed(2)),
      totalReviews,
      ratingBreakdown,
    };
  }

  async refreshRating(productId: string) {
    const summary = await this.getReviewSummary(
      productId
    );

    return prisma.product.update({
      where: {
        id: productId,
      },

      data: {
        avgRating: summary.averageRating,

        totalReviews: summary.totalReviews,
      },
    });
  }

  async getLowStockProducts(limit = 20) {
    return prisma.product.findMany({
      where: {
        stock: {
          lte: 10,
        },
      },

      include: this.include,

      orderBy: {
        stock: "asc",
      },

      take: limit,
    });
  }

  async getOutOfStockProducts() {
    return prisma.product.findMany({
      where: {
        stock: 0,
      },

      include: this.include,
    });
  }

  async getDashboardStats() {
    const [
      totalProducts,
      publishedProducts,
      draftProducts,
      featuredProducts,
      outOfStockProducts,
      lowStockProducts,
    ] = await prisma.$transaction([
      prisma.product.count(),

      prisma.product.count({
        where: {
          isPublished: true,
        },
      }),

      prisma.product.count({
        where: {
          isPublished: false,
        },
      }),

      prisma.product.count({
        where: {
          isFeatured: true,
        },
      }),

      prisma.product.count({
        where: {
          stock: 0,
        },
      }),

      prisma.product.count({
        where: {
          stock: {
            lte: 10,
          },
        },
      }),
    ]);

    return {
      totalProducts,
      publishedProducts,
      draftProducts,
      featuredProducts,
      outOfStockProducts,
      lowStockProducts,
    };
  }

  async getLatestProducts(limit = 10) {
    return prisma.product.findMany({
      include: this.include,

      orderBy: {
        createdAt: "desc",
      },

      take: limit,
    });
  }

  async getTopRatedProducts(limit = 10) {
    return prisma.product.findMany({
      where: {
        isPublished: true,
      },

      include: this.include,

      orderBy: {
        avgRating: "desc",
      },

      take: limit,
    });
  }
    async slugExists(
    slug: string,
    excludeId?: string
  ) {
    return prisma.product.findFirst({
      where: {
        slug,

        ...(excludeId && {
          id: {
            not: excludeId,
          },
        }),
      },

      select: {
        id: true,
      },
    });
  }

  async skuExists(
    sku: string,
    excludeId?: string
  ) {
    return prisma.product.findFirst({
      where: {
        sku,

        ...(excludeId && {
          id: {
            not: excludeId,
          },
        }),
      },

      select: {
        id: true,
      },
    });
  }

  async bulkPublish(ids: string[]) {
    return prisma.product.updateMany({
      where: {
        id: {
          in: ids,
        },
      },

      data: {
        isPublished: true,
      },
    });
  }

  async bulkUnPublish(ids: string[]) {
    return prisma.product.updateMany({
      where: {
        id: {
          in: ids,
        },
      },

      data: {
        isPublished: false,
      },
    });
  }

  async bulkDelete(ids: string[]) {
    return prisma.product.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  async bulkReassign(
    ids: string[],
    categoryId: string,
    subCategoryId: string | null
  ) {
    return prisma.product.updateMany({
      where: { id: { in: ids } },
      data: {
        categoryId,
        subCategoryId: subCategoryId ?? null,
      },
    });
  }

  async toggleFeatured(
    id: string,
    value: boolean
  ) {
    return prisma.product.update({
      where: {
        id,
      },

      data: {
        isFeatured: value,
      },
    });
  }

  async toggleTrending(
    id: string,
    value: boolean
  ) {
    return prisma.product.update({
      where: {
        id,
      },

      data: {
        isTrending: value,
      },
    });
  }

  async toggleBestSeller(
    id: string,
    value: boolean
  ) {
    return prisma.product.update({
      where: {
        id,
      },

      data: {
        isBestSeller: value,
      },
    });
  }

  async toggleNewArrival(
    id: string,
    value: boolean
  ) {
    return prisma.product.update({
      where: {
        id,
      },

      data: {
        isNewArrival: value,
      },
    });
  }

  async totalInventoryValue() {
    const products =
      await prisma.product.findMany({
        select: {
          stock: true,
          sellingPrice: true,
        },
      });

    return products.reduce((total, product) => {
      return (
        total +
        Number(product.sellingPrice) *
          product.stock
      );
    }, 0);
  }

  async inventorySummary() {
    const [
      totalProducts,
      inStock,
      outOfStock,
      lowStock,
      inventoryValue,
    ] = await Promise.all([
      prisma.product.count(),

      prisma.product.count({
        where: {
          stock: {
            gt: 0,
          },
        },
      }),

      prisma.product.count({
        where: {
          stock: 0,
        },
      }),

      prisma.product.count({
        where: {
          stock: {
            lte: 10,
          },
        },
      }),

      this.totalInventoryValue(),
    ]);

    return {
      totalProducts,
      inStock,
      outOfStock,
      lowStock,
      inventoryValue,
    };
  }
}

export const productRepository =
  new ProductRepository();

export default productRepository;