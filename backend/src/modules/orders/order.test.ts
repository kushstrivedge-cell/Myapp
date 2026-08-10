import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { hashPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { createAccessToken } from '../../lib/tokens.js';
import { uniqueTestIdentity } from '../../test/testData.js';
import { randomUUID } from 'node:crypto';

const identity = uniqueTestIdentity('orders-integration');
const idempotencyKey = `order-${randomUUID()}`;
let userId = '';
let token = '';
let variantId = '';
let originalStock = 0;
let orderId = '';
const payload = {
  idempotencyKey,
  shippingMethod: 'standard',
  paymentMethod: 'cod',
  shippingAddress: {
    fullName: 'Order Tester',
    phone: identity.phone,
    addressLine: '42 Transaction Road',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
  },
};

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      name: 'Order Tester',
      email: identity.email,
      phone: identity.phone,
      passwordHash: await hashPassword('OrderTest123!'),
      emailVerifiedAt: new Date(),
    },
  });
  userId = user.id;
  token = await createAccessToken(user.id, user.role);
  const variant = await prisma.productVariant.findFirstOrThrow({
    where: { stock: { gte: 5 } },
  });
  variantId = variant.id;
  originalStock = variant.stock;
  await prisma.cartItem.create({ data: { userId, variantId, quantity: 2 } });
});

afterAll(async () => {
  if (orderId) await prisma.order.deleteMany({ where: { id: orderId } });
  if (userId) {
    await prisma.cartItem.deleteMany({ where: { userId } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  if (variantId)
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: originalStock },
    });
  await prisma.$disconnect();
});

describe.sequential('real checkout and orders API', () => {
  it('rejects malformed checkout addresses before changing cart data', async () => {
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...payload,
        shippingAddress: { ...payload.shippingAddress, pincode: '123' },
      });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    await expect(prisma.cartItem.count({ where: { userId } })).resolves.toBe(1);
  });

  it('creates an atomic server-priced order, reserves inventory and clears the cart', async () => {
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(response.status).toBe(201);
    expect(response.body.data.duplicate).toBe(false);
    const order = response.body.data.order;
    orderId = order.id;
    expect(order.number).toMatch(/^CRT-\d{8}-[A-F0-9]{8}$/);
    expect(order).toEqual(
      expect.objectContaining({
        subtotal: expect.any(Number),
        discount: expect.any(Number),
        shippingCost: expect.any(Number),
        tax: expect.any(Number),
        total: expect.any(Number),
      }),
    );
    expect(order.tax).toBeGreaterThan(0);
    expect(order.shippingCost).toBe(0);
    expect(order.total).toBe(
      order.subtotal - order.discount + order.tax + order.shippingCost,
    );
    expect(order.timeline[0].status).toBe('CONFIRMED');
    await expect(prisma.cartItem.count({ where: { userId } })).resolves.toBe(0);
    await expect(
      prisma.productVariant.findUnique({ where: { id: variantId } }),
    ).resolves.toEqual(expect.objectContaining({ stock: originalStock - 2 }));
  });

  it('returns the original order for a duplicate checkout attempt without deducting stock twice', async () => {
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(response.status).toBe(200);
    expect(response.body.data.duplicate).toBe(true);
    expect(response.body.data.order.id).toBe(orderId);
    await expect(
      prisma.productVariant.findUnique({ where: { id: variantId } }),
    ).resolves.toEqual(expect.objectContaining({ stock: originalStock - 2 }));
  });

  it('returns authenticated order history, details and timeline', async () => {
    const history = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`);
    expect(history.status).toBe(200);
    expect(history.body.data.items[0].id).toBe(orderId);
    const details = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(details.status).toBe(200);
    expect(details.body.data.items).toHaveLength(1);
    const timeline = await request(app)
      .get(`/api/v1/orders/${orderId}/timeline`)
      .set('Authorization', `Bearer ${token}`);
    expect(timeline.status).toBe(200);
    expect(timeline.body.data[0].message).toContain('inventory reserved');
  });

  it('rolls back and preserves the cart when inventory cannot be reserved', async () => {
    await prisma.cartItem.create({ data: { userId, variantId, quantity: 2 } });
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: 1 },
    });
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...payload,
        idempotencyKey: `rollback-${randomUUID()}`,
      });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('STOCK_CHANGED');
    await expect(
      prisma.cartItem.findUnique({
        where: { userId_variantId: { userId, variantId } },
      }),
    ).resolves.toEqual(expect.objectContaining({ quantity: 2 }));
    await expect(prisma.order.count({ where: { userId } })).resolves.toBe(1);
  });
});
