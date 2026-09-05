import { Prisma } from "@prisma/client";

import productRepository from "../repository/product.repository";

import {
  CreateProductDtoType,
} from "../dto/create-product.dto";

import {
  UpdateProductDtoType,
} from "../dto/update-product.dto";

import {
  ProductQueryDtoType,
} from "../dto/product-query.dto";

class ProductService {
  async getHomeData() {
    return productRepository.getHomeData();
  }

  async getProducts(
    filters: ProductQueryDtoType
  ) {
    return productRepository.findAll(filters);
  }

  async search(
    keyword: string
  ) {
    return productRepository.search(keyword);
  }

  async suggest(
    keyword: string,
    limit?: number
  ) {
    return productRepository.suggest(keyword, limit);
  }

  async getProductById(
    id: string
  ) {
    const product =
      await productRepository.findById(id);

    if (!product) {
      throw new Error(
        "Product not found"
      );
    }

    const relatedProducts =
      await productRepository.getRelatedProducts(
        product.id,
        product.categoryId
      );

    return {
      ...product,
      relatedProducts,
    };
  }

  async getProductBySlug(
    slug: string
  ) {
    const product =
      await productRepository.findBySlug(
        slug
      );

    if (!product) {
      throw new Error(
        "Product not found"
      );
    }

    const relatedProducts =
      await productRepository.getRelatedProducts(
        product.id,
        product.categoryId
      );

    return {
      ...product,
      relatedProducts,
    };
  }

  async createProduct(
    dto: CreateProductDtoType
  ) {
    const slugExists =
      await productRepository.slugExists(
        dto.slug
      );

    if (slugExists) {
      throw new Error(
        "Slug already exists"
      );
    }

    const skuExists =
      await productRepository.skuExists(
        dto.sku
      );

    if (skuExists) {
      throw new Error(
        "SKU already exists"
      );
    }

    const discount =
      dto.mrp > 0
        ? Number(
            (
              ((dto.mrp -
                dto.sellingPrice) /
                dto.mrp) *
              100
            ).toFixed(2)
          )
        : 0;

    const data: Prisma.ProductCreateInput =
      {
        name: dto.name,

        slug: dto.slug,

        description:
          dto.description,

        shortDescription:
          dto.shortDescription,

        sku: dto.sku,

        mrp: dto.mrp,

        sellingPrice:
          dto.sellingPrice,

        discountPercent:
          discount,

        taxPercent:
          dto.taxPercent,

        stock: dto.stock,

        minOrderQuantity:
          dto.minOrderQuantity,

        isFeatured:
          dto.isFeatured,

        isTrending:
          dto.isTrending,

        isBestSeller:
          dto.isBestSeller,

        isNewArrival:
          dto.isNewArrival,

        isPublished:
          dto.isPublished,

        shippingCharge:
          dto.shippingCharge,

        codAllowed:
          dto.codAllowed,

        estimatedDeliveryDays:
          dto.estimatedDeliveryDays,

        seoTitle:
          dto.seoTitle,

        seoDescription:
          dto.seoDescription,

        searchKeywords:
          dto.searchKeywords,

        category: {
          connect: {
            id: dto.categoryId,
          },
        },

        ...(dto.subCategoryId && {
          subCategory: {
            connect: {
              id: dto.subCategoryId,
            },
          },
        }),

        ...(dto.brandId && {
          brand: {
            connect: {
              id: dto.brandId,
            },
          },
        }),

        ...(dto.sellerId && {
          seller: {
            connect: {
              id: dto.sellerId,
            },
          },
        }),

        images: {
          create:
            dto.images.map(
              (
                image,
                index
              ) => ({
                url: image.url,

                altText:
                  image.altText,

                isThumbnail:
                  image.isThumbnail ??
                  index === 0,

                displayOrder:
                  image.displayOrder ??
                  index,
              })
            ),
        },
      };

    return productRepository.create(
      data
    );
  }
    async updateProduct(
    id: string,
    dto: UpdateProductDtoType
  ) {
    const exists =
      await productRepository.exists(id);

    if (!exists) {
      throw new Error("Product not found");
    }

    if (dto.slug) {
      const slugExists =
        await productRepository.slugExists(
          dto.slug,
          id
        );

      if (slugExists) {
        throw new Error("Slug already exists");
      }
    }

    if (dto.sku) {
      const skuExists =
        await productRepository.skuExists(
          dto.sku,
          id
        );

      if (skuExists) {
        throw new Error("SKU already exists");
      }
    }

    const data: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined)
      data.name = dto.name;

