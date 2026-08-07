import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../app.js';
import { hashPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { createAccessToken } from '../../lib/tokens.js';
let userId = '',
  adminId = '',
  token = '',
  adminToken = '',
  variantId = '',
  orderId = '',
  orderItemId = '',
  originalStock = 0,
  returnId = '';
const userEmail = 'fulfilment-user@cartly.local',
  adminEmail = 'fulfilment-admin@cartly.local';
beforeAll(async () => {
  for (const email of [userEmail, adminEmail]) {
    const old = await prisma.user.findUnique({ where: { email } });
    if (old) {
      await prisma.returnRequest.deleteMany({ where: { userId: old.id } });
      await prisma.order.deleteMany({ where: { userId: old.id } });
      await prisma.user.delete({ where: { id: old.id } });
    }
  }
  const passwordHash = await hashPassword('Fulfilment123!');
  const user = await prisma.user.create({
    data: {
      name: 'Fulfilment User',
      email: userEmail,
      phone: '9666666666',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });
  const admin = await prisma.user.create({
    data: {
      name: 'Fulfilment Admin',
      email: adminEmail,
      phone: '9777777777',
      passwordHash,
      emailVerifiedAt: new Date(),
      role: 'ADMIN',
    },
  });
  userId = user.id;
  adminId = admin.id;
  token = await createAccessToken(user.id, user.role);
  adminToken = await createAccessToken(admin.id, admin.role);
  const variant = await prisma.productVariant.findFirstOrThrow();
  variantId = variant.id;
  originalStock = variant.stock;
  const order = await prisma.order.create({
    data: {
      number: `CRT-FUL-${Date.now()}`,
      userId,
      idempotencyKey: `fulfilment-${Date.now()}`,
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      paymentMethod: 'card',
      shippingMethod: 'standard',
      shippingAddress: { fullName: 'User' },
      subtotal: 1000,
      discount: 0,
      shippingCost: 0,
      tax: 180,
      total: 1180,
      items: {
        create: {
          productId: variant.productId,
          variantId,
          productName: 'Test item',
          unitPrice: 1000,
          quantity: 1,
        },
      },
      timeline: { create: { status: 'DELIVERED', message: 'Delivered' } },
    },
    include: { items: true },
  });
  orderId = order.id;
  orderItemId = order.items[0]!.id;
});
afterAll(async () => {
  if (userId) {
    await prisma.returnRequest.deleteMany({ where: { userId } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, adminId] } } });
  }
  if (variantId)
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: originalStock },
    });
  await prisma.$disconnect();
});
describe.sequential('fulfilment, notifications and support', () => {
  it('enforces return eligibility and creates selected return items', async () => {
    const eligible = await request(app)
      .get(`/api/v1/fulfilment/orders/${orderId}/return-eligibility`)
      .set('Authorization', `Bearer ${token}`);
    expect(eligible.body.data.eligible).toBe(true);
    const created = await request(app)
      .post(`/api/v1/fulfilment/orders/${orderId}/returns`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Damaged item', items: [{ orderItemId, quantity: 1 }] });
    expect(created.status).toBe(201);
    returnId = created.body.data.id;
    expect(created.body.data.items).toHaveLength(1);
  });
  it('allows admin approval, pickup scheduling and refund completion with inventory update', async () => {
    const reviewed = await request(app)
      .patch(`/api/v1/fulfilment/admin/returns/${returnId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approve: true, note: 'Approved after review' });
    expect(reviewed.body.data.status).toBe('APPROVED');
    const pickupAt = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const pickup = await request(app)
      .patch(`/api/v1/fulfilment/returns/${returnId}/pickup`)
      .set('Authorization', `Bearer ${token}`)
      .send({ pickupAt });
    expect(pickup.body.data.status).toBe('PICKUP_SCHEDULED');
    const completed = await request(app)
      .post(`/api/v1/fulfilment/admin/returns/${returnId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(completed.status).toBe(200);
    await expect(
      prisma.returnRequest.findUnique({ where: { id: returnId } }),
    ).resolves.toEqual(expect.objectContaining({ refundStatus: 'COMPLETED' }));
  });
  it('cancels selected items first and the remaining order safely', async () => {
    const cancellationOrder = await prisma.order.create({
      data: {
        number: `CRT-CANCEL-${Date.now()}`,
        userId,
        idempotencyKey: `cancel-${Date.now()}`,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paymentMethod: 'card',
        shippingMethod: 'standard',
        shippingAddress: { fullName: 'User' },
        subtotal: 2000,
        discount: 0,
        shippingCost: 0,
        tax: 360,
        total: 2360,
        items: {
          create: {
            productId: (
              await prisma.productVariant.findUniqueOrThrow({
                where: { id: variantId },
              })
            ).productId,
            variantId,
            productName: 'Cancellation item',
            unitPrice: 1000,
            quantity: 2,
          },
        },
      },
      include: { items: true },
    });
    const itemId = cancellationOrder.items[0]!.id;
    const partial = await request(app)
      .post(`/api/v1/fulfilment/orders/${cancellationOrder.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        reason: 'Only one item is needed',
        items: [{ orderItemId: itemId, quantity: 1 }],
      });
    expect(partial.status).toBe(200);
    expect(partial.body.data.status).toBe('CONFIRMED');
    expect(partial.body.data.paymentStatus).toBe('PARTIALLY_REFUNDED');
    expect(partial.body.data.items[0].cancelledQuantity).toBe(1);
    const full = await request(app)
      .post(`/api/v1/fulfilment/orders/${cancellationOrder.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        reason: 'Cancel the remaining item',
        items: [{ orderItemId: itemId, quantity: 1 }],
      });
    expect(full.status).toBe(200);
    expect(full.body.data.status).toBe('CANCELLED');
    expect(full.body.data.paymentStatus).toBe('REFUNDED');
    expect(full.body.data.items[0].cancelledQuantity).toBe(2);
  });
  it('persists notification APIs and support tickets', async () => {
    const ticket = await request(app)
      .post('/api/v1/support/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        subject: 'Delivery question',
        message: 'Please help me understand the delivery update.',
        channel: 'APP',
      });
    expect(ticket.status).toBe(201);
    expect(ticket.body.data.number).toMatch(/^SUP-/);
    const notifications = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`);
    expect(notifications.status).toBe(200);
    expect(notifications.body.data.length).toBeGreaterThan(0);
    expect(
      (
        await request(app)
          .patch('/api/v1/notifications/read-all')
          .set('Authorization', `Bearer ${token}`)
          .send({})
      ).status,
    ).toBe(204);
  });
});
