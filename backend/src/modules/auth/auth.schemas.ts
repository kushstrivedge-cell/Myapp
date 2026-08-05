import {z} from 'zod';

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8).max(128);
export const registerSchema = z.object({name: z.string().trim().min(2).max(80), email, phone: z.string().regex(/^\d{10}$/), password});
export const verifyOtpSchema = z.object({email, code: z.string().regex(/^\d{6}$/)});
export const loginSchema = z.object({email, password: z.string().min(1).max(128)});
export const refreshSchema = z.object({refreshToken: z.string().min(20)});
export const forgotPasswordSchema = z.object({email});
export const resetPasswordSchema = z.object({email, code: z.string().regex(/^\d{6}$/), newPassword: password});
