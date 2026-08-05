import { Router } from 'express';
import { AppError } from '../../lib/errors.js';
import { authenticate } from '../../middleware/authenticate.js';
import { addressService } from './address.service.js';
import { createAddressSchema, updateAddressSchema } from './address.schemas.js';

export const addressRouter = Router();
addressRouter.use(authenticate);

const routeParam = (value: string | string[] | undefined) => {
  if (typeof value !== 'string')
    throw new AppError(400, 'Invalid address identifier', 'INVALID_PARAMETER');
  return value;
};

addressRouter.get('/', async (request, response) => {
  response.json({
    success: true,
    data: await addressService.list(request.auth!.userId),
  });
});

addressRouter.post('/', async (request, response) => {
  const input = createAddressSchema.parse(request.body);
  response
    .status(201)
    .json({
      success: true,
      data: await addressService.create(request.auth!.userId, input),
    });
});

addressRouter.patch('/:addressId', async (request, response) => {
  const input = updateAddressSchema.parse(request.body);
  response.json({
    success: true,
    data: await addressService.update(
      request.auth!.userId,
      routeParam(request.params.addressId),
      input,
    ),
  });
});

addressRouter.patch('/:addressId/default', async (request, response) => {
  response.json({
    success: true,
    data: await addressService.makeDefault(
      request.auth!.userId,
      routeParam(request.params.addressId),
    ),
  });
});

addressRouter.delete('/:addressId', async (request, response) => {
  await addressService.remove(
    request.auth!.userId,
    routeParam(request.params.addressId),
  );
  response.status(204).send();
});
