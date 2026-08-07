import { z } from 'zod';

export const createOrderSchema = z.object({
  idempotencyKey: z.string().trim().min(12).max(100),
  shippingMethod: z.enum(['standard', 'express']),
  paymentMethod: z.enum(['upi', 'card', 'cod']),
  shippingAddress: z.object({
    fullName: z.string().trim().min(2).max(80),
    phone: z.string().regex(/^\d{10}$/),
    addressLine: z.string().trim().min(5).max(250),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    pincode: z.string().regex(/^\d{6}$/),
  }),
});
