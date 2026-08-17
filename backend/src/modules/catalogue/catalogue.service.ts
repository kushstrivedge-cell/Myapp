import { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { position: 'asc' as const } },
  variants: { orderBy: { price: 'asc' as const } },
  reviews: { select: { rating: true } },
};

type CatalogueProduct = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

function summary(product: CatalogueProduct) {
  const prices = product.variants.map(variant => Number(variant.price));
  const oldPrices = product.variants
    .map(variant =>
      variant.oldPrice === null ? null : Number(variant.oldPrice),
    )
    .filter((price): price is number => price !== null);
  const ratingTotal = product.reviews.reduce(
    (total, review) => total + review.rating,
    0,
  );
  const rating =
    product.reviews.length === 0 ? 0 : ratingTotal / product.reviews.length;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category,
    images: product.images,
    variants: product.variants.map(variant => ({
      id: variant.id,
      sku: variant.sku,
      colour: variant.colour,
      size: variant.size,
      price: Number(variant.price),
      oldPrice: variant.oldPrice === null ? null : Number(variant.oldPrice),
      stock: variant.stock,
      inStock: variant.stock > 0,
    })),
    price: prices.length ? Math.min(...prices) : 0,
    maximumPrice: prices.length ? Math.max(...prices) : 0,
    oldPrice: oldPrices.length ? Math.min(...oldPrices) : null,
    stock: product.variants.reduce(
      (total, variant) => total + variant.stock,
      0,
    ),
    inStock: product.variants.some(variant => variant.stock > 0),
    rating: Number(rating.toFixed(1)),
    reviewCount: product.reviews.length,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

type ProductListInput = {
  q?: string | undefined;
  category?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  minRating?: number | undefined;
  inStock?: boolean | undefined;
  onSale?: boolean | undefined;
  sort: 'popular' | 'rating' | 'price_asc' | 'price_desc' | 'newest';
  page: number;
  limit: number;
};

async function findProduct(identifier: string) {
  const product = await prisma.product.findFirst({
    where: { active: true, OR: [{ id: identifier }, { slug: identifier }] },
    include: productInclude,
  });
  if (!product)
    throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  return product;
}

export const catalogueService = {
  async categories() {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: { where: { active: true } } } },
        children: {
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { products: { where: { active: true } } } },
          },
        },
      },
    });
    return categories
      .filter(category => category.parentId === null)
      .map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        productCount: category._count.products,
        children: category.children.map(child => ({
          id: child.id,
          name: child.name,
          slug: child.slug,
          productCount: child._count.products,
        })),
      }));
  },

  async products(input: ProductListInput) {
    const where: Prisma.ProductWhereInput = { active: true };
    if (input.q) {
      where.OR = [
        { name: { contains: input.q, mode: 'insensitive' } },
        { description: { contains: input.q, mode: 'insensitive' } },
        { slug: { contains: input.q, mode: 'insensitive' } },
      ];
    }
    if (input.category) {
      where.category = {
        OR: [
          { slug: input.category },
          { parent: { is: { slug: input.category } } },
        ],
      };
    }

    const products = (
      await prisma.product.findMany({
        where,
        include: productInclude,
      })
    )
      .map(summary)
      .filter(product => {
        if (input.minPrice !== undefined && product.price < input.minPrice)
          return false;
        if (input.maxPrice !== undefined && product.price > input.maxPrice)
          return false;
        if (input.minRating !== undefined && product.rating < input.minRating)
          return false;
        if (input.inStock !== undefined && product.inStock !== input.inStock)
          return false;
        if (
          input.onSale !== undefined &&
          (product.oldPrice !== null) !== input.onSale
        )
          return false;
        return true;
      });

    products.sort((first, second) => {
      if (input.sort === 'price_asc') return first.price - second.price;
      if (input.sort === 'price_desc') return second.price - first.price;
      if (input.sort === 'rating')
        return (
          second.rating - first.rating || second.reviewCount - first.reviewCount
        );
      if (input.sort === 'newest')
        return second.createdAt.getTime() - first.createdAt.getTime();
      return (
        second.reviewCount - first.reviewCount || second.rating - first.rating
      );
    });

    const total = products.length;
    const pages = Math.max(1, Math.ceil(total / input.limit));
    const start = (input.page - 1) * input.limit;
    return {
      items: products.slice(start, start + input.limit),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        pages,
        hasNextPage: input.page < pages,
      },
    };
  },

  async product(identifier: string) {
    return summary(await findProduct(identifier));
  },

  async related(identifier: string, limit: number) {
    const product = await findProduct(identifier);
    const related = await prisma.product.findMany({
      where: {
        active: true,
        categoryId: product.categoryId,
        id: { not: product.id },
      },
      include: productInclude,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return related.map(summary);
  },

  async reviews(identifier: string, page: number, limit: number) {
    const product = await findProduct(identifier);
    const [items, total, ratingGroups] = await Promise.all([
      prisma.review.findMany({
        where: { productId: product.id },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where: { productId: product.id } }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { productId: product.id },
        _count: { _all: true },
      }),
    ]);
    const reviewerIds = items.map(item => item.userId);
    const verifiedOrders = reviewerIds.length
      ? await prisma.order.findMany({
          where: {
            userId: { in: reviewerIds },
            status: 'DELIVERED',
            items: { some: { productId: product.id } },
          },
          select: { userId: true },
        })
      : [];
    const verifiedUsers = new Set(verifiedOrders.map(order => order.userId));
    const distribution = Object.fromEntries(
      [1, 2, 3, 4, 5].map(rating => [
        rating,
        ratingGroups.find(group => group.rating === rating)?._count._all ?? 0,
      ]),
    );
    const ratingTotal = ratingGroups.reduce(
      (sum, group) => sum + group.rating * group._count._all,
      0,
    );
    return {
      items: items.map(item => ({
        ...item,
        verifiedPurchase: verifiedUsers.has(item.userId),
      })),
      summary: {
        average: total ? Number((ratingTotal / total).toFixed(1)) : 0,
        total,
        distribution,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
      },
    };
  },

  async review(
    identifier: string,
    userId: string,
    input: {
      rating: number;
      title?: string | undefined;
      text?: string | undefined;
    },
  ) {
    const product = await findProduct(identifier);
    const reviewData = {
      rating: input.rating,
      title: input.title ?? null,
      text: input.text ?? null,
    };
    const review = await prisma.review.upsert({
      where: { userId_productId: { userId, productId: product.id } },
      create: { userId, productId: product.id, ...reviewData },
      update: reviewData,
      include: { user: { select: { id: true, name: true } } },
    });
    const verifiedPurchase = Boolean(
      await prisma.order.findFirst({
        where: {
          userId,
          status: 'DELIVERED',
          items: { some: { productId: product.id } },
        },
        select: { id: true },
      }),
    );
    return { ...review, verifiedPurchase };
  },

  async addImage(
    identifier: string,
    url: string,
    alt: string | undefined,
    position: number,
  ) {
    const product = await findProduct(identifier);
    return prisma.productImage.create({
      data: { productId: product.id, url, alt: alt ?? null, position },
    });
  },

  async removeImage(identifier: string, imageId: string) {
    const product = await findProduct(identifier);
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId: product.id },
    });
    if (!image)
      throw new AppError(404, 'Product image not found', 'IMAGE_NOT_FOUND');
    await prisma.productImage.delete({ where: { id: image.id } });
    return image;
  },
};
