import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type NetworkContextValue = {
  isConnected: boolean;
  isChecking: boolean;
  refresh: () => Promise<void>;
};

const NetworkContext = createContext<NetworkContextValue | undefined>(
  undefined,
);

function hasInternet(state: NetInfoState) {
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NetInfoState | null>(null);

  useEffect(() => NetInfo.addEventListener(setState), []);

  const value = useMemo<NetworkContextValue>(
    () => ({
      isConnected: state ? hasInternet(state) : true,
      isChecking: state === null,
      refresh: async () => {
        setState(await NetInfo.refresh());
      },
    }),
    [state],
  );

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used inside NetworkProvider');
  }
  return context;
}
