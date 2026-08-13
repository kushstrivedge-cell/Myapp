import {createHmac, timingSafeEqual} from 'node:crypto';
import {PaymentStatus, OrderStatus} from '../../generated/prisma/client.js';
import {env} from '../../config/env.js';
import {AppError} from '../../lib/errors.js';
import {prisma} from '../../lib/prisma.js';

function configured() {
  if (!env.RAZORPAY_KEY_ID.startsWith('rzp_test_') || !env.RAZORPAY_KEY_SECRET)
    throw new AppError(503, 'Razorpay Test Mode is not configured', 'PAYMENT_NOT_CONFIGURED');
}

function signature(message: string, secret: string) {
  return createHmac('sha256', secret).update(message).digest('hex');
}

function matches(actual: string, expected: string) {
  const a = Buffer.from(actual, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

async function razorpay<T>(path: string, init: RequestInit = {}): Promise<T> {
  configured();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    const error = body.error as {description?: string} | undefined;
    throw new AppError(502, error?.description ?? 'Razorpay request failed', 'PAYMENT_PROVIDER_ERROR');
  }
  return body as T;
}

async function ownedOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({where: {userId, OR: [{id: orderId}, {number: orderId}]}});
  if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  return order;
}

export const paymentService = {
  async initialize(userId: string, orderId: string, idempotencyKey: string) {
    const order = await ownedOrder(userId, orderId);
    if (order.paymentMethod === 'cod') throw new AppError(400, 'COD does not use online checkout', 'INVALID_PAYMENT_METHOD');
    if (order.paymentStatus === PaymentStatus.PAID) throw new AppError(409, 'Order is already paid', 'ALREADY_PAID');
    const existing = await prisma.paymentAttempt.findUnique({where: {idempotencyKey}});
    if (existing) {
      if (existing.orderId !== order.id) throw new AppError(409, 'Payment key is already in use', 'IDEMPOTENCY_CONFLICT');
      return {keyId: env.RAZORPAY_KEY_ID, providerOrderId: existing.providerOrderId, amount: Math.round(Number(order.total) * 100), currency: 'INR', demo: true};
    }
    const created = await razorpay<{id: string; amount: number; currency: string}>('/orders', {
      method: 'POST',
      body: JSON.stringify({amount: Math.round(Number(order.total) * 100), currency: 'INR', receipt: order.number.slice(0, 40), notes: {cartlyOrderId: order.id, mode: 'demo'}}),
    });
    await prisma.paymentAttempt.create({data: {orderId: order.id, idempotencyKey, providerOrderId: created.id}});
    return {keyId: env.RAZORPAY_KEY_ID, providerOrderId: created.id, amount: created.amount, currency: created.currency, demo: true};
  },

  async verify(userId: string, input: {orderId: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string}) {
    const order = await ownedOrder(userId, input.orderId);
    const attempt = await prisma.paymentAttempt.findFirst({where: {orderId: order.id, providerOrderId: input.razorpay_order_id}});
    if (!attempt) throw new AppError(400, 'Unknown Razorpay order', 'PAYMENT_MISMATCH');
    const expected = signature(`${attempt.providerOrderId}|${input.razorpay_payment_id}`, env.RAZORPAY_KEY_SECRET);
    if (!matches(input.razorpay_signature, expected)) throw new AppError(400, 'Payment signature verification failed', 'INVALID_PAYMENT_SIGNATURE');
    const providerPayment = await razorpay<{id: string; order_id: string; amount: number; currency: string; status: string}>(`/payments/${input.razorpay_payment_id}`);
    if (providerPayment.order_id !== attempt.providerOrderId || providerPayment.amount !== Math.round(Number(order.total) * 100) || providerPayment.currency !== 'INR' || providerPayment.status !== 'captured')
      throw new AppError(409, 'Payment has not been captured for the expected amount', 'PAYMENT_NOT_CAPTURED');
    await prisma.$transaction([
      prisma.paymentAttempt.update({where: {id: attempt.id}, data: {providerPaymentId: input.razorpay_payment_id, status: 'VERIFIED'}}),
      prisma.order.update({where: {id: order.id}, data: {paymentStatus: PaymentStatus.PAID, status: OrderStatus.CONFIRMED}}),
      prisma.orderStatusEvent.create({data: {orderId: order.id, status: OrderStatus.CONFIRMED, message: 'Demo payment verified by Razorpay Test Mode. Order confirmed.'}}),
      prisma.cartItem.deleteMany({where: {userId}}),
      prisma.user.update({where: {id: userId}, data: {cartCouponCode: null}}),
    ]);
    return {verified: true, demo: true};
  },

  async failed(userId: string, input: {orderId: string; razorpay_order_id?: string | undefined; code?: string | undefined; description?: string | undefined}) {
    const order = await ownedOrder(userId, input.orderId);
    await prisma.paymentAttempt.updateMany({where: {orderId: order.id, ...(input.razorpay_order_id ? {providerOrderId: input.razorpay_order_id} : {})}, data: {status: 'FAILED', ...(input.code ? {failureCode: input.code} : {}), ...(input.description ? {failureMessage: input.description} : {})}});
    await prisma.order.update({where: {id: order.id}, data: {paymentStatus: PaymentStatus.FAILED}});
    return {retryAllowed: true};
  },

  async refund(orderId: string, amount: number | undefined, reason: string, idempotencyKey: string) {
    const order = await prisma.order.findUnique({where: {id: orderId}, include: {paymentAttempts: {where: {status: 'VERIFIED'}, orderBy: {createdAt: 'desc'}, take: 1}}});
    if (!order?.paymentAttempts[0]?.providerPaymentId) throw new AppError(409, 'No verified online payment to refund', 'PAYMENT_NOT_REFUNDABLE');
    const refundAmount = amount ?? Number(order.total);
    const refunded = await prisma.paymentRefund.aggregate({where: {orderId: order.id, status: {not: 'FAILED'}}, _sum: {amount: true}});
    if (refundAmount > Number(order.total) - Number(refunded._sum.amount ?? 0)) throw new AppError(400, 'Refund exceeds the remaining paid amount', 'INVALID_REFUND_AMOUNT');
    const prior = await prisma.paymentRefund.findUnique({where: {idempotencyKey}});
    if (prior) return prior;
    const result = await razorpay<{id: string; status: string}>(`/payments/${order.paymentAttempts[0].providerPaymentId}/refund`, {method: 'POST', headers: {'X-Refund-Idempotency': idempotencyKey}, body: JSON.stringify({amount: Math.round(refundAmount * 100), notes: {reason, cartlyOrderId: order.id}})});
    return prisma.paymentRefund.create({data: {orderId: order.id, idempotencyKey, providerRefundId: result.id, amount: refundAmount, status: result.status.toUpperCase(), reason}});
  },

  async webhook(raw: Buffer, receivedSignature: string | undefined, eventId: string | undefined) {
    if (!env.RAZORPAY_WEBHOOK_SECRET) throw new AppError(503, 'Webhook secret is not configured', 'WEBHOOK_NOT_CONFIGURED');
    if (!receivedSignature || !matches(receivedSignature, signature(raw.toString('utf8'), env.RAZORPAY_WEBHOOK_SECRET))) throw new AppError(400, 'Invalid webhook signature', 'INVALID_WEBHOOK_SIGNATURE');
    const payload = JSON.parse(raw.toString('utf8')) as any;
    const id = eventId || signature(raw.toString('utf8'), env.RAZORPAY_WEBHOOK_SECRET);
    if (await prisma.paymentWebhookEvent.findUnique({where: {id}})) return {duplicate: true};
    await prisma.paymentWebhookEvent.create({data: {id, event: String(payload.event)}});
    const payment = payload.payload?.payment?.entity;
    if (payment?.order_id) {
      const status = payload.event === 'payment.captured' ? 'VERIFIED' : payload.event === 'payment.failed' ? 'FAILED' : undefined;
      if (status) {
        const attempt = await prisma.paymentAttempt.findUnique({where: {providerOrderId: payment.order_id}});
        if (attempt) await prisma.$transaction([
          prisma.paymentAttempt.update({where: {id: attempt.id}, data: {status, providerPaymentId: payment.id, ...(payment.error_code ? {failureCode: payment.error_code} : {}), ...(payment.error_description ? {failureMessage: payment.error_description} : {})}}),
          prisma.order.update({where: {id: attempt.orderId}, data: status === 'VERIFIED' ? {paymentStatus: PaymentStatus.PAID, status: OrderStatus.CONFIRMED} : {paymentStatus: PaymentStatus.FAILED}}),
        ]);
      }
    }
    const refund = payload.payload?.refund?.entity;
    if (refund?.id) await prisma.paymentRefund.updateMany({where: {providerRefundId: refund.id}, data: {status: String(refund.status).toUpperCase()}});
    return {duplicate: false};
  },
};
