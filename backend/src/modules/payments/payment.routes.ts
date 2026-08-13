import {Router} from 'express';
import {authenticate} from '../../middleware/authenticate.js';
import {authorize} from '../../middleware/authorize.js';
import {failedPaymentSchema, initializePaymentSchema, refundSchema, verifyPaymentSchema} from './payment.schemas.js';
import {paymentService} from './payment.service.js';

export const paymentRouter = Router();
paymentRouter.use(authenticate);
paymentRouter.post('/initialize', async (req, res) => {const input = initializePaymentSchema.parse(req.body); res.status(201).json({success: true, data: await paymentService.initialize(req.auth!.userId, input.orderId, input.idempotencyKey)});});
paymentRouter.post('/verify', async (req, res) => {const input = verifyPaymentSchema.parse(req.body); res.json({success: true, data: await paymentService.verify(req.auth!.userId, input)});});
paymentRouter.post('/failed', async (req, res) => {const input = failedPaymentSchema.parse(req.body); res.json({success: true, data: await paymentService.failed(req.auth!.userId, input)});});
paymentRouter.post('/orders/:orderId/refunds', authorize('ADMIN'), async (req, res) => {const input = refundSchema.parse(req.body); res.status(201).json({success: true, data: await paymentService.refund(String(req.params.orderId), input.amount, input.reason, input.idempotencyKey)});});
