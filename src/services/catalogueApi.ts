import {API_BASE_URL} from '../config/api';
import {
  CatalogueProduct,
  ProductImage,
  ProductVariant,
} from '../data/products';
import {apiGet, apiPost} from './apiClient';

type ApiCategory = {id: string; name: string; slug: string; productCount: number; children: ApiCategory[]};
type ApiProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: {id: string; name: string; slug: string};
  images: ProductImage[];
  variants: ProductVariant[];
  price: number;
  maximumPrice: number;
  oldPrice: number | null;
  stock: number;
  inStock: boolean;
  rating: number;
  reviewCount: number;
};

export type Category = ApiCategory;
export type ProductListParams = {
  q?: string | undefined;
  category?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  minRating?: number | undefined;
  inStock?: boolean | undefined;
  onSale?: boolean | undefined;
  sort?: 'popular' | 'rating' | 'price_asc' | 'price_desc' | 'newest' | undefined;
  page?: number | undefined;
  limit?: number | undefined;
};
export type Pagination = {page: number; limit: number; total: number; pages: number; hasNextPage: boolean};
export type ProductList = {items: CatalogueProduct[]; pagination: Pagination};
export type ProductReview = {id: string; rating: number; title: string | null; text: string | null; createdAt: string; user: {id: string; name: string}};

const palette = ['#48697A', '#876A55', '#6E7893', '#B08466', '#627D70', '#647086', '#76949F', '#A87583'];
const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
const assetUrl = (url: string) => url.startsWith('/') ? `${apiOrigin}${url}` : url;
const colorFor = (value: string) => {
  const hash = [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
  return palette[hash % palette.length]!;
};

function mapProduct(product: ApiProduct): CatalogueProduct {
  const images = product.images.map(image => ({...image, url: assetUrl(image.url)}));
  return {
    id: product.id,
    slug: product.slug,
    category: product.category.name,
    categorySlug: product.category.slug,
    name: product.name,
    description: product.description,
    price: product.price,
    maximumPrice: product.maximumPrice,
    ...(product.oldPrice === null ? {} : {oldPrice: product.oldPrice}),
    rating: product.rating,
    reviews: product.reviewCount,
    label: product.name.charAt(0).toUpperCase(),
    color: colorFor(product.slug),
    ...(images[0] ? {imageUrl: images[0].url} : {}),
    images,
    variants: product.variants,
    stock: product.stock,
    inStock: product.inStock,
  };
}

function queryString(params: ProductListParams) {
  const values = Object.entries(params).filter(([, value]) => value !== undefined && value !== '');
  return values.length
    ? `?${values.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&')}`
    : '';
}

export const catalogueApi = {
  categories: () => apiGet<ApiCategory[]>('/categories', {authenticated: false}),
  products: async (params: ProductListParams = {}): Promise<ProductList> => {
    const result = await apiGet<{items: ApiProduct[]; pagination: Pagination}>(`/products${queryString(params)}`, {authenticated: false});
    return {...result, items: result.items.map(mapProduct)};
  },
  product: async (identifier: string) => mapProduct(await apiGet<ApiProduct>(`/products/${encodeURIComponent(identifier)}`, {authenticated: false})),
  related: async (identifier: string, limit = 6) => (await apiGet<ApiProduct[]>(`/products/${encodeURIComponent(identifier)}/related?limit=${limit}`, {authenticated: false})).map(mapProduct),
  reviews: (identifier: string, page = 1, limit = 10) => apiGet<{items: ProductReview[]; pagination: Pagination}>(`/products/${encodeURIComponent(identifier)}/reviews?page=${page}&limit=${limit}`, {authenticated: false}),
  saveReview: (identifier: string, input: {rating: number; title?: string; text?: string}) => apiPost<ProductReview>(`/products/${encodeURIComponent(identifier)}/reviews`, input),
};
