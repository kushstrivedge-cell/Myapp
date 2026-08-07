import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { hashPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { createAccessToken } from '../../lib/tokens.js';
let adminId = '',
  customerId = '',
  adminToken = '',
  customerToken = '',
  couponId = '';
const adminEmail = 'admin-api-test@cartly.local',
  customerEmail = 'admin-customer-test@cartly.local';
beforeAll(async () => {
  for (const email of [adminEmail, customerEmail]) {
    const old = await prisma.user.findUnique({ where: { email } });
    if (old) {
      await prisma.order.deleteMany({ where: { userId: old.id } });
      await prisma.user.delete({ where: { id: old.id } });
    }
  }
  const passwordHash = await hashPassword('AdminIntegration123!');
  const admin = await prisma.user.create({
    data: {
      name: 'API Admin',
      email: adminEmail,
      phone: '9888888888',
      passwordHash,
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
    },
  });
  const customer = await prisma.user.create({
    data: {
      name: 'API Customer',
      email: customerEmail,
      phone: '9999999998',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
  adminId = admin.id;
  customerId = customer.id;
  adminToken = await createAccessToken(admin.id, admin.role);
  customerToken = await createAccessToken(customer.id, customer.role);
});
afterAll(async () => {
  if (couponId) await prisma.coupon.deleteMany({ where: { id: couponId } });
  await prisma.user.deleteMany({
    where: { id: { in: [adminId, customerId] } },
  });
  await prisma.$disconnect();
});
describe.sequential('admin API', () => {
  it('rejects customers and returns dashboard data to admins', async () => {
    expect(
      (
        await request(app)
          .get('/api/v1/admin/dashboard')
          .set('Authorization', `Bearer ${customerToken}`)
      ).status,
    ).toBe(403);
    const response = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        customers: expect.any(Number),
        products: expect.any(Number),
        revenue: expect.any(Number),
      }),
    );
  });
  it('manages coupons', async () => {
    const created = await request(app)
      .post('/api/v1/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'ADMIN20',
        percentOff: 20,
        minimumCart: 1000,
        active: true,
      });
    expect(created.status).toBe(201);
    couponId = created.body.data.id;
    const updated = await request(app)
      .patch(`/api/v1/admin/coupons/${couponId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false });
    expect(updated.body.data.active).toBe(false);
  });
  it('suspends a customer and revokes access', async () => {
    const response = await request(app)
      .patch(`/api/v1/admin/customers/${customerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ active: false });
    expect(response.body.data.active).toBe(false);
    expect(
      (await prisma.user.findUnique({ where: { id: customerId } }))?.active,
    ).toBe(false);
  });
  it('returns sales reports and management lists', async () => {
    for (const path of [
      '/api/v1/admin/products',
      '/api/v1/admin/categories',
      '/api/v1/admin/orders',
      '/api/v1/admin/returns',
      '/api/v1/admin/reviews',
      '/api/v1/admin/reports/sales',
    ])
      expect(
        (
          await request(app)
            .get(path)
            .set('Authorization', `Bearer ${adminToken}`)
        ).status,
      ).toBe(200);
  });
});
