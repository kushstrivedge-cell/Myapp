import React, {createContext, ReactNode, useContext, useMemo, useState} from 'react';
import {CatalogueProduct} from '../data/products';

export type CartSelection = {
  colour: string;
  size: string;
};

export type CartItem = CartSelection & {
  key: string;
  product: CatalogueProduct;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  couponCode: string | null;
  discount: number;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  addItem: (product: CatalogueProduct, selection?: Partial<CartSelection>, quantity?: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

type CartProviderProps = {children: ReactNode};

export function CartProvider({children}: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState<string | null>(null);

  const addItem: CartContextValue['addItem'] = (
    product,
    selection = {},
    quantity = 1,
  ) => {
    const colour = selection.colour ?? 'Slate';
    const size = selection.size ?? 'Standard';
    const key = `${product.id}-${colour}-${size}`;

    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.key === key);
      if (existingItem) {
        return currentItems.map(item =>
          item.key === key
            ? {...item, quantity: Math.min(10, item.quantity + quantity)}
            : item,
        );
      }
      return [...currentItems, {key, product, colour, size, quantity}];
    });
  };

  const updateQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(currentItems => currentItems.filter(item => item.key !== key));
      return;
    }
    setItems(currentItems =>
      currentItems.map(item =>
        item.key === key ? {...item, quantity: Math.min(10, quantity)} : item,
      ),
    );
  };

  const removeItem = (key: string) => {
    setItems(currentItems => currentItems.filter(item => item.key !== key));
  };

  const clearCart = () => {
    setItems([]);
    setCouponCode(null);
  };
  const applyCoupon = (code: string) => {
    const isValid = code.trim().toUpperCase() === 'SAVE10';
    setCouponCode(isValid ? 'SAVE10' : null);
    return isValid;
  };
  const removeCoupon = () => setCouponCode(null);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );
  const discount = couponCode === 'SAVE10' ? Math.round(subtotal * 0.1) : 0;

  const value = useMemo(
    () => ({
      items,
      itemCount,
      subtotal,
      couponCode,
      discount,
      applyCoupon,
      removeCoupon,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [items, itemCount, subtotal, couponCode, discount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return context;
}
