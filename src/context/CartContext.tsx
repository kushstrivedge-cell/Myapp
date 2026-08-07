import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CatalogueProduct } from '../data/products';
import { cartApi, ServerCart } from '../services/commerceApi';
import { useAuth } from './AuthContext';

export type CartSelection = { colour: string; size: string };
export type CartItem = CartSelection & {
  key: string;
  product: CatalogueProduct;
  quantity: number;
  variantId: string;
  available: boolean;
  cancelledQuantity?: number;
  cancellationReason?: string | null;
  refundedAmount?: number;
};
type Result = Promise<string | null>;
type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  couponCode: string | null;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  loading: boolean;
  error: string | null;
  stockValid: boolean;
  retry: () => Promise<void>;
  applyCoupon: (code: string) => Result;
  removeCoupon: () => Result;
  addItem: (
    product: CatalogueProduct,
    selection?: Partial<CartSelection>,
    quantity?: number,
  ) => Result;
  updateQuantity: (key: string, quantity: number) => Result;
  removeItem: (key: string) => Result;
  clearCart: () => Result;
  validateCheckout: (shipping: 'standard' | 'express') => Promise<ServerCart>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const empty: ServerCart = {
  items: [],
  itemCount: 0,
  couponCode: null,
  subtotal: 0,
  discount: 0,
  tax: 0,
  shipping: 99,
  total: 99,
  stockValid: true,
  stockIssues: [],
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Cart request failed.';

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const authenticated = Boolean(user);
  const [cart, setCart] = useState<ServerCart>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const accept = useCallback((result: ServerCart) => {
    setCart(result);
    setError(null);
  }, []);
  const run = useCallback(
    async (request: () => Promise<ServerCart>) => {
      try {
        accept(await request());
        return null;
      } catch (failure) {
        const text = message(failure);
        setError(text);
        return text;
      }
    },
    [accept],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (authenticated) {
        const merged = await cartApi.merge();
        accept(merged ?? (await cartApi.load(true)));
      } else accept(await cartApi.load(false));
    } catch (failure) {
      setError(message(failure));
    } finally {
      setLoading(false);
    }
  }, [accept, authenticated]);
  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const items = useMemo<CartItem[]>(
    () =>
      cart.items.map(item => ({
        key: item.id,
        product: item.product,
        quantity: item.quantity,
        variantId: item.variant.id,
        colour: item.variant.colour ?? 'Standard',
        size: item.variant.size ?? 'Standard',
        available: item.available,
      })),
    [cart.items],
  );
  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: cart.itemCount,
      subtotal: cart.subtotal,
      couponCode: cart.couponCode,
      discount: cart.discount,
      tax: cart.tax,
      shipping: cart.shipping,
      total: cart.total,
      loading,
      error,
      stockValid: cart.stockValid,
      retry: load,
      addItem: async (product, selection = {}, quantity = 1) => {
        const variant =
          product.variants.find(
            item =>
              (!selection.colour || item.colour === selection.colour) &&
              (!selection.size || item.size === selection.size),
          ) ?? product.variants.find(item => item.inStock);
        if (!variant) return 'No purchasable variant is available.';
        return run(() => cartApi.add(variant.id, quantity, authenticated));
      },
      updateQuantity: (key, quantity) =>
        quantity <= 0
          ? run(() => cartApi.remove(key, authenticated))
          : run(() => cartApi.quantity(key, quantity, authenticated)),
      removeItem: key => run(() => cartApi.remove(key, authenticated)),
      clearCart: () => run(() => cartApi.clear(authenticated)),
      applyCoupon: code => run(() => cartApi.coupon(code, authenticated)),
      removeCoupon: () => run(() => cartApi.removeCoupon(authenticated)),
      validateCheckout: shipping => cartApi.validateCheckout(shipping),
    }),
    [authenticated, cart, error, items, load, loading, run],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
