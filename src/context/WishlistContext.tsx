import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { CatalogueProduct } from '../data/products';
import { wishlistApi } from '../services/commerceApi';
import { useAuth } from './AuthContext';

type WishlistContextValue = {
  items: CatalogueProduct[];
  count: number;
  loading: boolean;
  error: string | null;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (product: CatalogueProduct) => Promise<string | null>;
  clearWishlist: () => Promise<string | null>;
  retry: () => Promise<void>;
};
const WishlistContext = createContext<WishlistContextValue | undefined>(
  undefined,
);
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Wishlist request failed.';

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CatalogueProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      setItems(await wishlistApi.load());
      setError(null);
    } catch (failure) {
      setError(message(failure));
    } finally {
      setLoading(false);
    }
  }, [user]);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);
  const perform = async (request: () => Promise<CatalogueProduct[]>) => {
    try {
      setItems(await request());
      setError(null);
      return null;
    } catch (failure) {
      const text = message(failure);
      setError(text);
      return text;
    }
  };
  const isWishlisted = (productId: string) =>
    items.some(product => product.id === productId);
  const toggleWishlist = async (product: CatalogueProduct) => {
    if (!user) return 'Sign in to save products to your wishlist.';
    return perform(() =>
      isWishlisted(product.id)
        ? wishlistApi.remove(product.id)
        : wishlistApi.add(product.id),
    );
  };
  return (
    <WishlistContext.Provider
      value={{
        items,
        count: items.length,
        loading,
        error,
        isWishlisted,
        toggleWishlist,
        clearWishlist: () =>
          user ? perform(wishlistApi.clear) : Promise.resolve(null),
        retry: load,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}
export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context)
    throw new Error('useWishlist must be used inside WishlistProvider');
  return context;
}
