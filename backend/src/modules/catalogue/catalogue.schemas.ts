import { z } from 'zod';

const optionalNumber = z.preprocess(
  value => (value === undefined ? undefined : Number(value)),
  z.number().finite().nonnegative().optional(),
);

const optionalBoolean = z.preprocess(value => {
  if (value === undefined) return undefined;
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}, z.boolean().optional());

export const productListQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    category: z.string().trim().toLowerCase().max(80).optional(),
    minPrice: optionalNumber,
    maxPrice: optionalNumber,
    minRating: optionalNumber.pipe(z.number().max(5).optional()),
    inStock: optionalBoolean,
    onSale: optionalBoolean,
    sort: z
      .enum(['popular', 'rating', 'price_asc', 'price_desc', 'newest'])
      .default('popular'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  })
  .refine(
    value =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    {
      message: 'Minimum price cannot exceed maximum price',
      path: ['minPrice'],
    },
  );

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const relatedQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(20).default(6),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(100).optional(),
  text: z.string().trim().min(10).max(2000).optional(),
});

export const imageMetadataSchema = z.object({
  alt: z.string().trim().max(160).optional(),
  position: z.coerce.number().int().min(0).max(1000).default(0),
});
