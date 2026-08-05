import { apiDelete, apiPatch, apiPost } from './apiClient';

export type AccountUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  emailVerified: boolean;
};

export const accountApi = {
  updateProfile: (input: { name: string; phone: string }) =>
    apiPatch<AccountUser>('/account/profile', input),
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    apiPost<{ message: string }>('/account/change-password', input),
  deleteAccount: (password: string) =>
    apiDelete<void>('/account', { password }),
};
