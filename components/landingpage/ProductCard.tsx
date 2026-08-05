import React from 'react';
import {Alert, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useCart} from '../../src/context/CartContext';
import {CatalogueProduct} from '../../src/data/products';
import {useWishlist} from '../../src/context/WishlistContext';

type ProductCardProps = {
  product: CatalogueProduct;
  compact?: boolean;
  onPress?: () => void;
};

function formatPrice(price: number) {
  return `₹${price.toLocaleString('en-IN')}`;
}

function ProductCard({product, compact = false, onPress}: ProductCardProps) {
  const {addItem} = useCart();
  const {isWishlisted, toggleWishlist} = useWishlist();
  const wished = isWishlisted(product.id);
  const discount = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress ?? (() => Alert.alert(product.name, 'Product details will open here.'))}
      style={({pressed}) => [styles.card, compact && styles.compactCard, pressed && styles.pressed]}>
      <View style={[styles.art, {backgroundColor: product.color}]}>
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}
        {product.imageUrl ? (
          <Image accessibilityLabel={product.name} resizeMode="cover" source={{uri: product.imageUrl}} style={styles.productImage} />
        ) : (
          <Text style={styles.productLetter}>{product.label}</Text>
        )}
        <Pressable
          accessibilityLabel={`Add ${product.name} to wishlist`}
          hitSlop={8}
          onPress={event => {
            event.stopPropagation();
            toggleWishlist(product);
          }}
          style={styles.wishlist}>
          <Text style={[styles.heart, wished && styles.wishedHeart]}>{wished ? '♥' : '♡'}</Text>
        </Pressable>
      </View>

      <View style={styles.details}>
        <Text numberOfLines={2} style={styles.name}>{product.name}</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.rating}>{product.rating}</Text>
          <Text style={styles.reviews}>({product.reviews})</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          {product.oldPrice && <Text style={styles.oldPrice}>{formatPrice(product.oldPrice)}</Text>}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={event => {
            event.stopPropagation();
            if (product.inStock) {
              addItem(product);
              Alert.alert('Added to cart', `${product.name} is now in your cart.`);
            } else Alert.alert('Out of stock', 'This product is currently unavailable.');
          }}
          style={({pressed}) => [styles.cartButton, pressed && styles.cartPressed]}>
          <Text style={styles.cartText}>{product.inStock ? 'Add to cart' : 'Out of stock'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {width: '48.5%', backgroundColor: '#FFFFFF', borderRadius: 13, overflow: 'hidden', marginBottom: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E1E5E8'},
  compactCard: {width: 174, marginRight: 12},
  art: {height: 142, alignItems: 'center', justifyContent: 'center'},
  productLetter: {color: '#FFFFFF', fontSize: 52, fontWeight: '900', opacity: 0.9},
  productImage: {height: '100%', width: '100%'},
  discountBadge: {position: 'absolute', left: 8, top: 8, backgroundColor: '#D94F04', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 4},
  discountText: {color: '#FFFFFF', fontSize: 8, fontWeight: '900'},
  wishlist: {position: 'absolute', right: 8, top: 7, width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center'},
  heart: {color: '#222D35', fontSize: 21, lineHeight: 23},
  wishedHeart: {color: '#D83B38'},
  details: {padding: 11},
  name: {minHeight: 36, color: '#26323B', fontSize: 13, lineHeight: 18, fontWeight: '700'},
  ratingRow: {flexDirection: 'row', alignItems: 'center', marginTop: 5},
  star: {color: '#FFB000', fontSize: 13, marginRight: 3},
  rating: {color: '#34414B', fontSize: 11, fontWeight: '800'},
  reviews: {color: '#7A858E', fontSize: 10, marginLeft: 3},
  priceRow: {flexDirection: 'row', alignItems: 'baseline', marginTop: 7},
  price: {color: '#101820', fontSize: 16, fontWeight: '900'},
  oldPrice: {color: '#8B949B', fontSize: 10, textDecorationLine: 'line-through', marginLeft: 6},
  cartButton: {height: 35, borderRadius: 7, borderWidth: 1, borderColor: '#FFB000', alignItems: 'center', justifyContent: 'center', marginTop: 10},
  cartPressed: {backgroundColor: '#FFF2CF'},
  cartText: {color: '#8B5D00', fontSize: 11, fontWeight: '900'},
  pressed: {opacity: 0.75},
});

export default ProductCard;
