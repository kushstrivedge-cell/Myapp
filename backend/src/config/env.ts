import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  APP_ORIGIN: z.string().default('*'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  OTP_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  OTP_TTL_MINUTES: z.coerce.number().int().positive().max(30).default(10),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Cartly <no-reply@cartly.local>'),
  MOBILE_APP_SCHEME: z.string().default('cartly'),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  SUPPORT_EMAIL: z.string().email().default('support@cartly.local'),
  SUPPORT_PHONE: z.string().default('+911800000000'),
  SUPPORT_CHAT_URL: z.string().url().default('https://wa.me/911800000000'),
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
  COD_MAX_ORDER_AMOUNT: z.coerce.number().positive().default(5000),
  COD_BLOCKED_PINCODES: z.string().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    'Invalid environment configuration',
    parsed.error.flatten().fieldErrors,
  );
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;

if (env.RAZORPAY_KEY_ID.startsWith('rzp_live_')) {
  throw new Error('Cartly demo refuses Razorpay live keys; use rzp_test_ credentials only');
}
