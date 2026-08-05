import request from 'supertest';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {app} from '../../app.js';
import {prisma} from '../../lib/prisma.js';
import {createAccessToken} from '../../lib/tokens.js';
import {hashPassword} from '../../lib/password.js';

const testEmail = 'catalogue-integration@cartly.local';
let testUserId = '';
let customerToken = '';
let adminToken = '';

beforeAll(async () => {
  const existing = await prisma.user.findUnique({where: {email: testEmail}});
  if (existing) await prisma.user.delete({where: {id: existing.id}});
  const user = await prisma.user.create({data: {
    name: 'Catalogue Tester',
    email: testEmail,
    phone: '9333333333',
    passwordHash: await hashPassword('CatalogueTest123!'),
    emailVerifiedAt: new Date(),
  }});
  testUserId = user.id;
  customerToken = await createAccessToken(user.id, 'CUSTOMER');
  adminToken = await createAccessToken(user.id, 'ADMIN');
  await prisma.review.create({data: {userId: user.id, productId: 'p1', rating: 5, title: 'Catalogue test review', text: 'Test review data.'}});
});

afterAll(async () => {
  if (testUserId) await prisma.user.deleteMany({where: {id: testUserId}});
  await prisma.$disconnect();
});

describe('catalogue API', () => {
  it('lists categories with product counts', async () => {
    const response = await request(app).get('/api/v1/categories');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({slug: 'electronics'}),
        expect.objectContaining({slug: 'fashion'}),
      ]),
    );
  });

  it('searches, filters, sorts and paginates products', async () => {
    const response = await request(app)
      .get('/api/v1/products')
      .query({category: 'electronics', inStock: true, onSale: true, sort: 'price_asc', page: 1, limit: 2});
    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(2);
    expect(response.body.data.pagination.total).toBeGreaterThanOrEqual(2);
    expect(response.body.data.items[0].price).toBeLessThanOrEqual(response.body.data.items[1].price);
    expect(response.body.data.items.every((product: {inStock: boolean; oldPrice: number | null}) => product.inStock && product.oldPrice !== null)).toBe(true);
  });

  it('returns product details, variants and rating summary', async () => {
    const response = await request(app).get('/api/v1/products/p1');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({
      id: 'p1',
      slug: 'noise-cancelling-wireless-headphones',
      inStock: true,
      reviewCount: expect.any(Number),
    }));
    expect(response.body.data.reviewCount).toBeGreaterThanOrEqual(1);
    expect(response.body.data.variants.length).toBeGreaterThan(0);
    expect(response.body.data.images.length).toBeGreaterThan(0);
  });

  it('returns related products and paginated reviews', async () => {
    const [related, reviews] = await Promise.all([
      request(app).get('/api/v1/products/p1/related?limit=2'),
      request(app).get('/api/v1/products/p1/reviews?page=1&limit=2'),
    ]);
    expect(related.status).toBe(200);
    expect(related.body.data.length).toBeLessThanOrEqual(2);
    expect(related.body.data.every((product: {id: string}) => product.id !== 'p1')).toBe(true);
    expect(reviews.status).toBe(200);
    expect(reviews.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(reviews.body.data.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('validates product filters', async () => {
    const response = await request(app).get('/api/v1/products?minPrice=2000&maxPrice=1000');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows an authenticated customer to create or update a review', async () => {
    const response = await request(app)
      .post('/api/v1/products/p1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({rating: 5, title: 'Integration tested', text: 'Review API works.'});
    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(expect.objectContaining({rating: 5, title: 'Integration tested'}));
  });

  it('allows an admin to upload and remove a product image', async () => {
    const upload = await request(app)
      .post('/api/v1/products/p1/images')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('alt', 'Test product image')
      .field('position', '99')
      .attach('image', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]), {filename: 'test.png', contentType: 'image/png'});
    expect(upload.status).toBe(201);
    expect(upload.body.data.url).toMatch(/^\/uploads\/products\//);

    const remove = await request(app)
      .delete(`/api/v1/products/p1/images/${upload.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(remove.status).toBe(204);
  });
});
