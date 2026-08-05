import {Router} from 'express';
import {rateLimit} from 'express-rate-limit';
import {authenticate} from '../../middleware/authenticate.js';
import {authService} from './auth.service.js';
import {forgotPasswordSchema, loginSchema, refreshSchema, registerSchema, resetPasswordSchema, verifyOtpSchema} from './auth.schemas.js';

export const authRouter = Router();
const authLimiter = rateLimit({windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false});
const otpLimiter = rateLimit({windowMs: 10 * 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false});

authRouter.use(authLimiter);
authRouter.post('/register', otpLimiter, async (request, response) => {const result = await authService.register(registerSchema.parse(request.body)); response.status(201).json({success: true, data: result});});
authRouter.post('/verify-email', async (request, response) => {const input = verifyOtpSchema.parse(request.body); response.json({success: true, data: await authService.verifyEmail(input.email, input.code)});});
authRouter.post('/resend-email-otp', otpLimiter, async (request, response) => {const {email} = forgotPasswordSchema.parse(request.body); response.json({success: true, data: await authService.resendEmailOtp(email)});});
authRouter.post('/login', async (request, response) => {const input = loginSchema.parse(request.body); response.json({success: true, data: await authService.login(input.email, input.password)});});
authRouter.post('/refresh', async (request, response) => {const {refreshToken} = refreshSchema.parse(request.body); response.json({success: true, data: await authService.refresh(refreshToken)});});
authRouter.post('/logout', async (request, response) => {const {refreshToken} = refreshSchema.parse(request.body); await authService.logout(refreshToken); response.status(204).send();});
authRouter.post('/forgot-password', otpLimiter, async (request, response) => {const {email} = forgotPasswordSchema.parse(request.body); response.json({success: true, data: await authService.forgotPassword(email)});});
authRouter.post('/reset-password', async (request, response) => {const input = resetPasswordSchema.parse(request.body); response.json({success: true, data: await authService.resetPassword(input.email, input.code, input.newPassword)});});
authRouter.get('/me', authenticate, async (request, response) => {response.json({success: true, data: await authService.me(request.auth!.userId)});});
