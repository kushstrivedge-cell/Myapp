import { DeliveryAddress } from '../context/CheckoutContext';
import { apiDelete, apiGet, apiPatch, apiPost } from './apiClient';

export type ApiAddress = DeliveryAddress & {
  id: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export const addressApi = {
  list: () => apiGet<ApiAddress[]>('/addresses'),
  create: (address: DeliveryAddress, isDefault = false) =>
    apiPost<ApiAddress>('/addresses', { ...address, isDefault }),
  update: (addressId: string, address: DeliveryAddress) =>
    apiPatch<ApiAddress>(
      `/addresses/${encodeURIComponent(addressId)}`,
      address,
    ),
  makeDefault: (addressId: string) =>
    apiPatch<ApiAddress>(
      `/addresses/${encodeURIComponent(addressId)}/default`,
      {},
    ),
  remove: (addressId: string) =>
    apiDelete<void>(`/addresses/${encodeURIComponent(addressId)}`),
};
