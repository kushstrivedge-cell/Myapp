import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { notify } from '../notifications/notification.service.js';
import { createOrderSchema } from './order.schemas.js';
import { orderService } from './order.service.js';

export const orderRouter = Router();
orderRouter.use(authenticate);

orderRouter.post('/', async (request, response) => {
  const result = await orderService.create(
    request.auth!.userId,
    createOrderSchema.parse(request.body),
  );
  if (!result.duplicate && result.order.status === 'CONFIRMED')
    void notify(
      request.auth!.userId,
      'Order confirmed',
      `${result.order.number} has been confirmed. Total: ₹${result.order.total}.`,
      'ORDER_CONFIRMED',
      { orderId: result.order.id },
    );
  response
    .status(result.duplicate ? 200 : 201)
    .json({ success: true, data: result });
});

orderRouter.get('/', async (request, response) => {
  const query = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    })
    .parse(request.query);
  response.json({
    success: true,
    data: await orderService.list(
      request.auth!.userId,
      query.page,
      query.limit,
    ),
  });
});

orderRouter.get('/:orderId/timeline', async (request, response) => {
  const order = await orderService.detail(
    request.auth!.userId,
    String(request.params.orderId),
  );
  response.json({ success: true, data: order.timeline });
});

orderRouter.get('/:orderId', async (request, response) =>
  response.json({
    success: true,
    data: await orderService.detail(
      request.auth!.userId,
      String(request.params.orderId),
    ),
  }),
);
