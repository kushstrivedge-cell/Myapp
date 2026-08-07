import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  getMessaging,
  getToken,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import { notificationApi } from '../services/notificationApi';
import { useAuth } from './AuthContext';
export type CustomerNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};
type Value = {
  notifications: CustomerNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  addNotification: (title: string, message: string) => void;
  markAllRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  retry: () => Promise<void>;
};
const Context = createContext<Value | undefined>(undefined);
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<CustomerNotification[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      setNotifications(
        (await notificationApi.list()).map(item => ({
          ...item,
          read: Boolean(item.readAt),
        })),
      );
      setError(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Could not load notifications.',
      );
    } finally {
      setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);
  useEffect(() => {
    if (!user) return;
    let unsubscribe: () => void = () => undefined;
    const register = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) return;
      } else if (Platform.OS === 'ios') {
        await requestPermission(getMessaging());
      }
      const messaging = getMessaging();
      const token = await getToken(messaging);
      if (token)
        await notificationApi.registerToken(
          token,
          Platform.OS === 'ios' ? 'ios' : 'android',
        );
      unsubscribe = onTokenRefresh(messaging, next =>
        notificationApi
          .registerToken(next, Platform.OS === 'ios' ? 'ios' : 'android')
          .then(() => undefined)
          .catch(() => undefined),
      );
    };
    register().catch(() => undefined);
    return () => unsubscribe();
  }, [user]);
  return (
    <Context.Provider
      value={{
        notifications,
        unreadCount: notifications.filter(item => !item.read).length,
        loading,
        error,
        retry: load,
        addNotification: (title, message) =>
          setNotifications(current => [
            {
              id: `local-${Date.now()}`,
              title,
              message,
              createdAt: new Date().toISOString(),
              read: false,
            },
            ...current,
          ]),
        markAllRead: async () => {
          await notificationApi.markAllRead();
          setNotifications(current =>
            current.map(item => ({ ...item, read: true })),
          );
        },
        clearNotifications: async () => {
          await notificationApi.clear();
          setNotifications([]);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useNotifications() {
  const value = useContext(Context);
  if (!value)
    throw new Error(
      'useNotifications must be used inside NotificationsProvider',
    );
  return value;
}
