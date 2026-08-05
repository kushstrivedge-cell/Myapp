import React, {createContext, ReactNode, useContext, useState} from 'react';
import {CatalogueProduct} from '../data/products';

type WishlistContextValue = {
  items: CatalogueProduct[];
  count: number;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (product: CatalogueProduct) => void;
  clearWishlist: () => void;
};

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({children}: {children: ReactNode}) {
  const [items, setItems] = useState<CatalogueProduct[]>([]);

  const isWishlisted = (productId: string) =>
    items.some(product => product.id === productId);

  const toggleWishlist = (product: CatalogueProduct) => {
    setItems(current =>
      current.some(item => item.id === product.id)
        ? current.filter(item => item.id !== product.id)
        : [...current, product],
    );
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        count: items.length,
        isWishlisted,
        toggleWishlist,
        clearWishlist: () => setItems([]),
      }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used inside WishlistProvider');
  return context;
}
