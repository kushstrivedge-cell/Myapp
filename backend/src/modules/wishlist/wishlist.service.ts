import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

const include = {
  product: {
    include: {
      category: true,
      images: { orderBy: { position: 'asc' as const } },
      variants: { orderBy: { price: 'asc' as const } },
      reviews: { select: { rating: true } },
    },
  },
};

export const wishlistService = {
  async list(userId: string) {
    return prisma.wishlistItem.findMany({
      where: { userId },
      include,
      orderBy: { createdAt: 'desc' },
    });
  },
  async add(userId: string, productId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, active: true },
    });
    if (!product)
      throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    return this.list(userId);
  },
  async remove(userId: string, productId: string) {
    await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    return this.list(userId);
  },
  async clear(userId: string) {
    await prisma.wishlistItem.deleteMany({ where: { userId } });
    return [];
  },
};
