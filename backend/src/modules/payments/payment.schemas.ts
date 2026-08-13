import {z} from 'zod';

export const initializePaymentSchema = z.object({
  orderId: z.string().min(1),
  idempotencyKey: z.string().trim().min(12).max(100),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});

export const failedPaymentSchema = z.object({
  orderId: z.string().min(1),
  razorpay_order_id: z.string().optional(),
  code: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export const refundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().trim().min(3).max(250),
  idempotencyKey: z.string().trim().min(10).max(100).regex(/^[A-Za-z0-9_-]+$/),
});
