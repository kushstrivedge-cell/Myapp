import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { authApi } from '../services/authApi';
import { ApiError, setUnauthorizedHandler } from '../services/apiClient';
import { clearTokens, readTokens, saveTokens } from '../services/tokenStorage';
import { accountApi } from '../services/accountApi';

export type UserProfile = {
  id?: string;
  name: string;
  email: string;
  phone: string;
};
type Result = Promise<string | null>;

type AuthContextValue = {
  user: UserProfile | null;
  loading: boolean;
  sessionError: string | null;
  pendingRegistration: UserProfile | null;
  login: (email: string, password: string) => Result;
  register: (profile: UserProfile, password: string) => Result;
  verifyRegistration: (otp: string) => Result;
  resendRegistrationOtp: () => Result;
  requestPasswordReset: (email: string) => Result;
  resetPassword: (email: string, code: string, password: string) => Result;
  updateProfile: (profile: Pick<UserProfile, 'name' | 'phone'>) => Result;
  changePassword: (currentPassword: string, newPassword: string) => Result;
  deleteAccount: (password: string) => Result;
  logout: () => Promise<void>;
  retrySession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const messageFrom = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [pendingRegistration, setPendingRegistration] =
    useState<UserProfile | null>(null);

  const restoreSession = useCallback(async () => {
    setLoading(true);
    setSessionError(null);
    const stored = await readTokens();
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      const payload = await authApi.refresh(stored.refreshToken);
      await saveTokens(payload);
      setUser(payload.user);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'NETWORK_ERROR') {
        setSessionError(error.message);
      } else {
        await clearTokens();
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    restoreSession().catch(() => setLoading(false));
  }, [restoreSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const payload = await authApi.login(email.trim().toLowerCase(), password);
      await saveTokens(payload);
      setUser(payload.user);
      return null;
    } catch (error) {
      return messageFrom(error);
    }
  };
  const register = async (profile: UserProfile, password: string) => {
    try {
      await authApi.register({
        ...profile,
        email: profile.email.trim().toLowerCase(),
        password,
      });
      setPendingRegistration(profile);
      return null;
    } catch (error) {
      return messageFrom(error);
    }
  };
  const verifyRegistration = async (otp: string) => {
    if (!pendingRegistration) return 'Your registration session has expired.';
    try {
      const payload = await authApi.verifyEmail(pendingRegistration.email, otp);
      await saveTokens(payload);
      setUser(payload.user);
      setPendingRegistration(null);
      return null;
    } catch (error) {
      return messageFrom(error);
    }
  };
  const resendRegistrationOtp = async () => {
    if (!pendingRegistration) return 'Your registration session has expired.';
    try {
      await authApi.resendEmailOtp(pendingRegistration.email);
      return null;
    } catch (error) {
      return messageFrom(error);
    }
  };
  const requestPasswordReset = async (email: string) => {
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      return null;
    } catch (error) {
      return messageFrom(error);
    }
  };
  const resetPassword = async (
    email: string,
    code: string,
    password: string,
  ) => {
    try {
      await authApi.resetPassword(email.trim().toLowerCase(), code, password);
      return null;
    } catch (error) {
      return messageFrom(error);
    }
  };
  const logout = async () => {
    const stored = await readTokens();
    setUser(null);
    await clearTokens();
    if (stored) {
      try {
        await authApi.logout(stored.refreshToken);
      } catch {}
    }
  };
  const updateProfile = async (
    profile: Pick<UserProfile, 'name' | 'phone'>,
  ) => {
    try {
      const updated = await accountApi.updateProfile(profile);
      setUser({
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
      });
      return null;
    } catch (error) {
      return messageFrom(error);
    }
  };
  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    try {
      await accountApi.changePassword({ currentPassword, newPassword });
      await clearTokens();
      setUser(null);
      return null;
    } catch (error) {
      return messageFrom(error);
    }
  };
  const deleteAccount = async (password: string) => {
    try {
      await accountApi.deleteAccount(password);
      await clearTokens();
      setUser(null);
      return null;
    } catch (error) {
      return messageFrom(error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionError,
        pendingRegistration,
        login,
        register,
        verifyRegistration,
        resendRegistrationOtp,
        requestPasswordReset,
        resetPassword,
        updateProfile,
        changePassword,
        deleteAccount,
        logout,
        retrySession: restoreSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
