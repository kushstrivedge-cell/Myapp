import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { hashPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { createAccessToken } from '../../lib/tokens.js';

const email = 'commerce-integration@cartly.local';
let userId = '';
let token = '';
let variantId = '';
let productId = '';
let originalStock = 0;

beforeAll(async () => {
  const old = await prisma.user.findUnique({ where: { email } });
  if (old) await prisma.user.delete({ where: { id: old.id } });
  const user = await prisma.user.create({
    data: {
      name: 'Commerce Tester',
      email,
      phone: '9444444444',
      passwordHash: await hashPassword('CommerceTest123!'),
      emailVerifiedAt: new Date(),
    },
  });
  userId = user.id;
  token = await createAccessToken(user.id, user.role);
  const variant = await prisma.productVariant.findFirstOrThrow({
    where: { id: { startsWith: 'seed-variant-' }, stock: { gte: 3 } },
    include: { product: true },
  });
  variantId = variant.id;
  productId = variant.productId;
  originalStock = variant.stock;
  await prisma.coupon.upsert({
    where: { code: 'TEST10' },
    create: { code: 'TEST10', percentOff: 10, active: true },
    update: {
      percentOff: 10,
      active: true,
      minimumCart: null,
      expiresAt: null,
    },
  });
});

afterAll(async () => {
  if (variantId)
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: originalStock },
    });
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.coupon.deleteMany({ where: { code: 'TEST10' } });
  await prisma.$disconnect();
});

describe.sequential('cart, guest merge, coupons and wishlist API', () => {
  it('persists a guest cart and returns server-calculated prices', async () => {
    const created = await request(app).post('/api/v1/cart/guest').send({});
    expect(created.status).toBe(201);
    const guestToken = created.body.data.token as string;
    const added = await request(app)
      .post('/api/v1/cart/items')
      .set('x-guest-cart-token', guestToken)
      .send({ variantId, quantity: 2 });
    expect(added.status).toBe(201);
    expect(added.body.data).toEqual(
      expect.objectContaining({
        itemCount: 2,
        subtotal: expect.any(Number),
        total: expect.any(Number),
        stockValid: true,
      }),
    );
    const merged = await request(app)
      .post('/api/v1/cart/merge')
      .set('Authorization', `Bearer ${token}`)
      .send({ guestToken });
    expect(merged.status).toBe(200);
    expect(merged.body.data.itemCount).toBe(2);
    await expect(
      prisma.guestCart.findUnique({ where: { token: guestToken } }),
    ).resolves.toBeNull();
  });

  it('validates coupons on the server and persists the applied code', async () => {
    const response = await request(app)
      .post('/api/v1/cart/coupon')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'test10' });
    expect(response.status).toBe(200);
    expect(response.body.data.couponCode).toBe('TEST10');
    expect(response.body.data.discount).toBeGreaterThan(0);
    await expect(
      prisma.user.findUnique({ where: { id: userId } }),
    ).resolves.toEqual(expect.objectContaining({ cartCouponCode: 'TEST10' }));
  });

  it('persists and removes an authenticated wishlist product', async () => {
    const added = await request(app)
      .post('/api/v1/wishlist')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId });
    expect(added.status).toBe(201);
    expect(added.body.data[0].productId).toBe(productId);
    const removed = await request(app)
      .delete(`/api/v1/wishlist/${productId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(removed.status).toBe(200);
    expect(removed.body.data).toHaveLength(0);
  });

  it('rejects checkout when stock changed after items entered the cart', async () => {
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: 1 },
    });
    const response = await request(app)
      .post('/api/v1/cart/validate-checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingMethod: 'standard' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('STOCK_CHANGED');
    expect(response.body.error.details[0]).toEqual(
      expect.objectContaining({ requested: 2, available: 1 }),
    );
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: originalStock },
    });
  });
});
