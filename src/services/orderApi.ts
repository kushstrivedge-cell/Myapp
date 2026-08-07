import {
  DeliveryAddress,
  PaymentMethod,
  ShippingMethod,
} from '../context/CheckoutContext';
import { apiGet, apiPost } from './apiClient';

export type ApiOrderItem = {
  id: string;
  productId: string;
  productName: string;
  variantDetails: {
    sku?: string;
    colour?: string | null;
    size?: string | null;
  } | null;
  unitPrice: number;
  quantity: number;
  cancelledQuantity: number;
  cancellationReason: string | null;
  refundedAmount: number;
  product: { images: Array<{ url: string }> };
};
export type ApiOrder = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  paymentMethod: PaymentMethod;
  shippingMethod: ShippingMethod;
  shippingAddress: DeliveryAddress;
  couponCode: string | null;
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  total: number;
  carrier: string | null;
  trackingNumber: string | null;
  estimatedDeliveryAt: string | null;
  deliveredAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  items: ApiOrderItem[];
  timeline: Array<{
    id: string;
    status: string;
    message: string;
    createdAt: string;
  }>;
};
type Page = {
  items: ApiOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNextPage: boolean;
  };
};

export const orderApi = {
  create: (input: {
    idempotencyKey: string;
    shippingMethod: ShippingMethod;
    paymentMethod: PaymentMethod;
    shippingAddress: DeliveryAddress;
  }) => apiPost<{ order: ApiOrder; duplicate: boolean }>('/orders', input),
  list: (page = 1, limit = 20) =>
    apiGet<Page>(`/orders?page=${page}&limit=${limit}`),
  detail: (orderId: string) =>
    apiGet<ApiOrder>(`/orders/${encodeURIComponent(orderId)}`),
  timeline: (orderId: string) =>
    apiGet<ApiOrder['timeline']>(
      `/orders/${encodeURIComponent(orderId)}/timeline`,
    ),
};
