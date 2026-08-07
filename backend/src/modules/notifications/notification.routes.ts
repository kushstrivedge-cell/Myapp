import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import { prisma } from '../../lib/prisma.js';

export const notificationRouter = Router();
notificationRouter.use(authenticate);
notificationRouter.get('/', async (request, response) =>
  response.json({
    success: true,
    data: await prisma.notification.findMany({
      where: { userId: request.auth!.userId },
      orderBy: { createdAt: 'desc' },
    }),
  }),
);
notificationRouter.patch('/read-all', async (request, response) => {
  await prisma.notification.updateMany({
    where: { userId: request.auth!.userId, readAt: null },
    data: { readAt: new Date() },
  });
  response.status(204).send();
});
notificationRouter.delete('/', async (request, response) => {
  await prisma.notification.deleteMany({
    where: { userId: request.auth!.userId },
  });
  response.status(204).send();
});
notificationRouter.post('/device-token', async (request, response) => {
  const input = z
    .object({ token: z.string().min(20), platform: z.enum(['android', 'ios']) })
    .parse(request.body);
  const item = await prisma.deviceToken.upsert({
    where: { token: input.token },
    create: { ...input, userId: request.auth!.userId },
    update: { ...input, userId: request.auth!.userId },
  });
  response.status(201).json({ success: true, data: item });
});
