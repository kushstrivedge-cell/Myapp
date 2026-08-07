import {
  CatalogueProduct,
  ProductImage,
  ProductVariant,
} from '../data/products';
import { apiDelete, apiGet, apiPatch, apiPost } from './apiClient';
import {
  clearGuestCartToken,
  readGuestCartToken,
  saveGuestCartToken,
} from './guestCartStorage';
import { API_BASE_URL } from '../config/api';

type RawProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  active: boolean;
  category: { name: string; slug: string };
  images: ProductImage[];
  variants: Array<
    ProductVariant & {
      price: number | string;
      oldPrice: number | string | null;
    }
  >;
  reviews: Array<{ rating: number }>;
};
type RawCartItem = {
  id: string;
  quantity: number;
  variant: ProductVariant;
  product: RawProduct;
  lineTotal: number;
  available: boolean;
};
type RawCart = {
  items: RawCartItem[];
  itemCount: number;
  couponCode: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  stockValid: boolean;
  stockIssues: Array<{
    variantId: string;
    productName: string;
    requested: number;
    available: number;
  }>;
};
type RawWishlistItem = { id: string; productId: string; product: RawProduct };

const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
const palette = [
  '#48697A',
  '#876A55',
  '#6E7893',
  '#B08466',
  '#627D70',
  '#647086',
];
const colour = (value: string) =>
  palette[
    [...value].reduce((sum, character) => sum + character.charCodeAt(0), 0) %
      palette.length
  ]!;
const mapProduct = (raw: RawProduct): CatalogueProduct => {
  const variants = raw.variants.map(item => ({
    ...item,
    price: Number(item.price),
    oldPrice: item.oldPrice === null ? null : Number(item.oldPrice),
    inStock: item.stock > 0,
  }));
  const prices = variants.map(item => item.price);
  const images = raw.images.map(image => ({
    ...image,
    url: image.url.startsWith('/') ? `${apiOrigin}${image.url}` : image.url,
  }));
  const rating = raw.reviews.length
    ? raw.reviews.reduce((sum, item) => sum + item.rating, 0) /
      raw.reviews.length
    : 0;
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    category: raw.category.name,
    categorySlug: raw.category.slug,
    images,
    variants,
    price: prices.length ? Math.min(...prices) : 0,
    maximumPrice: prices.length ? Math.max(...prices) : 0,
    rating: Number(rating.toFixed(1)),
    reviews: raw.reviews.length,
    label: raw.name[0]?.toUpperCase() ?? '?',
    color: colour(raw.slug),
    ...(images[0] ? { imageUrl: images[0].url } : {}),
    stock: variants.reduce((sum, item) => sum + item.stock, 0),
    inStock: variants.some(item => item.inStock),
  };
};

export type ServerCart = Omit<RawCart, 'items'> & {
  items: Array<Omit<RawCartItem, 'product'> & { product: CatalogueProduct }>;
};
const mapCart = (cart: RawCart): ServerCart => ({
  ...cart,
  items: cart.items.map(item => ({
    ...item,
    product: mapProduct(item.product),
  })),
});
async function ensureGuest() {
  let token = await readGuestCartToken();
  if (!token) {
    token = (
      await apiPost<{ token: string }>(
        '/cart/guest',
        {},
        { authenticated: false },
      )
    ).token;
    await saveGuestCartToken(token);
  }
  return token;
}
async function guestOptions() {
  return {
    authenticated: false,
    headers: { 'x-guest-cart-token': await ensureGuest() },
  };
}

export const cartApi = {
  load: async (authenticated: boolean) =>
    mapCart(
      await apiGet<RawCart>('/cart', authenticated ? {} : await guestOptions()),
    ),
  add: async (variantId: string, quantity: number, authenticated: boolean) =>
    mapCart(
      await apiPost<RawCart>(
        '/cart/items',
        { variantId, quantity },
        authenticated ? {} : await guestOptions(),
      ),
    ),
  quantity: async (itemId: string, quantity: number, authenticated: boolean) =>
    mapCart(
      await apiPatch<RawCart>(
        `/cart/items/${itemId}`,
        { quantity },
        authenticated ? {} : await guestOptions(),
      ),
    ),
  remove: async (itemId: string, authenticated: boolean) =>
    mapCart(
      await apiDelete<RawCart>(
        `/cart/items/${itemId}`,
        authenticated ? {} : await guestOptions(),
      ),
    ),
  clear: async (authenticated: boolean) =>
    mapCart(
      await apiDelete<RawCart>(
        '/cart',
        authenticated ? {} : await guestOptions(),
      ),
    ),
  coupon: async (code: string, authenticated: boolean) =>
    mapCart(
      await apiPost<RawCart>(
        '/cart/coupon',
        { code },
        authenticated ? {} : await guestOptions(),
      ),
    ),
  removeCoupon: async (authenticated: boolean) =>
    mapCart(
      await apiDelete<RawCart>(
        '/cart/coupon',
        authenticated ? {} : await guestOptions(),
      ),
    ),
  merge: async () => {
    const guestToken = await readGuestCartToken();
    if (!guestToken) return null;
    const result = mapCart(
      await apiPost<RawCart>('/cart/merge', { guestToken }),
    );
    await clearGuestCartToken();
    return result;
  },
  validateCheckout: async (shippingMethod: 'standard' | 'express') =>
    mapCart(
      await apiPost<RawCart>('/cart/validate-checkout', { shippingMethod }),
    ),
};

const mapWishlist = (items: RawWishlistItem[]) =>
  items.map(item => mapProduct(item.product));
export const wishlistApi = {
  load: async () => mapWishlist(await apiGet<RawWishlistItem[]>('/wishlist')),
  add: async (productId: string) =>
    mapWishlist(await apiPost<RawWishlistItem[]>('/wishlist', { productId })),
  remove: async (productId: string) =>
    mapWishlist(await apiDelete<RawWishlistItem[]>(`/wishlist/${productId}`)),
  clear: async () =>
    mapWishlist(await apiDelete<RawWishlistItem[]>('/wishlist')),
};
