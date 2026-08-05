import React, {ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {ApiAddress, addressApi} from '../services/addressApi';
import {useAuth} from './AuthContext';
import {DeliveryAddress} from './CheckoutContext';

export type SavedAddress = ApiAddress;
type Value = {
  addresses: SavedAddress[];
  loading: boolean;
  error: string | null;
  retry: () => Promise<void>;
  saveAddress: (address: DeliveryAddress, id?: string) => Promise<void>;
  removeAddress: (id: string) => Promise<void>;
  makeDefault: (id: string) => Promise<void>;
};
const Context = createContext<Value | undefined>(undefined);
const messageFrom = (error: unknown) => error instanceof Error ? error.message : 'Address request failed.';

export function AddressBookProvider({children}: {children: ReactNode}) {
  const {user} = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setAddresses(await addressApi.list());
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const value = useMemo<Value>(() => ({
    addresses,
    loading,
    error,
    retry: load,
    saveAddress: async (address, id) => {
      const saved = id ? await addressApi.update(id, address) : await addressApi.create(address);
      setAddresses(current => {
        const next = id ? current.map(item => item.id === id ? saved : item) : [saved, ...current];
        return next.sort((first, second) => Number(second.isDefault) - Number(first.isDefault));
      });
    },
    removeAddress: async id => {
      await addressApi.remove(id);
      await load();
    },
    makeDefault: async id => {
      const saved = await addressApi.makeDefault(id);
      setAddresses(current => current
        .map(item => ({...item, isDefault: item.id === saved.id}))
        .sort((first, second) => Number(second.isDefault) - Number(first.isDefault)));
    },
  }), [addresses, error, load, loading]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAddressBook() {
  const value = useContext(Context);
  if (!value) throw new Error('useAddressBook must be used inside AddressBookProvider');
  return value;
}
