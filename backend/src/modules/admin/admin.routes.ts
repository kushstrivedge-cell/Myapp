import { Router } from 'express';
import { z } from 'zod';
import {
  OrderStatus,
  ReturnStatus,
  UserRole,
} from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { fulfilmentService } from '../fulfilment/fulfilment.service.js';
export const adminRouter = Router();
adminRouter.use(authenticate, authorize('ADMIN'));
const dbData = (value: unknown) => value as never;
adminRouter.get('/dashboard', async (_req, res) => {
  const [start, end] = [new Date(new Date().setHours(0, 0, 0, 0)), new Date()];
  const [users, products, orders, returns, revenue, todayOrders, lowStock] =
    await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.count({ where: { active: true } }),
      prisma.order.count(),
      prisma.returnRequest.count({
        where: {
          status: { in: [ReturnStatus.REQUESTED, ReturnStatus.APPROVED] },
        },
      }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: 'CANCELLED' } },
      }),
      prisma.order.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.productVariant.findMany({
        where: { stock: { lte: 5 } },
        include: { product: { select: { name: true } } },
        orderBy: { stock: 'asc' },
        take: 10,
      }),
    ]);
  res.json({
    success: true,
    data: {
      customers: users,
      products,
      orders,
      pendingReturns: returns,
      revenue: Number(revenue._sum.total ?? 0),
      todayOrders,
      lowStock,
    },
  });
});
adminRouter.get('/categories', async (_req, res) =>
  res.json({
    success: true,
    data: await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    }),
  }),
);
adminRouter.post('/categories', async (req, res) => {
  const input = z
    .object({
      name: z.string().trim().min(2),
      slug: z
        .string()
        .trim()
        .regex(/^[a-z0-9-]+$/),
      parentId: z.string().nullable().optional(),
    })
    .parse(req.body);
  res.status(201).json({
    success: true,
    data: await prisma.category.create({ data: dbData(input) }),
  });
});
adminRouter.patch('/categories/:id', async (req, res) => {
  const input = z
    .object({
      name: z.string().trim().min(2).optional(),
      slug: z
        .string()
        .trim()
        .regex(/^[a-z0-9-]+$/)
        .optional(),
      parentId: z.string().nullable().optional(),
    })
    .parse(req.body);
  res.json({
    success: true,
    data: await prisma.category.update({
      where: { id: String(req.params.id) },
      data: dbData(input),
    }),
  });
});
adminRouter.delete('/categories/:id', async (req, res) => {
  const id = String(req.params.id);
  if (await prisma.product.count({ where: { categoryId: id } }))
    throw new AppError(
      409,
      'Move or delete category products first',
      'CATEGORY_NOT_EMPTY',
    );
  await prisma.category.delete({ where: { id } });
  res.status(204).send();
});
const productInput = z.object({
  name: z.string().trim().min(2),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(10),
  categoryId: z.string().min(1),
  active: z.boolean().default(true),
  variants: z
    .array(
      z.object({
        sku: z.string().trim().min(2),
        colour: z.string().nullable().optional(),
        size: z.string().nullable().optional(),
        price: z.number().positive(),
        oldPrice: z.number().positive().nullable().optional(),
        stock: z.number().int().min(0),
      }),
    )
    .min(1),
});
adminRouter.get('/products', async (_req, res) =>
  res.json({
    success: true,
    data: await prisma.product.findMany({
      include: { category: true, variants: true, images: true },
      orderBy: { updatedAt: 'desc' },
    }),
  }),
);
adminRouter.post('/products', async (req, res) => {
  const input = productInput.parse(req.body);
  const { variants, ...product } = input;
  res.status(201).json({
    success: true,
    data: await prisma.product.create({
      data: dbData({ ...product, variants: { create: variants } }),
      include: { variants: true, category: true },
    }),
  });
});
adminRouter.patch('/products/:id', async (req, res) => {
  const input = productInput.omit({ variants: true }).partial().parse(req.body);
  res.json({
    success: true,
    data: await prisma.product.update({
      where: { id: String(req.params.id) },
      data: dbData(input),
      include: { variants: true, category: true },
    }),
  });
});
adminRouter.delete('/products/:id', async (req, res) => {
  await prisma.product.update({
    where: { id: String(req.params.id) },
    data: { active: false },
  });
  res.status(204).send();
});
adminRouter.patch('/variants/:id', async (req, res) => {
  const input = z
    .object({
      price: z.number().positive().optional(),
      oldPrice: z.number().positive().nullable().optional(),
      stock: z.number().int().min(0).optional(),
    })
    .parse(req.body);
  res.json({
    success: true,
    data: await prisma.productVariant.update({
      where: { id: String(req.params.id) },
      data: dbData(input),
    }),
  });
});
adminRouter.get('/orders', async (_req, res) =>
  res.json({
    success: true,
    data: await prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
        items: true,
        timeline: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  }),
);
adminRouter.patch('/orders/:id/status', async (req, res) => {
  const input = z
    .object({
      status: z.nativeEnum(OrderStatus),
      message: z.string().trim().min(3),
      carrier: z.string().trim().min(2).max(80).optional(),
      trackingNumber: z.string().trim().min(3).max(100).optional(),
      estimatedDeliveryAt: z.coerce.date().optional(),
      cancellationReason: z.string().trim().min(3).max(300).optional(),
    })
    .parse(req.body);
  res.json({
    success: true,
    data: await fulfilmentService.updateOrder(
      req.auth!.userId,
      String(req.params.id),
      input.status,
      input.message,
      {
        carrier: input.carrier,
        trackingNumber: input.trackingNumber,
        estimatedDeliveryAt: input.estimatedDeliveryAt,
        cancellationReason: input.cancellationReason,
      },
    ),
  });
});
adminRouter.get('/returns', async (_req, res) =>
  res.json({
    success: true,
    data: await prisma.returnRequest.findMany({
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { number: true } },
        items: { include: { orderItem: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  }),
);
adminRouter.patch('/returns/:id/review', async (req, res) => {
  const input = z
    .object({ approve: z.boolean(), note: z.string().default('') })
    .parse(req.body);
  res.json({
    success: true,
    data: await fulfilmentService.reviewReturn(
      String(req.params.id),
      input.approve,
      input.note,
    ),
  });
});
adminRouter.patch('/returns/:id/status', async (req, res) => {
  const input = z
    .object({
      status: z.nativeEnum(ReturnStatus),
      note: z.string().trim().max(500).default(''),
    })
    .parse(req.body);
  res.json({
    success: true,
    data: await fulfilmentService.updateReturnStatus(
      String(req.params.id),
      input.status,
      input.note,
    ),
  });
});
adminRouter.post('/returns/:id/complete', async (req, res) =>
  res.json({
    success: true,
    data: await fulfilmentService.completeReturn(String(req.params.id)),
  }),
);
adminRouter.get('/coupons', async (_req, res) =>
  res.json({
    success: true,
    data: await prisma.coupon.findMany({ orderBy: { code: 'asc' } }),
  }),
);
const coupon = z.object({
  code: z.string().trim().toUpperCase().min(2),
  percentOff: z.number().int().min(1).max(100).nullable().optional(),
  amountOff: z.number().positive().nullable().optional(),
  minimumCart: z.number().min(0).nullable().optional(),
  active: z.boolean().default(true),
  startsAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});
adminRouter.post('/coupons', async (req, res) =>
  res.status(201).json({
    success: true,
    data: await prisma.coupon.create({ data: dbData(coupon.parse(req.body)) }),
  }),
);
adminRouter.patch('/coupons/:id', async (req, res) =>
  res.json({
    success: true,
    data: await prisma.coupon.update({
      where: { id: String(req.params.id) },
      data: dbData(coupon.partial().parse(req.body)),
    }),
  }),
);
adminRouter.delete('/coupons/:id', async (req, res) => {
  await prisma.coupon.delete({ where: { id: String(req.params.id) } });
  res.status(204).send();
});
adminRouter.get('/customers', async (_req, res) =>
  res.json({
    success: true,
    data: await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        createdAt: true,
        _count: { select: { orders: true, reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
  }),
);
adminRouter.patch('/customers/:id', async (req, res) => {
  const input = z
    .object({
      active: z.boolean().optional(),
      role: z.nativeEnum(UserRole).optional(),
    })
    .parse(req.body);
  const user = await prisma.user.update({
    where: { id: String(req.params.id) },
    data: dbData(input),
    select: { id: true, name: true, email: true, active: true, role: true },
  });
  if (input.active === false)
    await prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  res.json({ success: true, data: user });
});
adminRouter.get('/reviews', async (_req, res) =>
  res.json({
    success: true,
    data: await prisma.review.findMany({
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
  }),
);
adminRouter.delete('/reviews/:id', async (req, res) => {
  await prisma.review.delete({ where: { id: String(req.params.id) } });
  res.status(204).send();
});
adminRouter.get('/reports/sales', async (req, res) => {
  const q = z
    .object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    })
    .parse(req.query);
  const orders = await prisma.order.findMany({
    where: {
      createdAt: dbData({
        ...(q.from ? { gte: q.from } : {}),
        ...(q.to ? { lte: q.to } : {}),
      }),
      status: { not: 'CANCELLED' },
    },
    select: {
      createdAt: true,
      total: true,
      discount: true,
      tax: true,
      shippingCost: true,
    },
  });
  const daily = new Map<string, { orders: number; revenue: number }>();
  for (const order of orders) {
    const day = order.createdAt.toISOString().slice(0, 10);
    const value = daily.get(day) ?? { orders: 0, revenue: 0 };
    value.orders++;
    value.revenue += Number(order.total);
    daily.set(day, value);
  }
  res.json({
    success: true,
    data: {
      summary: {
        orders: orders.length,
        revenue: orders.reduce((sum, o) => sum + Number(o.total), 0),
        discounts: orders.reduce((sum, o) => sum + Number(o.discount), 0),
        tax: orders.reduce((sum, o) => sum + Number(o.tax), 0),
      },
      daily: [...daily]
        .map(([date, value]) => ({ date, ...value }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    },
  });
});