    if (dto.slug !== undefined)
      data.slug = dto.slug;

    if (dto.description !== undefined)
      data.description = dto.description;

    if (dto.shortDescription !== undefined)
      data.shortDescription =
        dto.shortDescription;

    if (dto.sku !== undefined)
      data.sku = dto.sku;

    if (dto.mrp !== undefined)
      data.mrp = dto.mrp;

    if (dto.sellingPrice !== undefined)
      data.sellingPrice =
        dto.sellingPrice;

    if (dto.taxPercent !== undefined)
      data.taxPercent =
        dto.taxPercent;

    if (dto.stock !== undefined)
      data.stock = dto.stock;

    if (
      dto.minOrderQuantity !== undefined
    )
      data.minOrderQuantity =
        dto.minOrderQuantity;

    if (dto.isFeatured !== undefined)
      data.isFeatured =
        dto.isFeatured;

    if (dto.isTrending !== undefined)
      data.isTrending =
        dto.isTrending;

    if (dto.isBestSeller !== undefined)
      data.isBestSeller =
        dto.isBestSeller;

    if (dto.isNewArrival !== undefined)
      data.isNewArrival =
        dto.isNewArrival;

    if (dto.isPublished !== undefined)
      data.isPublished =
        dto.isPublished;

    if (dto.shippingCharge !== undefined)
      data.shippingCharge =
        dto.shippingCharge;

    if (dto.codAllowed !== undefined)
      data.codAllowed =
        dto.codAllowed;

    if (
      dto.estimatedDeliveryDays !== undefined
    )
      data.estimatedDeliveryDays =
        dto.estimatedDeliveryDays;

    if (
      dto.searchKeywords !== undefined
    )
      data.searchKeywords =
        dto.searchKeywords;

    if (dto.seoTitle !== undefined)
      data.seoTitle =
        dto.seoTitle;

    if (
      dto.seoDescription !== undefined
    )
      data.seoDescription =
        dto.seoDescription;

    if (dto.categoryId) {
      data.category = {
        connect: {
          id: dto.categoryId,
        },
      };
    }

    if (
      dto.subCategoryId !== undefined
    ) {
      data.subCategory =
        dto.subCategoryId
          ? {
              connect: {
                id: dto.subCategoryId,
              },
            }
          : {
              disconnect: true,
            };
    }

    if (dto.brandId !== undefined) {
      data.brand = dto.brandId
        ? {
            connect: {
              id: dto.brandId,
            },
          }
        : {
            disconnect: true,
          };
    }

    if (dto.sellerId !== undefined) {
      data.seller = dto.sellerId
        ? {
            connect: {
              id: dto.sellerId,
            },
          }
        : {
            disconnect: true,
          };
    }

    if (
      dto.mrp !== undefined ||
      dto.sellingPrice !== undefined
    ) {
      const product =
        await productRepository.findById(
          id
        );

      const mrp = Number(
        dto.mrp ?? product!.mrp
      );

      const sellingPrice = Number(
        dto.sellingPrice ??
          product!.sellingPrice
      );

      data.discountPercent = Number(
        (
          ((mrp - sellingPrice) /
            mrp) *
          100
        ).toFixed(2)
      );
    }

    await productRepository.update(
      id,
      data
    );

    if (dto.images) {
      await productRepository.replaceImages(
        id,
        dto.images
      );
    }

