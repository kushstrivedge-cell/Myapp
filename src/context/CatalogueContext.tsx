import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CatalogueProduct } from '../data/products';
import {
  Category,
  ProductListParams,
  catalogueApi,
} from '../services/catalogueApi';

type CatalogueContextValue = {
  products: CatalogueProduct[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  retry: () => Promise<void>;
  findProduct: (id: string) => CatalogueProduct | undefined;
  loadProduct: (id: string) => Promise<CatalogueProduct>;
  listProducts: (
    params?: ProductListParams,
  ) => ReturnType<typeof catalogueApi.products>;
};

const CatalogueContext = createContext<CatalogueContextValue | undefined>(
  undefined,
);
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Could not load the catalogue.';

export function CatalogueProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [categoryResult, productResult] = await Promise.all([
        catalogueApi.categories(),
        catalogueApi.products({ limit: 50, sort: 'popular' }),
      ]);
      setCategories(categoryResult);
      setProducts(productResult.items);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const value = useMemo<CatalogueContextValue>(
    () => ({
      products,
      categories,
      loading,
      error,
      retry: load,
      findProduct: id =>
        products.find(product => product.id === id || product.slug === id),
      loadProduct: async id => {
        const existing = products.find(
          product => product.id === id || product.slug === id,
        );
        if (existing) return existing;
        const product = await catalogueApi.product(id);
        setProducts(current =>
          current.some(item => item.id === product.id)
            ? current
            : [...current, product],
        );
        return product;
      },
      listProducts: catalogueApi.products,
    }),
    [categories, error, load, loading, products],
  );

  return (
    <CatalogueContext.Provider value={value}>
      {children}
    </CatalogueContext.Provider>
  );
}

export function useCatalogue() {
  const context = useContext(CatalogueContext);
  if (!context)
    throw new Error('useCatalogue must be used inside CatalogueProvider');
  return context;
}
