import { apiDelete, apiGet, apiPatch, apiPost } from './apiClient';
export type ApiNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  data?: unknown;
  createdAt: string;
  readAt: string | null;
};
export const notificationApi = {
  list: () => apiGet<ApiNotification[]>('/notifications'),
  markAllRead: () => apiPatch<void>('/notifications/read-all', {}),
  clear: () => apiDelete<void>('/notifications'),
  registerToken: (token: string, platform: 'android' | 'ios') =>
    apiPost('/notifications/device-token', { token, platform }),
};
