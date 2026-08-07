import { apiGet, apiPatch, apiPost } from './apiClient';
export type ReturnEligibility = {
  eligible: boolean;
  deadline: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
};
export type ReturnRequest = {
  id: string;
  status:
    | 'REQUESTED'
    | 'APPROVED'
    | 'REJECTED'
    | 'PICKUP_SCHEDULED'
    | 'RECEIVED'
    | 'REFUNDED';
  refundStatus: string;
  reason: string;
  adminNote: string | null;
  pickupAt: string | null;
  createdAt: string;
  updatedAt: string;
  refundAmount: number | string | null;
  order: { number: string };
  events: Array<{
    id: string;
    status: ReturnRequest['status'];
    message: string;
    createdAt: string;
  }>;
};
export const fulfilmentApi = {
  cancel: (
    orderId: string,
    reason: string,
    items: Array<{ orderItemId: string; quantity: number }> = [],
  ) =>
    apiPost(`/fulfilment/orders/${encodeURIComponent(orderId)}/cancel`, {
      reason,
      items,
    }),
  eligibility: (orderId: string) =>
    apiGet<ReturnEligibility>(
      `/fulfilment/orders/${encodeURIComponent(orderId)}/return-eligibility`,
    ),
  requestReturn: (
    orderId: string,
    reason: string,
    items: Array<{ orderItemId: string; quantity: number }>,
  ) =>
    apiPost(`/fulfilment/orders/${encodeURIComponent(orderId)}/returns`, {
      reason,
      items,
    }),
  returns: () => apiGet<ReturnRequest[]>('/fulfilment/returns'),
  schedulePickup: (returnId: string, pickupAt: string) =>
    apiPatch(`/fulfilment/returns/${returnId}/pickup`, { pickupAt }),
};
