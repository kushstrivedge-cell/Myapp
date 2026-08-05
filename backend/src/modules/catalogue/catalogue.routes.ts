import {unlink} from 'node:fs/promises';
import {basename, resolve} from 'node:path';
import {Router} from 'express';
import {AppError} from '../../lib/errors.js';
import {authenticate} from '../../middleware/authenticate.js';
import {authorize} from '../../middleware/authorize.js';
import {catalogueService} from './catalogue.service.js';
import {imageMetadataSchema, paginationQuerySchema, productListQuerySchema, relatedQuerySchema, reviewSchema} from './catalogue.schemas.js';
import {productUploadDirectory, uploadProductImage, validateProductImage} from './catalogue.upload.js';

export const catalogueRouter = Router();
const routeParam = (value: string | string[] | undefined) => {
  if (typeof value !== 'string') throw new AppError(400, 'Invalid route parameter', 'INVALID_PARAMETER');
  return value;
};

catalogueRouter.get('/categories', async (_request, response) => {
  response.json({success: true, data: await catalogueService.categories()});
});

catalogueRouter.get('/products', async (request, response) => {
  const query = productListQuerySchema.parse(request.query);
  response.json({success: true, data: await catalogueService.products(query)});
});

catalogueRouter.get('/products/:identifier', async (request, response) => {
  response.json({success: true, data: await catalogueService.product(routeParam(request.params.identifier))});
});

catalogueRouter.get('/products/:identifier/related', async (request, response) => {
  const {limit} = relatedQuerySchema.parse(request.query);
  response.json({success: true, data: await catalogueService.related(routeParam(request.params.identifier), limit)});
});

catalogueRouter.get('/products/:identifier/reviews', async (request, response) => {
  const {page, limit} = paginationQuerySchema.parse(request.query);
  response.json({success: true, data: await catalogueService.reviews(routeParam(request.params.identifier), page, limit)});
});

catalogueRouter.post('/products/:identifier/reviews', authenticate, async (request, response) => {
  const input = reviewSchema.parse(request.body);
  const review = await catalogueService.review(routeParam(request.params.identifier), request.auth!.userId, input);
  response.status(201).json({success: true, data: review});
});

catalogueRouter.post('/products/:identifier/images', authenticate, authorize('ADMIN'), uploadProductImage, async (request, response) => {
  if (!request.file) throw new AppError(400, 'An image file is required', 'IMAGE_REQUIRED');
  try {
    await validateProductImage(request.file.path, request.file.mimetype);
    const metadata = imageMetadataSchema.parse(request.body);
    const image = await catalogueService.addImage(
      routeParam(request.params.identifier),
      `/uploads/products/${request.file.filename}`,
      metadata.alt,
      metadata.position,
    );
    response.status(201).json({success: true, data: image});
  } catch (error) {
    await unlink(request.file.path).catch(() => undefined);
    throw error;
  }
});

catalogueRouter.delete('/products/:identifier/images/:imageId', authenticate, authorize('ADMIN'), async (request, response) => {
  const image = await catalogueService.removeImage(routeParam(request.params.identifier), routeParam(request.params.imageId));
  if (image.url.startsWith('/uploads/products/')) {
    const filePath = resolve(productUploadDirectory, basename(image.url));
    await unlink(filePath).catch(() => undefined);
  }
  response.status(204).send();
});
