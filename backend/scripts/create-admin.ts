import { hashPassword } from '../src/lib/password.js';
import { prisma } from '../src/lib/prisma.js';
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(),
  password = process.env.ADMIN_PASSWORD,
  name = process.env.ADMIN_NAME?.trim() || 'Cartly Admin';
if (!email || !password || password.length < 12)
  throw new Error(
    'Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) before running this command.',
  );
const user = await prisma.user.upsert({
  where: { email },
  create: {
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    emailVerifiedAt: new Date(),
    active: true,
  },
  update: {
    name,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    emailVerifiedAt: new Date(),
    active: true,
  },
});
await prisma.$disconnect();
console.info(`Administrator ready: ${user.email}`);
