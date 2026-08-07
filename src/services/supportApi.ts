import { apiGet, apiPost } from './apiClient';
export type SupportContacts = { email: string; phone: string; chatUrl: string };
export const supportApi = {
  contacts: () =>
    apiGet<SupportContacts>('/support/contacts', { authenticated: false }),
  tickets: () => apiGet<any[]>('/support/tickets'),
  create: (subject: string, message: string, channel = 'APP') =>
    apiPost<{ number: string }>('/support/tickets', {
      subject,
      message,
      channel,
    }),
};
