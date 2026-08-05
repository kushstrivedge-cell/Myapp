import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/lib/password.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error('DATABASE_URL is required to seed the catalogue');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const categories = [
  { id: 'cat-mobiles', name: 'Mobiles', slug: 'mobiles' },
  { id: 'cat-electronics', name: 'Electronics', slug: 'electronics' },
  { id: 'cat-fashion', name: 'Fashion', slug: 'fashion' },
  { id: 'cat-home', name: 'Home', slug: 'home' },
  { id: 'cat-beauty', name: 'Beauty', slug: 'beauty' },
  { id: 'cat-grocery', name: 'Grocery', slug: 'grocery' },
];

const products = [
  {
    id: 'p1',
    category: 'electronics',
    slug: 'noise-cancelling-wireless-headphones',
    name: 'Noise-cancelling wireless headphones',
    description:
      'Immersive sound, soft ear cushions and reliable all-day battery life for work, travel and everyday listening.',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
    variants: [
      {
        sku: 'HEADPHONE-BLK-STD',
        colour: 'Midnight',
        size: 'Standard',
        price: 1499,
        oldPrice: 2999,
        stock: 24,
      },
      {
        sku: 'HEADPHONE-SND-STD',
        colour: 'Sand',
        size: 'Standard',
        price: 1599,
        oldPrice: 2999,
        stock: 12,
      },
    ],
  },
  {
    id: 'p2',
    category: 'electronics',
    slug: 'smart-fitness-watch-gps',
    name: 'Smart fitness watch with GPS',
    description:
      'Track workouts, heart rate, sleep and daily activity with built-in GPS and a bright, easy-to-read display.',
    image:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
    variants: [
      {
        sku: 'WATCH-BLK-42',
        colour: 'Black',
        size: '42 mm',
        price: 2199,
        oldPrice: 3999,
        stock: 18,
      },
      {
        sku: 'WATCH-BLU-42',
        colour: 'Blue',
        size: '42 mm',
        price: 2299,
        oldPrice: 3999,
        stock: 9,
      },
    ],
  },
  {
    id: 'p3',
    category: 'fashion',
    slug: 'everyday-running-sneakers',
    name: 'Everyday running sneakers',
    description:
      'Lightweight everyday sneakers with breathable support, cushioned comfort and a durable flexible sole.',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
    variants: [
      {
        sku: 'SHOE-RED-8',
        colour: 'Red',
        size: '8',
        price: 1799,
        oldPrice: 2499,
        stock: 14,
      },
      {
        sku: 'SHOE-RED-9',
        colour: 'Red',
        size: '9',
        price: 1799,
        oldPrice: 2499,
        stock: 10,
      },
      {
        sku: 'SHOE-BLK-9',
        colour: 'Black',
        size: '9',
        price: 1899,
        oldPrice: 2599,
        stock: 0,
      },
    ],
  },
  {
    id: 'p4',
    category: 'home',
    slug: 'minimal-adjustable-desk-lamp',
    name: 'Minimal adjustable desk lamp',
    description:
      'A compact adjustable lamp with warm, focused light for reading, studying and comfortable desk work.',
    image:
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80',
    variants: [
      {
        sku: 'LAMP-WHT-STD',
        colour: 'White',
        size: 'Standard',
        price: 799,
        oldPrice: null,
        stock: 31,
      },
      {
        sku: 'LAMP-BLK-STD',
        colour: 'Black',
        size: 'Standard',
        price: 849,
        oldPrice: null,
        stock: 17,
      },
    ],
  },
  {
    id: 'p5',
    category: 'electronics',
    slug: 'portable-bluetooth-speaker',
    name: 'Portable Bluetooth speaker',
    description:
      'Portable room-filling audio with wireless pairing, simple controls and a splash-resistant travel design.',
    image:
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=80',
    variants: [
      {
        sku: 'SPEAKER-BLK-STD',
        colour: 'Black',
        size: 'Standard',
        price: 999,
        oldPrice: 1599,
        stock: 26,
      },
      {
        sku: 'SPEAKER-GRN-STD',
        colour: 'Green',
        size: 'Standard',
        price: 999,
        oldPrice: 1599,
        stock: 8,
      },
    ],
  },
  {
    id: 'p6',
    category: 'fashion',
    slug: 'classic-travel-backpack',
    name: 'Classic travel backpack',
    description:
      'A comfortable organised backpack with padded straps and practical compartments for travel or commuting.',
    image:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80',
    variants: [
      {
        sku: 'BAG-NVY-25L',
        colour: 'Navy',
        size: '25 L',
        price: 1299,
        oldPrice: 1899,
        stock: 22,
      },
      {
        sku: 'BAG-OLV-25L',
        colour: 'Olive',
        size: '25 L',
        price: 1399,
        oldPrice: 1899,
        stock: 11,
      },
    ],
  },
  {
    id: 'p7',
    category: 'home',
    slug: 'stainless-steel-water-bottle',
    name: 'Stainless steel water bottle',
    description:
      'A reusable insulated bottle designed to keep drinks at the right temperature throughout your day.',
    image:
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80',
    variants: [
      {
        sku: 'BOTTLE-BLU-750',
        colour: 'Blue',
        size: '750 ml',
        price: 549,
        oldPrice: null,
        stock: 42,
      },
      {
        sku: 'BOTTLE-SLV-1000',
        colour: 'Silver',
        size: '1 L',
        price: 649,
        oldPrice: null,
        stock: 20,
      },
    ],
  },
  {
    id: 'p8',
    category: 'beauty',
    slug: 'daily-skin-care-essentials-kit',
    name: 'Daily skin care essentials kit',
    description:
      'A simple daily routine with gentle essentials for cleansing, hydrating and caring for your skin.',
    image:
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=80',
    variants: [
      {
        sku: 'SKINCARE-KIT-STD',
        colour: null,
        size: '4 pieces',
        price: 899,
        oldPrice: 1299,
        stock: 16,
      },
    ],
  },
  {
    id: 'p9',
    category: 'grocery',
    slug: 'premium-roasted-coffee-beans',
    name: 'Premium roasted coffee beans',
    description:
      'Freshly roasted whole coffee beans with a balanced aroma and smooth finish for your daily brew.',
    image:
      'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=80',
    variants: [
      {
        sku: 'COFFEE-MED-500',
        colour: 'Medium roast',
        size: '500 g',
        price: 649,
        oldPrice: null,
        stock: 35,
      },
      {
        sku: 'COFFEE-DRK-500',
        colour: 'Dark roast',
        size: '500 g',
        price: 699,
        oldPrice: null,
        stock: 19,
      },
    ],
  },
  {
    id: 'p10',
    category: 'mobiles',
    slug: 'fast-charging-power-bank',
    name: 'Fast charging power bank',
    description:
      'Compact portable power with fast charging, dual-device support and built-in safety protection.',
    image:
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=900&q=80',
    variants: [
      {
        sku: 'POWERBANK-BLK-10K',
        colour: 'Black',
        size: '10,000 mAh',
        price: 1199,
        oldPrice: 1799,
        stock: 28,
      },
      {
        sku: 'POWERBANK-WHT-20K',
        colour: 'White',
        size: '20,000 mAh',
        price: 1799,
        oldPrice: 2499,
        stock: 13,
      },
    ],
  },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: { name: category.name },
    });
  }

  const categoryRows = await prisma.category.findMany();
  const categoryId = new Map(
    categoryRows.map(category => [category.slug, category.id]),
  );

  for (const product of products) {
    const saved = await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        id: product.id,
        categoryId: categoryId.get(product.category)!,
        slug: product.slug,
        name: product.name,
        description: product.description,
      },
      update: {
        categoryId: categoryId.get(product.category)!,
        name: product.name,
        description: product.description,
        active: true,
      },
    });

    for (const variant of product.variants) {
      await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        create: { ...variant, productId: saved.id },
        update: { ...variant, productId: saved.id },
      });
    }

    const existingImage = await prisma.productImage.findFirst({
      where: { productId: saved.id, url: product.image },
    });
    if (!existingImage) {
      await prisma.productImage.create({
        data: {
          productId: saved.id,
          url: product.image,
          alt: product.name,
          position: 0,
        },
      });
    }
  }

  const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
  const reviewers = await Promise.all(
    [
      ['seed-reviewer-a@cartly.local', 'Aarav'],
      ['seed-reviewer-b@cartly.local', 'Meera'],
      ['seed-reviewer-c@cartly.local', 'Kabir'],
    ].map(async ([email, name], index) =>
      prisma.user.upsert({
        where: { email },
        create: {
          name: name!,
          email: email!,
          phone: `900000000${index}`,
          passwordHash,
          emailVerifiedAt: new Date(),
        },
        update: { name: name! },
      }),
    ),
  );

  for (const [productIndex, product] of products.entries()) {
    const ratings = [5, 4, productIndex % 3 === 0 ? 4 : 5];
    for (const [reviewerIndex, reviewer] of reviewers.entries()) {
      await prisma.review.upsert({
        where: {
          userId_productId: { userId: reviewer.id, productId: product.id },
        },
        create: {
          userId: reviewer.id,
          productId: product.id,
          rating: ratings[reviewerIndex]!,
          title: reviewerIndex === 0 ? 'Great everyday value' : 'Worth buying',
          text:
            reviewerIndex === 0
              ? 'Arrived on time and matched the product description.'
              : 'Good quality for the price and easy to use.',
        },
        update: { rating: ratings[reviewerIndex] },
      });
    }
  }

  console.info(
    `Seeded ${categories.length} categories, ${products.length} products and ${
      products.length * reviewers.length
    } reviews.`,
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
