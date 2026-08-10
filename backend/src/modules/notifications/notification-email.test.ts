import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { hashPassword } from '../../lib/password.js';
import { uniqueTestIdentity } from '../../test/testData.js';

const mocks = vi.hoisted(() => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue(undefined),
  sendPush: vi.fn().mockResolvedValue({ sent: 0, disabled: true }),
}));

vi.mock('../../lib/email.js', () => ({
  sendTransactionalEmail: mocks.sendTransactionalEmail,
}));
vi.mock('../../lib/firebase.js', () => ({ sendPush: mocks.sendPush }));

import { notify } from './notification.service.js';

let userId = '';
let orderId = '';

beforeAll(async () => {
  const identity = uniqueTestIdentity('notification-email');
  const user = await prisma.user.create({
    data: {
      name: 'Email Tester',
      email: identity.email,
      phone: identity.phone,
      passwordHash: await hashPassword('EmailTest123!'),
      emailVerifiedAt: new Date(),
    },
  });
  userId = user.id;
  const order = await prisma.order.create({
    data: {
      number: `CRT-TEST-${Date.now()}`,
      userId,
      status: 'SHIPPED',
      paymentMethod: 'cod',
      shippingMethod: 'standard',
      shippingAddress: { city: 'Delhi', pincode: '110001' },
      idempotencyKey: `notification-email-${Date.now()}`,
      subtotal: 1000,
      tax: 180,
      total: 1180,
      carrier: 'Cartly Express',
      trackingNumber: 'TRACK123456',
      estimatedDeliveryAt: new Date('2026-08-12T00:00:00.000Z'),
    },
  });
  orderId = order.id;
});

afterAll(async () => {
  if (orderId) await prisma.order.deleteMany({ where: { id: orderId } });
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe('order notification email delivery', () => {
  it('builds shipment email metadata with a working tracking deep link', async () => {
    await notify(
      userId,
      'Order shipped',
      'Your package was handed to the delivery partner.',
      'ORDER_SHIPPED',
      { orderId },
    );

    expect(mocks.sendTransactionalEmail).toHaveBeenCalledWith(
      expect.stringContaining('@cartly.local'),
      'Cartly: Order shipped',
      'Order shipped',
      expect.stringContaining('delivery partner'),
      expect.objectContaining({
        actionLabel: 'Track your order',
        actionUrl: `cartly://orders/${orderId}/track`,
        details: expect.arrayContaining([
          { label: 'Carrier', value: 'Cartly Express' },
          { label: 'Tracking number', value: 'TRACK123456' },
        ]),
      }),
    );
  });
});
