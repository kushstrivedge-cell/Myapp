import {
  OrderStatus,
  PaymentStatus,
  ReturnStatus,
} from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { notify } from '../notifications/notification.service.js';
const completableReturnStatuses: ReturnStatus[] = [
  ReturnStatus.APPROVED,
  ReturnStatus.PICKUP_SCHEDULED,
  ReturnStatus.RECEIVED,
];
const money = (value: number) => Math.round(value * 100) / 100;

async function ownedOrder(userId: string, id: string) {
  const order = await prisma.order.findFirst({
    where: { userId, OR: [{ id }, { number: id }] },
    include: { items: true, user: true },
  });
  if (!order) throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  return order;
}
async function announce(
  userId: string,
  title: string,
  message: string,
  type: string,
  orderId: string,
) {
  await notify(userId, title, message, type, { orderId });
}

export const fulfilmentService = {
  async cancel(
    userId: string,
    id: string,
    reason: string,
    selections: Array<{ orderItemId: string; quantity: number }> = [],
  ) {
    const order = await ownedOrder(userId, id);
    if (
      order.status !== OrderStatus.CONFIRMED &&
      order.status !== OrderStatus.PROCESSING
    )
      throw new AppError(
        409,
        'This order can no longer be cancelled',
        'CANCELLATION_NOT_ELIGIBLE',
      );
    const requested = selections.length
      ? selections
      : order.items
          .filter(item => item.quantity > item.cancelledQuantity)
          .map(item => ({
            orderItemId: item.id,
            quantity: item.quantity - item.cancelledQuantity,
          }));
    const rows = requested.map(selection => {
      const item = order.items.find(
        value => value.id === selection.orderItemId,
      );
      const remaining = item ? item.quantity - item.cancelledQuantity : 0;
      if (!item || selection.quantity < 1 || selection.quantity > remaining)
        throw new AppError(
          400,
          'Invalid cancellation item quantity',
          'INVALID_CANCELLATION_QUANTITY',
        );
      return { item, quantity: selection.quantity };
    });
    if (!rows.length)
      throw new AppError(
        400,
        'Select at least one item',
        'NO_CANCELLATION_ITEMS',
      );
    const cancelledValue = rows.reduce(
      (sum, row) => sum + Number(row.item.unitPrice) * row.quantity,
      0,
    );
    const remainingUnits = order.items.reduce(
      (sum, item) => sum + item.quantity - item.cancelledQuantity,
      0,
    );
    const cancelledUnits = rows.reduce((sum, row) => sum + row.quantity, 0);
    const fullCancellation = cancelledUnits === remainingUnits;
    const subtotal = Number(order.subtotal);
    const ratio = subtotal > 0 ? Math.min(1, cancelledValue / subtotal) : 0;
    const discountReduction = money(Number(order.discount) * ratio);
    const taxReduction = money(Number(order.tax) * ratio);
    const refundAmount = fullCancellation
      ? Number(order.total)
      : money(cancelledValue - discountReduction + taxReduction);
    await prisma.$transaction(async tx => {
      for (const row of rows) {
        const { item, quantity } = row;
        if (item.variantId)
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: quantity } },
          });
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            cancelledQuantity: { increment: quantity },
            cancellationReason: reason,
            refundedAmount: {
              increment: money(Number(item.unitPrice) * quantity),
            },
          },
        });
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: fullCancellation ? OrderStatus.CANCELLED : order.status,
          cancellationReason: fullCancellation
            ? reason
            : order.cancellationReason,
          subtotal: fullCancellation ? 0 : money(subtotal - cancelledValue),
          discount: fullCancellation
            ? 0
            : money(Number(order.discount) - discountReduction),
          tax: fullCancellation ? 0 : money(Number(order.tax) - taxReduction),
          shippingCost: fullCancellation ? 0 : order.shippingCost,
          total: fullCancellation
            ? 0
            : money(Number(order.total) - refundAmount),
          paymentStatus:
            fullCancellation &&
            (order.paymentStatus === PaymentStatus.PAID ||
              order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED)
              ? PaymentStatus.REFUNDED
              : !fullCancellation && order.paymentStatus === PaymentStatus.PAID
              ? PaymentStatus.PARTIALLY_REFUNDED
              : order.paymentStatus,
        },
      });
      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          status: fullCancellation ? OrderStatus.CANCELLED : order.status,
          message: `${cancelledUnits} item(s) cancelled by customer: ${reason}. Refund ${refundAmount} initiated and inventory restored.`,
        },
      });
    });
    void announce(
      userId,
      fullCancellation ? 'Order cancelled' : 'Items cancelled',
      `${cancelledUnits} item(s) in ${order.number} were cancelled. Refund amount: ${refundAmount}.`,
      'ORDER_CANCELLED',
      order.id,
    );
    return ownedOrder(userId, order.id);
  },
  async returnEligibility(userId: string, id: string) {
    const order = await ownedOrder(userId, id);
    const deadline = new Date(order.updatedAt.getTime() + 30 * 86_400_000);
    return {
      eligible: order.status === OrderStatus.DELIVERED && deadline > new Date(),
      deadline,
      items: order.items
        .map(item => ({
          id: item.id,
          productName: item.productName,
          quantity: item.quantity - item.cancelledQuantity,
          unitPrice: Number(item.unitPrice),
        }))
        .filter(item => item.quantity > 0),
    };
  },
  async requestReturn(
    userId: string,
    id: string,
    reason: string,
    selections: Array<{ orderItemId: string; quantity: number }>,
  ) {
    const order = await ownedOrder(userId, id);
    const eligibility = await this.returnEligibility(userId, id);
    if (!eligibility.eligible)
      throw new AppError(
        409,
        'The 30-day return window is closed or the order is not delivered',
        'RETURN_NOT_ELIGIBLE',
      );
    if (!selections.length)
      throw new AppError(400, 'Select at least one item', 'NO_RETURN_ITEMS');
    const rows = selections.map(selection => {
      const item = order.items.find(
        value => value.id === selection.orderItemId,
      );
      if (
        !item ||
        selection.quantity < 1 ||
        selection.quantity > item.quantity - item.cancelledQuantity
      )
        throw new AppError(
          400,
          'Invalid return item quantity',
          'INVALID_RETURN_QUANTITY',
        );
      return {
        orderItemId: item.id,
        quantity: selection.quantity,
        refundAmount: Number(item.unitPrice) * selection.quantity,
      };
    });
    const amount = rows.reduce((sum, row) => sum + row.refundAmount, 0);
    const result = await prisma.$transaction(async tx => {
      const request = await tx.returnRequest.create({
        data: {
          orderId: order.id,
          userId,
          reason,
          refundAmount: amount,
          items: { create: rows },
          events: {
            create: {
              status: ReturnStatus.REQUESTED,
              message: 'Return request submitted for review.',
            },
          },
        },
        include: {
          items: { include: { orderItem: true } },
          events: { orderBy: { createdAt: 'asc' } },
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.RETURN_REQUESTED },
      });
      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          status: OrderStatus.RETURN_REQUESTED,
          message: 'Return request submitted for admin review.',
        },
      });
      return request;
    });
    void announce(
      userId,
      'Return requested',
      `Return ${result.id} for ${order.number} is awaiting review.`,
      'RETURN_REQUESTED',
      order.id,
    );
    return result;
  },
  async pickup(userId: string, returnId: string, pickupAt: Date) {
    const item = await prisma.returnRequest.findFirst({
      where: { id: returnId, userId },
      include: { order: true },
    });
    if (!item)
      throw new AppError(404, 'Return request not found', 'RETURN_NOT_FOUND');
    if (item.status !== ReturnStatus.APPROVED)
      throw new AppError(
        409,
        'Pickup can be scheduled only after approval',
        'RETURN_NOT_APPROVED',
      );
    const earliest = Date.now() + 86_400_000;
    if (
      pickupAt.getTime() < earliest ||
      pickupAt.getTime() > Date.now() + 14 * 86_400_000
    )
      throw new AppError(
        400,
        'Choose a pickup date between 1 and 14 days from now',
        'INVALID_PICKUP_DATE',
      );
    const updated = await prisma.returnRequest.update({
      where: { id: item.id },
      data: {
        pickupAt,
        status: ReturnStatus.PICKUP_SCHEDULED,
        events: {
          create: {
            status: ReturnStatus.PICKUP_SCHEDULED,
            message: `Pickup scheduled for ${pickupAt.toISOString()}.`,
          },
        },
      },
      include: {
        items: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    void announce(
      userId,
      'Return pickup scheduled',
      `Pickup for return ${item.id} from order ${
        item.order.number
      } is scheduled for ${pickupAt.toLocaleDateString('en-IN')}.`,
      'RETURN_PICKUP_SCHEDULED',
      item.orderId,
    );
    return updated;
  },
  listReturns: (userId: string) =>
    prisma.returnRequest.findMany({
      where: { userId },
      include: {
        order: { select: { number: true } },
        items: { include: { orderItem: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  async updateOrder(
    adminId: string,
    id: string,
    status: OrderStatus,
    message: string,
    details: {
      carrier?: string | undefined;
      trackingNumber?: string | undefined;
      estimatedDeliveryAt?: Date | undefined;
      cancellationReason?: string | undefined;
    } = {},
  ) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: true, items: true },
    });
    if (!order) throw new AppError(404, 'Order not found');
    if (order.status === status) return { ...order, updatedBy: adminId };
    const transitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    };
    if (!transitions[order.status]?.includes(status))
      throw new AppError(
        409,
        `Order cannot move from ${order.status} to ${status}`,
        'INVALID_ORDER_TRANSITION',
      );
    const updated = await prisma.$transaction(async tx => {
      if (status === OrderStatus.CANCELLED)
        for (const item of order.items) {
          const remaining = item.quantity - item.cancelledQuantity;
          if (remaining < 1) continue;
          if (item.variantId)
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: remaining } },
            });
          await tx.orderItem.update({
            where: { id: item.id },
            data: {
              cancelledQuantity: item.quantity,
              cancellationReason:
                details.cancellationReason || 'Cancelled by administrator',
              refundedAmount: Number(item.unitPrice) * remaining,
            },
          });
        }
      const paymentStatus =
        status === OrderStatus.CANCELLED &&
        order.paymentStatus === PaymentStatus.PAID
          ? PaymentStatus.REFUNDED
          : status === OrderStatus.DELIVERED && order.paymentMethod === 'cod'
          ? PaymentStatus.PAID
          : order.paymentStatus;
      const value = await tx.order.update({
        where: { id },
        data: {
          status,
          paymentStatus,
          ...(status === OrderStatus.SHIPPED
            ? {
                ...(details.carrier ? { carrier: details.carrier } : {}),
                ...(details.trackingNumber
                  ? { trackingNumber: details.trackingNumber }
                  : {}),
                ...(details.estimatedDeliveryAt
                  ? { estimatedDeliveryAt: details.estimatedDeliveryAt }
                  : {}),
              }
            : {}),
          ...(status === OrderStatus.DELIVERED
            ? { deliveredAt: new Date() }
            : {}),
          ...(status === OrderStatus.CANCELLED
            ? {
                cancellationReason:
                  details.cancellationReason || 'Cancelled by administrator',
              }
            : {}),
        },
      });
      await tx.orderStatusEvent.create({
        data: { orderId: id, status, message },
      });
      return value;
    });
    void announce(
      order.userId,
      `Order ${status.toLowerCase()}`,
      `${order.number}: ${message}`,
      'ORDER_UPDATE',
      id,
    );
    return { ...updated, updatedBy: adminId };
  },
  async reviewReturn(id: string, approve: boolean, note: string) {
    const request = await prisma.returnRequest.findUnique({
      where: { id },
      include: { order: { include: { user: true } } },
    });
    if (!request) throw new AppError(404, 'Return request not found');
    if (request.status !== ReturnStatus.REQUESTED)
      throw new AppError(409, 'Return was already reviewed');
    const status = approve ? ReturnStatus.APPROVED : ReturnStatus.REJECTED;
    const updated = await prisma.returnRequest.update({
      where: { id },
      data: {
        status,
        adminNote: note,
        refundStatus: approve ? 'PENDING_PICKUP' : 'NOT_APPLICABLE',
        events: {
          create: {
            status,
            message:
              note ||
              `Return was ${
                approve ? 'approved' : 'rejected'
              } by the review team.`,
          },
        },
      },
      include: {
        items: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    void announce(
      request.userId,
      `Return ${approve ? 'approved' : 'rejected'}`,
      note || `Return for ${request.order.number} was ${status.toLowerCase()}.`,
      'RETURN_UPDATE',
      request.orderId,
    );
    return updated;
  },
  async updateReturnStatus(id: string, status: ReturnStatus, note: string) {
    const request = await prisma.returnRequest.findUnique({
      where: { id },
      include: { order: { include: { user: true } } },
    });
    if (!request) throw new AppError(404, 'Return request not found');
    if (request.status === status) return request;
    if (request.status === ReturnStatus.REQUESTED) {
      if (status === ReturnStatus.APPROVED)
        return this.reviewReturn(id, true, note);
      if (status === ReturnStatus.REJECTED)
        return this.reviewReturn(id, false, note);
      throw new AppError(409, 'Review the return before changing its progress');
    }
    const nextStatuses: Partial<Record<ReturnStatus, ReturnStatus[]>> = {
      [ReturnStatus.APPROVED]: [
        ReturnStatus.PICKUP_SCHEDULED,
        ReturnStatus.RECEIVED,
      ],
      [ReturnStatus.PICKUP_SCHEDULED]: [ReturnStatus.RECEIVED],
      [ReturnStatus.RECEIVED]: [ReturnStatus.REFUNDED],
    };
    if (!nextStatuses[request.status]?.includes(status))
      throw new AppError(
        409,
        `Return cannot move from ${request.status} to ${status}`,
        'INVALID_RETURN_TRANSITION',
      );
    if (status === ReturnStatus.REFUNDED) {
      await this.completeReturn(id);
      return prisma.returnRequest.findUniqueOrThrow({ where: { id } });
    }
    const refundStatus =
      status === ReturnStatus.RECEIVED ? 'UNDER_REVIEW' : 'PENDING_PICKUP';
    const updated = await prisma.returnRequest.update({
      where: { id },
      data: {
        status,
        refundStatus,
        adminNote: note || request.adminNote,
        events: {
          create: {
            status,
            message:
              note ||
              `Return moved to ${status.toLowerCase().replaceAll('_', ' ')}.`,
          },
        },
      },
    });
    void announce(
      request.userId,
      `Return ${status.toLowerCase().replaceAll('_', ' ')}`,
      note ||
        `Return for ${request.order.number} is now ${status
          .toLowerCase()
          .replaceAll('_', ' ')}.`,
      'RETURN_UPDATE',
      request.orderId,
    );
    return updated;
  },
  async completeReturn(id: string) {
    const request = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        items: { include: { orderItem: true } },
        order: { include: { user: true } },
      },
    });
    if (!request || !completableReturnStatuses.includes(request.status))
      throw new AppError(409, 'Return cannot be completed');
    await prisma.$transaction(async tx => {
      for (const row of request.items)
        if (row.orderItem.variantId)
          await tx.productVariant.update({
            where: { id: row.orderItem.variantId },
            data: { stock: { increment: row.quantity } },
          });
      await tx.returnRequest.update({
        where: { id },
        data: {
          status: ReturnStatus.REFUNDED,
          refundStatus: 'COMPLETED',
          events: {
            create: {
              status: ReturnStatus.REFUNDED,
              message: 'Returned items passed inspection and refund completed.',
            },
          },
        },
      });
      await tx.order.update({
        where: { id: request.orderId },
        data: {
          status: OrderStatus.RETURNED,
          paymentStatus: PaymentStatus.REFUNDED,
        },
      });
      await tx.orderStatusEvent.create({
        data: {
          orderId: request.orderId,
          status: OrderStatus.RETURNED,
          message:
            'Returned items received, inventory updated, and refund completed.',
        },
      });
    });
    void announce(
      request.userId,
      'Refund completed',
      `Refund for ${request.order.number} is complete.`,
      'REFUND_COMPLETED',
      request.orderId,
    );
    return { success: true };
  },
};
