import { z } from 'zod';

export const addCartItemSchema = z.object({
  variantId: z.string().trim().min(1).max(191),
  quantity: z.number().int().min(1).max(10).default(1),
});
export const quantitySchema = z.object({
  quantity: z.number().int().min(1).max(10),
});
export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().min(1).max(40),
});
export const checkoutValidationSchema = z.object({
  shippingMethod: z.enum(['standard', 'express']).default('standard'),
});
