import { randomBytes } from 'node:crypto';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

type Owner = { userId?: string | undefined; guestToken?: string | undefined };
const itemInclude = {
  variant: {
    include: {
      product: {
        include: {
          category: true,
          images: { orderBy: { position: 'asc' as const } },
          variants: { orderBy: { price: 'asc' as const } },
          reviews: { select: { rating: true } },
        },
      },
    },
  },
};

async function guest(token?: string) {
  if (!token)
    throw new AppError(
      400,
      'Guest cart token is required',
      'GUEST_CART_REQUIRED',
    );
  const cart = await prisma.guestCart.findUnique({ where: { token } });
  if (!cart)
    throw new AppError(404, 'Guest cart was not found', 'GUEST_CART_NOT_FOUND');
  return cart;
}

async function raw(owner: Owner) {
  if (owner.userId) {
    const [user, items] = await Promise.all([
      prisma.user.findUnique({
        where: { id: owner.userId },
        select: { cartCouponCode: true },
      }),
      prisma.cartItem.findMany({
        where: { userId: owner.userId },
        include: itemInclude,
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return { items, couponCode: user?.cartCouponCode ?? null };
  }
  const cart = await guest(owner.guestToken);
  return {
    items: await prisma.guestCartItem.findMany({
      where: { guestCartId: cart.id },
      include: itemInclude,
      orderBy: { createdAt: 'asc' },
    }),
    couponCode: cart.couponCode,
  };
}

async function validCoupon(code: string | null, subtotal: number) {
  if (!code) return { coupon: null, discount: 0 };
  const now = new Date();
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (
    !coupon ||
    !coupon.active ||
    (coupon.startsAt && coupon.startsAt > now) ||
    (coupon.expiresAt && coupon.expiresAt <= now)
  )
    return { coupon: null, discount: 0 };
  const minimum = coupon.minimumCart ? Number(coupon.minimumCart) : 0;
  if (subtotal < minimum) return { coupon: null, discount: 0 };
  const discount = coupon.percentOff
    ? (subtotal * coupon.percentOff) / 100
    : Number(coupon.amountOff ?? 0);
  return {
    coupon,
    discount: Math.min(subtotal, Math.round(discount * 100) / 100),
  };
}

async function calculate(
  owner: Owner,
  shippingMethod: 'standard' | 'express' = 'standard',
) {
  const current = await raw(owner);
  const items = current.items.map(item => {
    const price = Number(item.variant.price);
    return {
      id: item.id,
      quantity: item.quantity,
      variant: {
        id: item.variant.id,
        sku: item.variant.sku,
        colour: item.variant.colour,
        size: item.variant.size,
        price,
        oldPrice:
          item.variant.oldPrice === null ? null : Number(item.variant.oldPrice),
        stock: item.variant.stock,
        inStock: item.variant.stock > 0,
      },
      product: item.variant.product,
      lineTotal: price * item.quantity,
      available:
        item.variant.product.active && item.quantity <= item.variant.stock,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const { coupon, discount } = await validCoupon(current.couponCode, subtotal);
  const taxable = Math.round((subtotal - discount) * 100) / 100;
  const tax = Math.round(taxable * 0.18 * 100) / 100;
  const shipping = shippingMethod === 'express' ? 149 : 0;
  return {
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    couponCode: coupon?.code ?? null,
    subtotal,
    discount,
    tax,
    shipping,
    total: taxable + tax + shipping,
    stockValid: items.every(item => item.available),
    stockIssues: items
      .filter(item => !item.available)
      .map(item => ({
        variantId: item.variant.id,
        productName: item.product.name,
        requested: item.quantity,
        available: item.variant.stock,
      })),
  };
}

export const cartService = {
  async createGuest() {
    return prisma.guestCart.create({
      data: { token: randomBytes(32).toString('hex') },
      select: { token: true },
    });
  },
  get: calculate,
  async add(owner: Owner, variantId: string, quantity: number) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
    if (!variant || !variant.product.active)
      throw new AppError(404, 'Product variant not found', 'VARIANT_NOT_FOUND');
    if (variant.stock < quantity)
      throw new AppError(
        409,
        'Requested quantity is not available',
        'INSUFFICIENT_STOCK',
        { available: variant.stock },
      );
    if (owner.userId) {
      const existing = await prisma.cartItem.findUnique({
        where: { userId_variantId: { userId: owner.userId, variantId } },
      });
      const next = (existing?.quantity ?? 0) + quantity;
      if (next > variant.stock || next > 10)
        throw new AppError(
          409,
          'Requested quantity is not available',
          'INSUFFICIENT_STOCK',
          { available: Math.min(variant.stock, 10) },
        );
      await prisma.cartItem.upsert({
        where: { userId_variantId: { userId: owner.userId, variantId } },
        create: { userId: owner.userId, variantId, quantity },
        update: { quantity: next },
      });
    } else {
      const cart = await guest(owner.guestToken);
      const existing = await prisma.guestCartItem.findUnique({
        where: { guestCartId_variantId: { guestCartId: cart.id, variantId } },
      });
      const next = (existing?.quantity ?? 0) + quantity;
      if (next > variant.stock || next > 10)
        throw new AppError(
          409,
          'Requested quantity is not available',
          'INSUFFICIENT_STOCK',
          { available: Math.min(variant.stock, 10) },
        );
      await prisma.guestCartItem.upsert({
        where: { guestCartId_variantId: { guestCartId: cart.id, variantId } },
        create: { guestCartId: cart.id, variantId, quantity },
        update: { quantity: next },
      });
    }
    return calculate(owner);
  },
  async quantity(owner: Owner, itemId: string, quantity: number) {
    if (owner.userId) {
      const item = await prisma.cartItem.findFirst({
        where: { id: itemId, userId: owner.userId },
        include: { variant: true },
      });
      if (!item)
        throw new AppError(404, 'Cart item not found', 'CART_ITEM_NOT_FOUND');
      if (quantity > item.variant.stock)
        throw new AppError(
          409,
          'Requested quantity is not available',
          'INSUFFICIENT_STOCK',
          { available: item.variant.stock },
        );
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity },
      });
    } else {
      const cart = await guest(owner.guestToken);
      const item = await prisma.guestCartItem.findFirst({
        where: { id: itemId, guestCartId: cart.id },
        include: { variant: true },
      });
      if (!item)
        throw new AppError(404, 'Cart item not found', 'CART_ITEM_NOT_FOUND');
      if (quantity > item.variant.stock)
        throw new AppError(
          409,
          'Requested quantity is not available',
          'INSUFFICIENT_STOCK',
          { available: item.variant.stock },
        );
      await prisma.guestCartItem.update({
        where: { id: item.id },
        data: { quantity },
      });
    }
    return calculate(owner);
  },
  async remove(owner: Owner, itemId: string) {
    if (owner.userId)
      await prisma.cartItem.deleteMany({
        where: { id: itemId, userId: owner.userId },
      });
    else {
      const cart = await guest(owner.guestToken);
      await prisma.guestCartItem.deleteMany({
        where: { id: itemId, guestCartId: cart.id },
      });
    }
    return calculate(owner);
  },
  async clear(owner: Owner) {
    if (owner.userId) {
      const userId = owner.userId;
      await prisma.$transaction(async transaction => {
        await transaction.cartItem.deleteMany({
          where: { userId },
        });
        await transaction.user.update({
          where: { id: userId },
          data: { cartCouponCode: null },
        });
      });
    } else {
      const cart = await guest(owner.guestToken);
      await prisma.$transaction(async transaction => {
        await transaction.guestCartItem.deleteMany({
          where: { guestCartId: cart.id },
        });
        await transaction.guestCart.update({
          where: { id: cart.id },
          data: { couponCode: null },
        });
      });
    }
    return calculate(owner);
  },
  async coupon(owner: Owner, code: string | null) {
    if (code) {
      const current = await raw(owner);
      const subtotal = current.items.reduce(
        (sum, item) => sum + Number(item.variant.price) * item.quantity,
        0,
      );
      const result = await validCoupon(code, subtotal);
      if (!result.coupon)
        throw new AppError(
          400,
          'Coupon is invalid, expired, or its minimum cart value is not met',
          'INVALID_COUPON',
        );
    }
    if (owner.userId)
      await prisma.user.update({
        where: { id: owner.userId },
        data: { cartCouponCode: code },
      });
    else {
      const cart = await guest(owner.guestToken);
      await prisma.guestCart.update({
        where: { id: cart.id },
        data: { couponCode: code },
      });
    }
    return calculate(owner);
  },
  async merge(userId: string, token: string) {
    const cart = await prisma.guestCart.findUnique({
      where: { token },
      include: { items: { include: { variant: true } } },
    });
    if (!cart) return calculate({ userId });
    await prisma.$transaction(async tx => {
      for (const item of cart.items) {
        const existing = await tx.cartItem.findUnique({
          where: { userId_variantId: { userId, variantId: item.variantId } },
        });
        const quantity = Math.min(
          10,
          item.variant.stock,
          (existing?.quantity ?? 0) + item.quantity,
        );
        if (quantity > 0)
          await tx.cartItem.upsert({
            where: { userId_variantId: { userId, variantId: item.variantId } },
            create: { userId, variantId: item.variantId, quantity },
            update: { quantity },
          });
      }
      if (cart.couponCode)
        await tx.user.update({
          where: { id: userId },
          data: { cartCouponCode: cart.couponCode },
        });
      await tx.guestCart.delete({ where: { id: cart.id } });
    });
    return calculate({ userId });
  },
  async validate(owner: Owner, shippingMethod: 'standard' | 'express') {
    const result = await calculate(owner, shippingMethod);
    if (!result.items.length)
      throw new AppError(400, 'Cart is empty', 'EMPTY_CART');
    if (!result.stockValid)
      throw new AppError(
        409,
        'Some cart items are no longer available',
        'STOCK_CHANGED',
        result.stockIssues,
      );
    return result;
  },
};
