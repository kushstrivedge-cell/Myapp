import request from 'supertest';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {app} from '../../app.js';
import {hashPassword, verifyPassword} from '../../lib/password.js';
import {prisma} from '../../lib/prisma.js';
import {createAccessToken} from '../../lib/tokens.js';

const email = 'account-address-integration@cartly.local';
const originalPassword = 'OriginalPass123!';
const newPassword = 'ChangedPass456!';
let userId = '';
let token = '';

beforeAll(async () => {
  const existing = await prisma.user.findUnique({where: {email}});
  if (existing) {
    await prisma.returnRequest.deleteMany({where: {userId: existing.id}});
    await prisma.order.deleteMany({where: {userId: existing.id}});
    await prisma.user.delete({where: {id: existing.id}});
  }
  const user = await prisma.user.create({data: {
    name: 'Account Test',
    email,
    phone: '9111111111',
    passwordHash: await hashPassword(originalPassword),
    emailVerifiedAt: new Date(),
  }});
  userId = user.id;
  token = await createAccessToken(user.id, user.role);
});

afterAll(async () => {
  const existing = await prisma.user.findUnique({where: {email}});
  if (existing) {
    await prisma.returnRequest.deleteMany({where: {userId: existing.id}});
    await prisma.order.deleteMany({where: {userId: existing.id}});
    await prisma.user.delete({where: {id: existing.id}});
  }
  await prisma.$disconnect();
});

describe.sequential('account and address API', () => {
  it('updates the authenticated profile in PostgreSQL', async () => {
    const response = await request(app)
      .patch('/api/v1/account/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({name: 'Updated Account', phone: '9222222222'});
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({name: 'Updated Account', phone: '9222222222', email}));
    await expect(prisma.user.findUnique({where: {id: userId}})).resolves.toEqual(expect.objectContaining({name: 'Updated Account'}));
  });

  it('creates, updates, defaults and deletes owned addresses', async () => {
    const first = await request(app)
      .post('/api/v1/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({fullName: 'Updated Account', phone: '9222222222', addressLine: '12 First Street', city: 'Delhi', state: 'Delhi', pincode: '110001'});
    expect(first.status).toBe(201);
    expect(first.body.data.isDefault).toBe(true);

    const second = await request(app)
      .post('/api/v1/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({fullName: 'Updated Account', phone: '9222222222', addressLine: '25 Second Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400001'});
    expect(second.status).toBe(201);
    expect(second.body.data.isDefault).toBe(false);

    const updated = await request(app)
      .patch(`/api/v1/addresses/${second.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({fullName: 'Updated Account', phone: '9222222222', addressLine: '26 Updated Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400001'});
    expect(updated.status).toBe(200);
    expect(updated.body.data.addressLine).toBe('26 Updated Street');

    const madeDefault = await request(app)
      .patch(`/api/v1/addresses/${second.body.data.id}/default`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(madeDefault.status).toBe(200);
    expect(madeDefault.body.data.isDefault).toBe(true);

    const removed = await request(app)
      .delete(`/api/v1/addresses/${second.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(removed.status).toBe(204);

    const list = await request(app).get('/api/v1/addresses').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toEqual(expect.objectContaining({id: first.body.data.id, isDefault: true}));
  });

  it('changes the password and revokes active refresh sessions', async () => {
    await prisma.refreshToken.create({data: {userId, tokenHash: `test-${userId}`, expiresAt: new Date(Date.now() + 86_400_000)}});
    const response = await request(app)
      .post('/api/v1/account/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({currentPassword: originalPassword, newPassword});
    expect(response.status).toBe(200);
    const updated = await prisma.user.findUniqueOrThrow({where: {id: userId}});
    expect(await verifyPassword(newPassword, updated.passwordHash)).toBe(true);
    expect(await prisma.refreshToken.count({where: {userId, revokedAt: null}})).toBe(0);
  }, 20_000);

  it('requires the password and permanently deletes the account', async () => {
    const rejected = await request(app)
      .delete('/api/v1/account')
      .set('Authorization', `Bearer ${token}`)
      .send({password: 'WrongPassword123!'});
    expect(rejected.status).toBe(400);

    const deleted = await request(app)
      .delete('/api/v1/account')
      .set('Authorization', `Bearer ${token}`)
      .send({password: newPassword});
    expect(deleted.status).toBe(204);
    expect(await prisma.user.findUnique({where: {id: userId}})).toBeNull();
  });
});
