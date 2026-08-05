import {AuthTokens} from './tokenStorage';
import {apiGet, apiPost} from './apiClient';

type ApiUser = {id: string; name: string; email: string; phone: string; role: string; emailVerified: boolean};
export type AuthPayload = AuthTokens & {user: ApiUser};

const publicPost = <T>(path: string, body: unknown) =>
  apiPost<T>(path, body, {authenticated: false});

export const authApi = {
  register: (body: {name: string; email: string; phone: string; password: string}) => publicPost<{message: string; email: string}>('/auth/register', body),
  verifyEmail: (email: string, code: string) => publicPost<AuthPayload>('/auth/verify-email', {email, code}),
  resendEmailOtp: (email: string) => publicPost<{message: string}>('/auth/resend-email-otp', {email}),
  login: (email: string, password: string) => publicPost<AuthPayload>('/auth/login', {email, password}),
  refresh: (refreshToken: string) => publicPost<AuthPayload>('/auth/refresh', {refreshToken}),
  logout: (refreshToken: string) => publicPost<void>('/auth/logout', {refreshToken}),
  forgotPassword: (email: string) => publicPost<{message: string}>('/auth/forgot-password', {email}),
  resetPassword: (email: string, code: string, newPassword: string) => publicPost<{message: string}>('/auth/reset-password', {email, code, newPassword}),
  me: () => apiGet<ApiUser>('/auth/me'),
};
