import { Router } from 'express';
import { z } from 'zod';
import { OrderStatus } from '../../generated/prisma/client.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { fulfilmentService } from './fulfilment.service.js';
export const fulfilmentRouter = Router();
fulfilmentRouter.use(authenticate);
fulfilmentRouter.post('/orders/:id/cancel', async (req, res) => {
  const { reason, items } = z
    .object({
      reason: z.string().trim().min(3).max(250),
      items: z
        .array(
          z.object({
            orderItemId: z.string().min(1),
            quantity: z.number().int().positive(),
          }),
        )
        .optional()
        .default([]),
    })
    .parse(req.body);
  res.json({
    success: true,
    data: await fulfilmentService.cancel(
      req.auth!.userId,
      String(req.params.id),
      reason,
      items,
    ),
  });
});
fulfilmentRouter.get('/orders/:id/return-eligibility', async (req, res) =>
  res.json({
    success: true,
    data: await fulfilmentService.returnEligibility(
      req.auth!.userId,
      String(req.params.id),
    ),
  }),
);
fulfilmentRouter.post('/orders/:id/returns', async (req, res) => {
  const input = z
    .object({
      reason: z.string().trim().min(3).max(500),
      items: z
        .array(
          z.object({
            orderItemId: z.string().min(1),
            quantity: z.number().int().positive(),
          }),
        )
        .min(1),
    })
    .parse(req.body);
  res.status(201).json({
    success: true,
    data: await fulfilmentService.requestReturn(
      req.auth!.userId,
      String(req.params.id),
      input.reason,
      input.items,
    ),
  });
});
fulfilmentRouter.get('/returns', async (req, res) =>
  res.json({
    success: true,
    data: await fulfilmentService.listReturns(req.auth!.userId),
  }),
);
fulfilmentRouter.patch('/returns/:id/pickup', async (req, res) => {
  const { pickupAt } = z.object({ pickupAt: z.coerce.date() }).parse(req.body);
  res.json({
    success: true,
    data: await fulfilmentService.pickup(
      req.auth!.userId,
      String(req.params.id),
      pickupAt,
    ),
  });
});
fulfilmentRouter.patch(
  '/admin/orders/:id/status',
  authorize('ADMIN'),
  async (req, res) => {
    const input = z
      .object({
        status: z.nativeEnum(OrderStatus),
        message: z.string().trim().min(3).max(300),
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
  },
);
fulfilmentRouter.patch(
  '/admin/returns/:id/review',
  authorize('ADMIN'),
  async (req, res) => {
    const input = z
      .object({
        approve: z.boolean(),
        note: z.string().trim().max(500).default(''),
      })
      .parse(req.body);
    res.json({
      success: true,
      data: await fulfilmentService.reviewReturn(
        String(req.params.id),
        input.approve,
        input.note,
      ),
    });
  },
);
fulfilmentRouter.post(
  '/admin/returns/:id/complete',
  authorize('ADMIN'),
  async (req, res) =>
    res.json({
      success: true,
      data: await fulfilmentService.completeReturn(String(req.params.id)),
    }),
);
