import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { optionalAuthenticate } from '../../middleware/optionalAuthenticate.js';
import { cartService } from './cart.service.js';
import {
  addCartItemSchema,
  checkoutValidationSchema,
  couponSchema,
  quantitySchema,
} from './cart.schemas.js';

export const cartRouter = Router();
const owner = (request: {
  auth?: { userId: string };
  header(name: string): string | undefined;
}) => ({
  userId: request.auth?.userId,
  guestToken: request.header('x-guest-cart-token'),
});

cartRouter.post('/guest', async (_request, response) =>
  response
    .status(201)
    .json({ success: true, data: await cartService.createGuest() }),
);
cartRouter.get('/', optionalAuthenticate, async (request, response) =>
  response.json({ success: true, data: await cartService.get(owner(request)) }),
);
cartRouter.post('/items', optionalAuthenticate, async (request, response) => {
  const input = addCartItemSchema.parse(request.body);
  response
    .status(201)
    .json({
      success: true,
      data: await cartService.add(
        owner(request),
        input.variantId,
        input.quantity,
      ),
    });
});
cartRouter.patch(
  '/items/:itemId',
  optionalAuthenticate,
  async (request, response) => {
    const { quantity } = quantitySchema.parse(request.body);
    response.json({
      success: true,
      data: await cartService.quantity(
        owner(request),
        String(request.params.itemId),
        quantity,
      ),
    });
  },
);
cartRouter.delete(
  '/items/:itemId',
  optionalAuthenticate,
  async (request, response) =>
    response.json({
      success: true,
      data: await cartService.remove(
        owner(request),
        String(request.params.itemId),
      ),
    }),
);
cartRouter.delete('/', optionalAuthenticate, async (request, response) =>
  response.json({
    success: true,
    data: await cartService.clear(owner(request)),
  }),
);
cartRouter.post('/coupon', optionalAuthenticate, async (request, response) => {
  const { code } = couponSchema.parse(request.body);
  response.json({
    success: true,
    data: await cartService.coupon(owner(request), code),
  });
});
cartRouter.delete('/coupon', optionalAuthenticate, async (request, response) =>
  response.json({
    success: true,
    data: await cartService.coupon(owner(request), null),
  }),
);
cartRouter.post('/merge', authenticate, async (request, response) => {
  const token = String(request.body?.guestToken ?? '');
  response.json({
    success: true,
    data: await cartService.merge(request.auth!.userId, token),
  });
});
cartRouter.post(
  '/validate-checkout',
  authenticate,
  async (request, response) => {
    const { shippingMethod } = checkoutValidationSchema.parse(request.body);
    response.json({
      success: true,
      data: await cartService.validate(
        { userId: request.auth!.userId },
        shippingMethod,
      ),
    });
  },
);
