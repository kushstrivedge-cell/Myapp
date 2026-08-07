import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { CartItem } from './CartContext';
import {
  DeliveryAddress,
  PaymentMethod,
  ShippingMethod,
} from './CheckoutContext';
import { useAuth } from './AuthContext';
import { ApiOrder, orderApi } from '../services/orderApi';
import { fulfilmentApi } from '../services/fulfilmentApi';
import { API_BASE_URL } from '../config/api';

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Return requested'
  | 'Returned';
export type OrderTimelineEvent = {
  id: string;
  status: OrderStatus;
  message: string;
  createdAt: string;
};
export type OrderRecord = {
  databaseId: string;
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  couponCode: string | null;
  placedAt: string;
  status: OrderStatus;
  address: DeliveryAddress;
  shipping: ShippingMethod;
  payment: PaymentMethod;
  paymentStatus: string;
  carrier: string | null;
  trackingNumber: string | null;
  estimatedDeliveryAt: string | null;
  deliveredAt: string | null;
  cancellationReason: string | null;
  timeline: OrderTimelineEvent[];
  returnReason?: string;
};
type CreateInput = {
  idempotencyKey: string;
  address: DeliveryAddress;
  shipping: ShippingMethod;
  payment: PaymentMethod;
};
type OrdersContextValue = {
  orders: OrderRecord[];
  loading: boolean;
  error: string | null;
  createOrder: (input: CreateInput) => Promise<OrderRecord>;
  findOrder: (orderId: string) => OrderRecord | undefined;
  loadOrder: (orderId: string) => Promise<OrderRecord>;
  retry: () => Promise<void>;
  requestReturn: (
    orderId: string,
    reason: string,
    items?: Array<{ orderItemId: string; quantity: number }>,
  ) => Promise<string | null>;
  cancelOrder: (
    orderId: string,
    reason: string,
    items?: Array<{ orderItemId: string; quantity: number }>,
  ) => Promise<string | null>;
};
const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);
const status = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map(word => word[0]?.toUpperCase() + word.slice(1))
    .join(' ') as OrderStatus;
const colour = (id: string) =>
  ['#48697A', '#876A55', '#6E7893', '#B08466'][
    [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 4
  ]!;
const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
const resolveImageUrl = (url: string | undefined) =>
  url?.startsWith('/') ? `${apiOrigin}${url}` : url;
const mapOrder = (order: ApiOrder): OrderRecord => ({
  databaseId: order.id,
  id: order.number,
  subtotal: order.subtotal,
  discount: order.discount,
  shippingCost: order.shippingCost,
  tax: order.tax,
  total: order.total,
  couponCode: order.couponCode,
  placedAt: order.createdAt,
  status: status(order.status),
  address: order.shippingAddress,
  shipping: order.shippingMethod,
  payment: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  carrier: order.carrier,
  trackingNumber: order.trackingNumber,
  estimatedDeliveryAt: order.estimatedDeliveryAt,
  deliveredAt: order.deliveredAt,
  cancellationReason: order.cancellationReason,
  timeline: order.timeline.map(event => ({
    ...event,
    status: status(event.status),
  })),
  items: order.items.map(item => ({
    key: item.id,
    variantId: item.variantDetails?.sku ?? item.id,
    quantity: item.quantity,
    colour: item.variantDetails?.colour ?? 'Standard',
    size: item.variantDetails?.size ?? 'Standard',
    available: true,
    cancelledQuantity: item.cancelledQuantity,
    cancellationReason: item.cancellationReason,
    refundedAmount: item.refundedAmount,
    product: {
      id: item.productId,
      slug: item.productId,
      category: 'Purchased item',
      categorySlug: '',
      name: item.productName,
      description: '',
      price: item.unitPrice,
      maximumPrice: item.unitPrice,
      rating: 0,
      reviews: 0,
      label: item.productName[0]?.toUpperCase() ?? '?',
      color: colour(item.productId),
      images: item.product.images.map((image, position) => ({
        id: `${item.id}-image-${position}`,
        url: resolveImageUrl(image.url) ?? image.url,
        alt: item.productName,
        position,
      })),
      variants: [],
      stock: 0,
      inStock: true,
      ...(resolveImageUrl(item.product.images[0]?.url)
        ? { imageUrl: resolveImageUrl(item.product.images[0]?.url) }
        : {}),
    },
  })),
});
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Could not load orders.';

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const result = await orderApi.list();
      setOrders(result.items.map(mapOrder));
      setError(null);
    } catch (failure) {
      setError(message(failure));
    } finally {
      setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);
  const loadOrder = useCallback(async (orderId: string) => {
    const record = mapOrder(await orderApi.detail(orderId));
    setOrders(current => [
      record,
      ...current.filter(item => item.databaseId !== record.databaseId),
    ]);
    return record;
  }, []);
  const updateStatus = (
    orderId: string,
    nextStatus: OrderStatus,
    reason: string,
  ) =>
    setOrders(current =>
      current.map(order =>
        order.id === orderId
          ? { ...order, status: nextStatus, returnReason: reason }
          : order,
      ),
    );
  return (
    <OrdersContext.Provider
      value={{
        orders,
        loading,
        error,
        retry: load,
        createOrder: async input => {
          const result = await orderApi.create({
            idempotencyKey: input.idempotencyKey,
            shippingAddress: input.address,
            shippingMethod: input.shipping,
            paymentMethod: input.payment,
          });
          const record = mapOrder(result.order);
          setOrders(current => [
            record,
            ...current.filter(item => item.databaseId !== record.databaseId),
          ]);
          return record;
        },
        findOrder: orderId =>
          orders.find(
            order => order.id === orderId || order.databaseId === orderId,
          ),
        loadOrder,
        requestReturn: async (orderId, reason, items) => {
          try {
            const order = orders.find(
              value => value.id === orderId || value.databaseId === orderId,
            );
            await fulfilmentApi.requestReturn(
              orderId,
              reason,
              items ??
                order?.items.map(item => ({
                  orderItemId: item.key,
                  quantity: item.quantity,
                })) ??
                [],
            );
            updateStatus(orderId, 'Return requested', reason);
            await loadOrder(orderId);
            return null;
          } catch (failure) {
            return failure instanceof Error
              ? failure.message
              : 'Return request failed.';
          }
        },
        cancelOrder: async (orderId, reason, items) => {
          try {
            await fulfilmentApi.cancel(orderId, reason, items);
            await loadOrder(orderId);
            return null;
          } catch (failure) {
            return failure instanceof Error
              ? failure.message
              : 'Cancellation failed.';
          }
        },
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
}
export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) throw new Error('useOrders must be used inside OrdersProvider');
  return context;
}