    return productRepository.findById(
      id
    );
  }

  async deleteProduct(id: string) {
    const exists =
      await productRepository.exists(id);

    if (!exists) {
      throw new Error("Product not found");
    }

    return productRepository.delete(id);
  }

  async publishProduct(id: string) {
    return productRepository.publish(id);
  }

  async unPublishProduct(
    id: string
  ) {
    return productRepository.unPublish(
      id
    );
  }

  async updateStock(
    id: string,
    stock: number
  ) {
    return productRepository.updateStock(
      id,
      stock
    );
  }

  async incrementStock(
    id: string,
    quantity: number
  ) {
    return productRepository.incrementStock(
      id,
      quantity
    );
  }

  async decrementStock(
    id: string,
    quantity: number
  ) {
    return productRepository.decrementStock(
      id,
      quantity
    );
  }

  async getSellerProducts(
    sellerId: string,
    page = 1,
    limit = 20
  ) {
    return productRepository.getSellerProducts(
      sellerId,
      page,
      limit
    );
  }
    async getCategoryProducts(
    categoryId: string,
    page = 1,
    limit = 20
  ) {
    return productRepository.getCategoryProducts(
      categoryId,
      page,
      limit
    );
  }

  async getSubCategoryProducts(
    subCategoryId: string,
    page = 1,
    limit = 20
  ) {
    return productRepository.getSubCategoryProducts(
      subCategoryId,
      page,
      limit
    );
  }

  async getBrandProducts(
    brandId: string,
    page = 1,
    limit = 20
  ) {
    return productRepository.getBrandProducts(
      brandId,
      page,
      limit
    );
  }

  async getFeaturedProducts() {
    return productRepository.getFeaturedProducts();
  }

  async getTrendingProducts() {
    return productRepository.getTrendingProducts();
  }

  async getBestSellerProducts() {
    return productRepository.getBestSellerProducts();
  }

  async getNewArrivalProducts() {
    return productRepository.getNewArrivalProducts();
  }

  async getFlashSaleProducts() {
    return productRepository.getFlashSaleProducts();
  }

  async getBrands() {
    return productRepository.getBrands();
  }

  async getCategories() {
    return productRepository.getCategories();
  }

  async getProductReviews(
    productId: string,
    page = 1,
    limit = 10,
    filter = "all"
  ) {
    return productRepository.getProductReviews(
      productId,
      page,
      limit,
      filter
    );
  }

  async getReviewSummary(
    productId: string
  ) {
    return productRepository.getReviewSummary(
      productId
    );
  }

  async refreshRating(
    productId: string
  ) {
    return productRepository.refreshRating(
      productId
    );
  }

  async getDashboardStats() {
    return productRepository.getDashboardStats();
  }

  async getInventorySummary() {
    return productRepository.inventorySummary();
  }

  async getLowStockProducts() {
    return productRepository.getLowStockProducts();
  }

  async getOutOfStockProducts() {
    return productRepository.getOutOfStockProducts();
  }

  async getLatestProducts() {
    return productRepository.getLatestProducts();
  }

  async getTopRatedProducts() {
    return productRepository.getTopRatedProducts();
  }

  async bulkPublish(
    ids: string[]
  ) {
    return productRepository.bulkPublish(
      ids
    );
  }

  async bulkUnPublish(
    ids: string[]
  ) {
    return productRepository.bulkUnPublish(
      ids
    );
  }

  async bulkDelete(
    ids: string[]
  ) {
    return productRepository.bulkDelete(
      ids
    );
  }

  async bulkReassign(
    ids: string[],
    categoryId: string,
    subCategoryId: string | null
  ) {
    return productRepository.bulkReassign(
      ids,
      categoryId,
      subCategoryId
    );
  }

  async toggleFeatured(
    id: string,
    value: boolean
  ) {
    return productRepository.toggleFeatured(
      id,
      value
    );
  }

  async toggleTrending(
    id: string,
    value: boolean
  ) {
    return productRepository.toggleTrending(
      id,
      value
    );
  }

  async toggleBestSeller(
    id: string,
    value: boolean
  ) {
    return productRepository.toggleBestSeller(
      id,
      value
    );
  }

  async toggleNewArrival(
    id: string,
    value: boolean
  ) {
    return productRepository.toggleNewArrival(
      id,
      value
    );
  }
}

export const productService =
  new ProductService();

export default productService;