import { randomBytes } from 'node:crypto';
import { OrderStatus, Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

type Input = {
  idempotencyKey: string;
  shippingMethod: 'standard' | 'express';
  paymentMethod: 'upi' | 'card' | 'cod';
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
  };
};
const orderInclude = {
  items: {
    include: {
      product: {
        include: { images: { orderBy: { position: 'asc' as const } } },
      },
      variant: true,
    },
  },
  timeline: { orderBy: { createdAt: 'asc' as const } },
};
type FullOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
const money = (value: number) => Math.round(value * 100) / 100;
function publicOrder(order: FullOrder) {
  return {
    ...order,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    shippingCost: Number(order.shippingCost),
    tax: Number(order.tax),
    total: Number(order.total),
    items: order.items.map(item => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      refundedAmount: Number(item.refundedAmount),
    })),
  };
}
async function couponDiscount(
  tx: Prisma.TransactionClient,
  code: string | null,
  subtotal: number,
) {
  if (!code) return { couponCode: null, discount: 0 };
  const coupon = await tx.coupon.findUnique({ where: { code } });
  const now = new Date();
  if (
    !coupon ||
    !coupon.active ||
    (coupon.startsAt && coupon.startsAt > now) ||
    (coupon.expiresAt && coupon.expiresAt <= now) ||
    subtotal < Number(coupon.minimumCart ?? 0)
  )
    return { couponCode: null, discount: 0 };
  const discount = coupon.percentOff
    ? (subtotal * coupon.percentOff) / 100
    : Number(coupon.amountOff ?? 0);
  return {
    couponCode: coupon.code,
    discount: Math.min(subtotal, money(discount)),
  };
}
function orderNumber() {
  return `CRT-${new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export const orderService = {
  async create(userId: string, input: Input) {
    const prior = await prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: orderInclude,
    });
    if (prior) {
      if (prior.userId !== userId)
        throw new AppError(
          409,
          'Idempotency key is already in use',
          'IDEMPOTENCY_CONFLICT',
        );
      return { order: publicOrder(prior), duplicate: true };
    }
    try {
      return await prisma.$transaction(
        async tx => {
          const duplicate = await tx.order.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
            include: orderInclude,
          });
          if (duplicate)
            return { order: publicOrder(duplicate), duplicate: true };
          // An interactive transaction owns one PostgreSQL connection. Keep
          // its queries sequential so the same client is never queried while
          // it is still executing the previous statement.
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { cartCouponCode: true },
          });
          const cartItems = await tx.cartItem.findMany({
            where: { userId },
            include: { variant: { include: { product: true } } },
            orderBy: { createdAt: 'asc' },
          });
          if (!cartItems.length)
            throw new AppError(400, 'Cart is empty', 'EMPTY_CART');
          for (const item of cartItems) {
            if (!item.variant.product.active)
              throw new AppError(
                409,
                `${item.variant.product.name} is unavailable`,
                'STOCK_CHANGED',
              );
            const reserved = await tx.productVariant.updateMany({
              where: { id: item.variantId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (reserved.count !== 1)
              throw new AppError(
                409,
                `${item.variant.product.name} no longer has enough stock`,
                'STOCK_CHANGED',
              );
          }
          const subtotal = money(
            cartItems.reduce(
              (sum, item) => sum + Number(item.variant.price) * item.quantity,
              0,
            ),
          );
          const coupon = await couponDiscount(
            tx,
            user?.cartCouponCode ?? null,
            subtotal,
          );
          const taxable = money(subtotal - coupon.discount);
          const tax = money(taxable * 0.18);
          const shippingCost = input.shippingMethod === 'express' ? 149 : 0;
          const total = money(taxable + tax + shippingCost);
          const createdOrder = await tx.order.create({
            data: {
              number: orderNumber(),
              userId,
              idempotencyKey: input.idempotencyKey,
              status: OrderStatus.CONFIRMED,
              paymentStatus: 'PENDING',
              paymentMethod: input.paymentMethod,
              shippingMethod: input.shippingMethod,
              shippingAddress: input.shippingAddress,
              couponCode: coupon.couponCode,
              subtotal,
              discount: coupon.discount,
              shippingCost,
              tax,
              total,
            },
          });
          await tx.orderItem.createMany({
            data: cartItems.map(item => ({
              orderId: createdOrder.id,
              productId: item.variant.productId,
              variantId: item.variantId,
              productName: item.variant.product.name,
              variantDetails: {
                sku: item.variant.sku,
                colour: item.variant.colour,
                size: item.variant.size,
              },
              unitPrice: item.variant.price,
              quantity: item.quantity,
            })),
          });
          await tx.orderStatusEvent.create({
            data: {
              orderId: createdOrder.id,
              status: OrderStatus.CONFIRMED,
              message: 'Order confirmed and inventory reserved.',
            },
          });
          await tx.cartItem.deleteMany({ where: { userId } });
          await tx.user.update({
            where: { id: userId },
            data: { cartCouponCode: null },
          });
          const created = await tx.order.findUnique({
            where: { id: createdOrder.id },
            include: orderInclude,
          });
          if (!created)
            throw new AppError(500, 'Created order could not be loaded');
          return { order: publicOrder(created), duplicate: false };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicate = await prisma.order.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: orderInclude,
        });
        if (duplicate?.userId === userId)
          return { order: publicOrder(duplicate), duplicate: true };
      }
      throw error;
    }
  },
  async list(userId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where: { userId } }),
    ]);
    return {
      items: items.map(publicOrder),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
        hasNextPage: page * limit < total,
      },
    };
  },
  async detail(userId: string, identifier: string) {
    const order = await prisma.order.findFirst({
      where: { userId, OR: [{ id: identifier }, { number: identifier }] },
      include: orderInclude,
    });
    if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
    return publicOrder(order);
  },
};
