import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/authenticate.js';
import { prisma } from '../../lib/prisma.js';
import { notify } from '../notifications/notification.service.js';
export const supportRouter = Router();
supportRouter.get('/contacts', (_req, res) =>
  res.json({
    success: true,
    data: {
      email: env.SUPPORT_EMAIL,
      phone: env.SUPPORT_PHONE,
      chatUrl: env.SUPPORT_CHAT_URL,
    },
  }),
);
supportRouter.use(authenticate);
supportRouter.get('/tickets', async (req, res) =>
  res.json({
    success: true,
    data: await prisma.supportTicket.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: 'desc' },
    }),
  }),
);
supportRouter.post('/tickets', async (req, res) => {
  const input = z
    .object({
      subject: z.string().trim().min(3).max(120),
      message: z.string().trim().min(10).max(3000),
      channel: z.enum(['APP', 'EMAIL', 'CHAT', 'CALL']).default('APP'),
    })
    .parse(req.body);
  const ticket = await prisma.supportTicket.create({
    data: {
      ...input,
      userId: req.auth!.userId,
      number: `SUP-${randomBytes(4).toString('hex').toUpperCase()}`,
    },
  });
  await notify(
    req.auth!.userId,
    'Support request received',
    `${ticket.number} is open. Our team will respond soon.`,
    'SUPPORT',
  );
  res.status(201).json({ success: true, data: ticket });
});
