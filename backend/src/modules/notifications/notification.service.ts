import { sendPush } from '../../lib/firebase.js';
import { sendTransactionalEmail } from '../../lib/email.js';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';

export async function notify(
  userId: string,
  title: string,
  message: string,
  type = 'GENERAL',
  data?: Record<string, string>,
) {
  const notification = await prisma.notification.create({
    data: { userId, title, message, type, ...(data ? { data } : {}) },
  });
  const [tokens, user, order] = await Promise.all([
    prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    }),
    data?.orderId
      ? prisma.order.findFirst({
          where: { id: data.orderId, userId },
          select: {
            id: true,
            number: true,
            status: true,
            carrier: true,
            trackingNumber: true,
            estimatedDeliveryAt: true,
          },
        })
      : Promise.resolve(null),
  ]);
  if (user) {
    const details = order
      ? [
          { label: 'Status', value: order.status.replaceAll('_', ' ') },
          ...(order.carrier
            ? [{ label: 'Carrier', value: order.carrier }]
            : []),
          ...(order.trackingNumber
            ? [{ label: 'Tracking number', value: order.trackingNumber }]
            : []),
          ...(order.estimatedDeliveryAt
            ? [
                {
                  label: 'Estimated delivery',
                  value: order.estimatedDeliveryAt.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }),
                },
              ]
            : []),
        ]
      : [];
    const trackUrl = order
      ? `${env.MOBILE_APP_SCHEME.replace(
          /:\/\/$/,
          '',
        )}://orders/${encodeURIComponent(order.id)}/track`
      : undefined;
    void sendTransactionalEmail(
      user.email,
      `Cartly: ${title}`,
      title,
      message,
      {
        preheader: order ? `${order.number}: ${message}` : message,
        ...(order ? { reference: order.number } : {}),
        ...(details.length ? { details } : {}),
        ...(trackUrl
          ? { actionLabel: 'Track your order', actionUrl: trackUrl }
          : {}),
      },
    ).catch(error =>
      console.error(
        `[notification email failed] user=${userId} type=${type}`,
        error,
      ),
    );
  }
  const pushResult = await sendPush(
    tokens.map(item => item.token),
    title,
    message,
    data,
  );
  if (pushResult.sent)
    await prisma.notification.update({
      where: { id: notification.id },
      data: { pushedAt: new Date() },
    });
  return notification;
}
