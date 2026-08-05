export type ProductImage = {
  id: string;
  url: string;
  alt: string | null;
  position: number;
};

export type ProductVariant = {
  id: string;
  sku: string;
  colour: string | null;
  size: string | null;
  price: number;
  oldPrice: number | null;
  stock: number;
  inStock: boolean;
};

export type CatalogueProduct = {
  id: string;
  slug: string;
  category: string;
  categorySlug: string;
  name: string;
  description: string;
  price: number;
  maximumPrice: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  label: string;
  color: string;
  imageUrl?: string;
  images: ProductImage[];
  variants: ProductVariant[];
  stock: number;
  inStock: boolean;
};
