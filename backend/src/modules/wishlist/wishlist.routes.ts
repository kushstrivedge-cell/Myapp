import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { wishlistService } from './wishlist.service.js';

export const wishlistRouter = Router();
wishlistRouter.use(authenticate);
wishlistRouter.get('/', async (request, response) =>
  response.json({
    success: true,
    data: await wishlistService.list(request.auth!.userId),
  }),
);
wishlistRouter.post('/', async (request, response) => {
  const { productId } = z
    .object({ productId: z.string().min(1).max(100) })
    .parse(request.body);
  response
    .status(201)
    .json({
      success: true,
      data: await wishlistService.add(request.auth!.userId, productId),
    });
});
wishlistRouter.delete('/:productId', async (request, response) =>
  response.json({
    success: true,
    data: await wishlistService.remove(
      request.auth!.userId,
      request.params.productId!,
    ),
  }),
);
wishlistRouter.delete('/', async (request, response) =>
  response.json({
    success: true,
    data: await wishlistService.clear(request.auth!.userId),
  }),
);
