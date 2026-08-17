import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  ActivityIndicator,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CatalogueProduct } from '../data/products';
import { useCatalogue } from '../context/CatalogueContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/navigationTypes';
import WishlistButton from '../../components/WishlistButton';
import PlaceholderScreen from './PlaceholderScreen';
import { AsyncStateView } from '../components/feedback/AsyncStateView';
import {
  ProductReview,
  ReviewSummary,
  catalogueApi,
} from '../services/catalogueApi';
import ProductCard from '../../components/landingpage/ProductCard';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetails'>;

function formatPrice(price: number) {
  return `₹${price.toLocaleString('en-IN')}`;
}

function ProductDetailsScreen({ navigation, route }: Props) {
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const { findProduct, loadProduct } = useCatalogue();
  const [product, setProduct] = useState<CatalogueProduct | undefined>(() =>
    findProduct(route.params.productId),
  );
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
    average: 0,
    total: 0,
    distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
  });
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [related, setRelated] = useState<CatalogueProduct[]>([]);
  const [loading, setLoading] = useState(!product);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const { width } = useWindowDimensions();
  const galleryRef = useRef<ScrollView>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColour, setSelectedColour] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('');
  const [deliveryMessage, setDeliveryMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    Promise.all([
      loadProduct(route.params.productId),
      catalogueApi.reviews(route.params.productId, 1, 10),
      catalogueApi.related(route.params.productId, 6),
    ])
      .then(([loadedProduct, reviewResult, relatedProducts]) => {
        if (!active) return;
        setProduct(loadedProduct);
        setReviews(reviewResult.items);
        setReviewSummary(reviewResult.summary);
        setRelated(relatedProducts);
        setSelectedColour(
          loadedProduct.variants.find(variant => variant.colour)?.colour ??
            'Standard',
        );
        setSelectedSize(
          loadedProduct.variants.find(variant => variant.size)?.size ??
            'Standard',
        );
      })
      .catch(requestError => {
        if (active)
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : 'Could not load this product.',
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadProduct, reloadKey, route.params.productId]);

  const colours = useMemo(
    () =>
      product
        ? [
            ...new Set(
              product.variants
                .map(variant => variant.colour)
                .filter((value): value is string => Boolean(value)),
            ),
          ]
        : [],
    [product],
  );
  const sizes = useMemo(
    () =>
      product
        ? [
            ...new Set(
              product.variants
                .map(variant => variant.size)
                .filter((value): value is string => Boolean(value)),
            ),
          ]
        : [],
    [product],
  );
  const gallery = useMemo(
    () =>
      product?.images.length
        ? product.images
        : [
            {
              id: 'fallback',
              url: '',
              alt: product?.name ?? 'Product',
              position: 0,
            },
          ],
    [product],
  );
  const selectedVariant =
    product?.variants.find(
      variant =>
        (!variant.colour || variant.colour === selectedColour) &&
        (!variant.size || variant.size === selectedSize),
    ) ?? product?.variants[0];

  if (loading && !product)
    return <AsyncStateView loading loadingLabel="Loading product…" />;
  if (loadError && !product)
    return (
      <AsyncStateView
        error={loadError}
        onRetry={() => setReloadKey(value => value + 1)}
      />
    );

  if (!product) {
    return (
      <PlaceholderScreen
        eyebrow="NOT FOUND"
        title="Product unavailable"
        description="This product could not be found in the catalogue."
      />
    );
  }

  const discount = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0;

  const updateGallery = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveImage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const goToImage = (index: number) => {
    galleryRef.current?.scrollTo({ x: index * width, animated: true });
    setActiveImage(index);
  };

  const checkDelivery = () => {
    if (!/^\d{6}$/.test(pincode)) {
      setDeliveryMessage('Enter a valid 6-digit pincode.');
      return;
    }
    setDeliveryMessage('Delivery available in 2–4 business days.');
  };

  const addToCart = async () => {
    if (!selectedVariant?.inStock) {
      Alert.alert('Out of stock', 'Choose an available product variant.');
      return;
    }
    const failure = await addItem(
      product,
      { colour: selectedColour, size: selectedSize },
      quantity,
    );
    if (failure) {
      Alert.alert('Could not add item', failure);
      return;
    }
    Alert.alert(
      'Added to cart',
      `${quantity} × ${product.name}\n${selectedColour} · ${selectedSize}`,
    );
  };

  const buyNow = async () => {
    if (!selectedVariant?.inStock) {
      Alert.alert('Out of stock', 'Choose an available product variant.');
      return;
    }
    const failure = await addItem(
      product,
      { colour: selectedColour, size: selectedSize },
      quantity,
    );
    if (failure) {
      Alert.alert('Could not add item', failure);
      return;
    }
    if (user) navigation.navigate('Checkout');
    else navigation.navigate('Login', { redirect: 'Checkout' });
  };

  const openReviewForm = () => {
    if (!user) {
      Alert.alert(
        'Sign in to review',
        'You need a Cartly account to write a customer review.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Sign in',
            onPress: () =>
              navigation.navigate('Login', { redirect: 'Account' }),
          },
        ],
      );
      return;
    }
    const existing = reviews.find(review => review.user.id === user.id);
    setReviewRating(existing?.rating ?? 0);
    setReviewTitle(existing?.title ?? '');
    setReviewText(existing?.text ?? '');
    setReviewFormOpen(true);
  };

  const submitReview = async () => {
    if (!reviewRating) {
      Alert.alert('Choose a rating', 'Select between 1 and 5 stars.');
      return;
    }
    if (reviewTitle.trim().length < 3) {
      Alert.alert(
        'Add a headline',
        'Use at least 3 characters for your review headline.',
      );
      return;
    }
    if (reviewText.trim().length < 10) {
      Alert.alert(
        'Tell us more',
        'Write at least 10 characters about your experience.',
      );
      return;
    }
    setReviewSubmitting(true);
    try {
      await catalogueApi.saveReview(product.id, {
        rating: reviewRating,
        title: reviewTitle.trim(),
        text: reviewText.trim(),
      });
      const [reviewResult, refreshedProduct] = await Promise.all([
        catalogueApi.reviews(product.id, 1, 10),
        catalogueApi.product(product.id),
      ]);
      setReviews(reviewResult.items);
      setReviewSummary(reviewResult.summary);
      setProduct(refreshedProduct);
      setReviewFormOpen(false);
      Alert.alert('Review submitted', 'Thank you for sharing your experience.');
    } catch (reviewError) {
      Alert.alert(
        'Could not submit review',
        reviewError instanceof Error
          ? reviewError.message
          : 'Please try again.',
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.galleryWrap}>
          <ScrollView
            horizontal
            onMomentumScrollEnd={updateGallery}
            pagingEnabled
            ref={galleryRef}
            showsHorizontalScrollIndicator={false}
          >
            {gallery.map((image, index) => (
              <View
                key={image.id}
                style={[
                  styles.gallerySlide,
                  {
                    width,
                    backgroundColor:
                      index === 0
                        ? product.color
                        : `${product.color}${index === 1 ? 'CC' : '99'}`,
                  },
                ]}
              >
                {image.url ? (
                  <Image
                    accessibilityLabel={image.alt ?? product.name}
                    resizeMode="contain"
                    source={{ uri: image.url }}
                    style={styles.galleryImage}
                  />
                ) : (
                  <View style={styles.productShape}>
                    <Text
                      style={[styles.productLetter, { color: product.color }]}
                    >
                      {product.label}
                    </Text>
                  </View>
                )}
                <Text style={styles.galleryLabel}>
                  {image.alt ?? `${product.name} view`}
                </Text>
              </View>
            ))}
          </ScrollView>
          <WishlistButton
            label={`${isWishlisted(product.id) ? 'Remove' : 'Add'} ${
              product.name
            } ${isWishlisted(product.id) ? 'from' : 'to'} wishlist`}
            large
            onPress={async () => {
              const failure = await toggleWishlist(product);
              if (failure) Alert.alert('Wishlist', failure);
            }}
            selected={isWishlisted(product.id)}
            style={styles.wishlist}
          />
          <View style={styles.galleryDots}>
            {gallery.map((image, index) => (
              <Pressable
                accessibilityLabel={`Show ${image.alt ?? product.name}`}
                key={image.id}
                onPress={() => goToImage(index)}
                style={[styles.dot, activeImage === index && styles.activeDot]}
              />
            ))}
          </View>
        </View>

        <View style={styles.mainInfo}>
          <Text style={styles.category}>{product.category.toUpperCase()}</Text>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBadgeText}>{product.rating} ★</Text>
            </View>
            <Text style={styles.reviewCount}>
              {product.reviews.toLocaleString('en-IN')} ratings
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {product.oldPrice && (
              <Text style={styles.oldPrice}>
                {formatPrice(product.oldPrice)}
              </Text>
            )}
            {discount > 0 && (
              <Text style={styles.discount}>{discount}% off</Text>
            )}
          </View>
          <Text style={styles.taxText}>Inclusive of all taxes</Text>
          <Text
            style={[
              styles.stockText,
              !selectedVariant?.inStock && styles.outOfStock,
            ]}
          >
            {selectedVariant?.inStock
              ? `${selectedVariant.stock} available`
              : 'Currently out of stock'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Colour: <Text style={styles.selection}>{selectedColour}</Text>
          </Text>
          <View style={styles.optionRow}>
            {colours.map((colour, index) => (
              <Pressable
                accessibilityRole="radio"
                key={colour}
                onPress={() => setSelectedColour(colour)}
                style={[
                  styles.colourOption,
                  { backgroundColor: ['#536C7A', '#D4B995', '#E85D04'][index] },
                  selectedColour === colour && styles.selectedColour,
                ]}
              />
            ))}
          </View>

          <Text style={[styles.sectionTitle, styles.sizeTitle]}>
            Size: <Text style={styles.selection}>{selectedSize}</Text>
          </Text>
          <View style={styles.optionRow}>
            {sizes.map(size => (
              <Pressable
                accessibilityRole="radio"
                key={size}
                onPress={() => setSelectedSize(size)}
                style={[
                  styles.sizeOption,
                  selectedSize === size && styles.selectedSize,
                ]}
              >
                <Text
                  style={[
                    styles.sizeText,
                    selectedSize === size && styles.selectedSizeText,
                  ]}
                >
                  {size}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.quantityControl}>
            <Pressable
              accessibilityLabel="Decrease quantity"
              disabled={quantity === 1}
              onPress={() => setQuantity(current => Math.max(1, current - 1))}
              style={styles.quantityButton}
            >
              <Text
                style={[
                  styles.quantitySymbol,
                  quantity === 1 && styles.disabled,
                ]}
              >
                −
              </Text>
            </Pressable>
            <Text style={styles.quantity}>{quantity}</Text>
            <Pressable
              accessibilityLabel="Increase quantity"
              onPress={() => setQuantity(current => Math.min(10, current + 1))}
              style={styles.quantityButton}
            >
              <Text style={styles.quantitySymbol}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Check delivery</Text>
          <View style={styles.deliveryRow}>
            <TextInput
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={text => {
                setPincode(text.replace(/\D/g, ''));
                setDeliveryMessage('');
              }}
              placeholder="Enter 6-digit pincode"
              placeholderTextColor="#8A949B"
              style={styles.pincodeInput}
              value={pincode}
            />
            <Pressable onPress={checkDelivery} style={styles.checkButton}>
              <Text style={styles.checkText}>Check</Text>
            </Pressable>
          </View>
          {deliveryMessage.length > 0 && (
            <Text
              style={[
                styles.deliveryMessage,
                !/^\d{6}$/.test(pincode) && styles.deliveryError,
              ]}
            >
              {deliveryMessage}
            </Text>
          )}
          <View style={styles.deliveryBenefits}>
            <Text style={styles.benefit}>✓ Free delivery</Text>
            <Text style={styles.benefit}>↺ 7-day returns</Text>
            <Text style={styles.benefit}>▣ Secure payment</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this product</Text>
          <Text style={styles.description}>{product.description}</Text>
          <Text style={styles.bullet}>• Quality checked before dispatch</Text>
          <Text style={styles.bullet}>
            • Covered by the Cartly replacement policy
          </Text>
        </View>

        <View style={[styles.section, styles.reviewSection]}>
          <View style={styles.reviewHeading}>
            <View>
              <Text style={styles.sectionTitle}>Customer reviews</Text>
              <Text style={styles.reviewSubtitle}>
                Ratings and comments from Cartly customers
              </Text>
            </View>
            <Pressable
              onPress={openReviewForm}
              style={styles.writeReviewButton}
            >
              <Text style={styles.writeReviewText}>
                {reviews.some(review => review.user.id === user?.id)
                  ? 'Edit review'
                  : 'Write a review'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.reviewOverview}>
            <View style={styles.reviewScore}>
              <Text style={styles.bigRating}>
                {reviewSummary.average.toFixed(1)}
              </Text>
              <Text style={styles.stars}>
                {'★'.repeat(Math.round(reviewSummary.average))}
                {'☆'.repeat(5 - Math.round(reviewSummary.average))}
              </Text>
              <Text style={styles.reviewTotal}>
                {reviewSummary.total} global{' '}
                {reviewSummary.total === 1 ? 'rating' : 'ratings'}
              </Text>
            </View>
            <View style={styles.ratingBreakdown}>
              {[5, 4, 3, 2, 1].map(rating => {
                const count = reviewSummary.distribution[String(rating)] ?? 0;
                const percent = reviewSummary.total
                  ? (count / reviewSummary.total) * 100
                  : 0;
                return (
                  <View key={rating} style={styles.ratingLine}>
                    <Text style={styles.ratingLabel}>{rating} star</Text>
                    <View style={styles.ratingTrack}>
                      <View
                        style={[styles.ratingFill, { width: `${percent}%` }]}
                      />
                    </View>
                    <Text style={styles.ratingPercent}>
                      {Math.round(percent)}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
          {reviewFormOpen && (
            <View style={styles.reviewForm}>
              <View style={styles.formHeading}>
                <Text style={styles.formTitle}>Share your experience</Text>
                <Pressable onPress={() => setReviewFormOpen(false)}>
                  <Text style={styles.formClose}>×</Text>
                </Pressable>
              </View>
              <Text style={styles.formLabel}>Overall rating</Text>
              <View style={styles.starPicker}>
                {[1, 2, 3, 4, 5].map(rating => (
                  <Pressable
                    accessibilityLabel={`${rating} stars`}
                    key={rating}
                    onPress={() => setReviewRating(rating)}
                  >
                    <Text
                      style={[
                        styles.pickStar,
                        rating <= reviewRating && styles.pickStarActive,
                      ]}
                    >
                      ★
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.formLabel}>Add a headline</Text>
              <TextInput
                maxLength={100}
                onChangeText={setReviewTitle}
                placeholder="What’s most important to know?"
                placeholderTextColor="#8A949B"
                style={styles.reviewInput}
                value={reviewTitle}
              />
              <Text style={styles.formLabel}>Write your review</Text>
              <TextInput
                maxLength={2000}
                multiline
                onChangeText={setReviewText}
                placeholder="What did you like or dislike? How did you use this product?"
                placeholderTextColor="#8A949B"
                style={[styles.reviewInput, styles.reviewTextarea]}
                textAlignVertical="top"
                value={reviewText}
              />
              <Text style={styles.characterCount}>
                {reviewText.length}/2000
              </Text>
              <Pressable
                disabled={reviewSubmitting}
                onPress={() => void submitReview()}
                style={({ pressed }) => [
                  styles.submitReviewButton,
                  (pressed || reviewSubmitting) && styles.pressed,
                ]}
              >
                {reviewSubmitting ? (
                  <ActivityIndicator color="#101820" />
                ) : (
                  <Text style={styles.submitReviewText}>Submit review</Text>
                )}
              </Pressable>
            </View>
          )}
          {reviews.map(review => (
            <View key={review.id} style={styles.review}>
              <View style={styles.reviewerRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{review.user.name[0]}</Text>
                </View>
                <Text style={styles.reviewer}>{review.user.name}</Text>
                {review.verifiedPurchase ? (
                  <Text style={styles.verified}>Verified purchase</Text>
                ) : (
                  <Text style={styles.customerBadge}>Cartly customer</Text>
                )}
              </View>
              <Text style={styles.reviewStars}>
                {'★'.repeat(review.rating)}
                {'☆'.repeat(5 - review.rating)}
              </Text>
              {review.title && (
                <Text style={styles.reviewTitle}>{review.title}</Text>
              )}
              {review.text && (
                <Text style={styles.reviewText}>{review.text}</Text>
              )}
              <Text style={styles.reviewDate}>
                Reviewed on{' '}
                {new Date(review.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ))}
          {reviews.length === 0 && (
            <Text style={styles.description}>
              No reviews yet. Be the first to review this product.
            </Text>
          )}
        </View>

        {related.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Related products</Text>
            <ScrollView
              contentContainerStyle={styles.relatedProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {related.map(item => (
                <ProductCard
                  compact
                  key={item.id}
                  onPress={() =>
                    navigation.push('ProductDetails', { productId: item.id })
                  }
                  product={item}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <View style={styles.purchaseBar}>
        <Pressable
          disabled={!selectedVariant?.inStock}
          onPress={addToCart}
          style={({ pressed }) => [
            styles.addButton,
            !selectedVariant?.inStock && styles.unavailableButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.addText}>Add to cart</Text>
        </Pressable>
        <Pressable
          disabled={!selectedVariant?.inStock}
          onPress={buyNow}
          style={({ pressed }) => [
            styles.buyButton,
            !selectedVariant?.inStock && styles.unavailableButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buyText}>
            Buy now · {formatPrice(product.price * quantity)}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  galleryWrap: { height: 362, backgroundColor: '#EEF1F3' },
  gallerySlide: { height: 330, alignItems: 'center', justifyContent: 'center' },
  galleryImage: { height: 250, width: '82%', borderRadius: 18 },
  productShape: {
    width: 176,
    height: 190,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
  },
  productLetter: { fontSize: 86, fontWeight: '900' },
  galleryLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  wishlist: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  galleryDots: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#BCC4CA' },
  activeDot: { width: 20, backgroundColor: '#E85D04' },
  mainInfo: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 20,
  },
  category: {
    color: '#D94F04',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginBottom: 6,
  },
  productName: {
    color: '#101820',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 11 },
  ratingBadge: {
    backgroundColor: '#23835C',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  ratingBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  reviewCount: { color: '#78838C', fontSize: 10, marginLeft: 7 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 18 },
  price: { color: '#101820', fontSize: 27, fontWeight: '900' },
  oldPrice: {
    color: '#8B949B',
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginLeft: 9,
  },
  discount: {
    color: '#D94F04',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 9,
  },
  taxText: { color: '#6F7B84', fontSize: 10, marginTop: 3 },
  stockText: {
    color: '#23835C',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 7,
  },
  outOfStock: { color: '#C43D2D' },
  section: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 8,
    borderTopColor: '#F0F2F4',
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  sectionTitle: { color: '#101820', fontSize: 15, fontWeight: '900' },
  selection: { fontWeight: '600', color: '#56626B' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  colourOption: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  selectedColour: {
    outlineWidth: 2,
    outlineColor: '#101820',
    outlineOffset: 2,
  },
  sizeTitle: { marginTop: 21 },
  sizeOption: {
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D5DADE',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  selectedSize: { borderColor: '#E85D04', backgroundColor: '#FFF2EB' },
  sizeText: { color: '#5B6770', fontSize: 11, fontWeight: '700' },
  selectedSizeText: { color: '#C94800' },
  quantityControl: {
    width: 130,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7DCE0',
    borderRadius: 8,
    marginTop: 13,
  },
  quantityButton: {
    width: 42,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantitySymbol: { color: '#101820', fontSize: 21, fontWeight: '700' },
  disabled: { color: '#C4CACE' },
  quantity: {
    flex: 1,
    color: '#101820',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  deliveryRow: {
    height: 44,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D8DDE1',
    borderRadius: 8,
    marginTop: 13,
    overflow: 'hidden',
  },
  pincodeInput: {
    flex: 1,
    color: '#101820',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  checkButton: { width: 72, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#D94F04', fontSize: 11, fontWeight: '900' },
  deliveryMessage: {
    color: '#23835C',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
  },
  deliveryError: { color: '#C43D2D' },
  deliveryBenefits: { marginTop: 16, gap: 8 },
  benefit: { color: '#56626B', fontSize: 11 },
  description: {
    color: '#56626B',
    fontSize: 12,
    lineHeight: 20,
    marginTop: 11,
    marginBottom: 8,
  },
  bullet: { color: '#56626B', fontSize: 11, lineHeight: 20 },
  reviewSection: { paddingBottom: 30 },
  reviewHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  reviewSubtitle: { color: '#7A858D', fontSize: 10, marginTop: 4 },
  writeReviewButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#C9D1D6',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  writeReviewText: { color: '#34414B', fontSize: 10, fontWeight: '900' },
  reviewOverview: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 20,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDE2E5',
  },
  reviewScore: { width: 105, alignItems: 'center', justifyContent: 'center' },
  reviewTotal: {
    color: '#78838C',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
  },
  ratingBreakdown: { flex: 1, gap: 7 },
  ratingLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ratingLabel: { width: 34, color: '#59666F', fontSize: 9 },
  ratingTrack: {
    flex: 1,
    height: 8,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: '#E8ECEF',
  },
  ratingFill: { height: 8, borderRadius: 4, backgroundColor: '#FFB000' },
  ratingPercent: {
    width: 27,
    color: '#78838C',
    fontSize: 9,
    textAlign: 'right',
  },
  reviewForm: {
    marginTop: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: '#D9DFE3',
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
  },
  formHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formTitle: { color: '#101820', fontSize: 16, fontWeight: '900' },
  formClose: { color: '#6F7B84', fontSize: 25, paddingHorizontal: 4 },
  formLabel: {
    color: '#43515B',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 14,
    marginBottom: 7,
  },
  starPicker: { flexDirection: 'row', gap: 8 },
  pickStar: { color: '#C5CDD2', fontSize: 34 },
  pickStarActive: { color: '#FFB000' },
  reviewInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#D3DADF',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    color: '#101820',
    fontSize: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  reviewTextarea: { height: 110, lineHeight: 18 },
  characterCount: {
    color: '#8A949B',
    fontSize: 9,
    textAlign: 'right',
    marginTop: 5,
  },
  submitReviewButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#FFB000',
    marginTop: 15,
  },
  submitReviewText: { color: '#101820', fontSize: 11, fontWeight: '900' },
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 9,
  },
  bigRating: {
    color: '#101820',
    fontSize: 42,
    fontWeight: '900',
    marginRight: 12,
  },
  stars: { color: '#FFB000', fontSize: 17, letterSpacing: 1 },
  review: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDE1E4',
    paddingTop: 16,
    marginTop: 16,
  },
  reviewerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8ECEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: { color: '#43515B', fontSize: 11, fontWeight: '900' },
  reviewer: { color: '#34414B', fontSize: 11, fontWeight: '800' },
  verified: {
    color: '#23835C',
    fontSize: 8,
    fontWeight: '800',
    marginLeft: 'auto',
  },
  customerBadge: {
    color: '#78838C',
    fontSize: 8,
    fontWeight: '800',
    marginLeft: 'auto',
  },
  reviewStars: { color: '#FFB000', fontSize: 12, marginTop: 9 },
  reviewTitle: {
    color: '#26323B',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  reviewText: { color: '#68747D', fontSize: 11, lineHeight: 17, marginTop: 4 },
  reviewDate: { color: '#929BA2', fontSize: 8, marginTop: 9 },
  relatedProducts: { paddingTop: 14, paddingRight: 4 },
  purchaseBar: {
    flexDirection: 'row',
    gap: 9,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CCD2D6',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  addButton: {
    flex: 0.9,
    height: 48,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E09B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: '#8B5D00', fontSize: 12, fontWeight: '900' },
  buyButton: {
    flex: 1.35,
    height: 48,
    borderRadius: 9,
    backgroundColor: '#FFB000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyText: { color: '#101820', fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.7 },
  unavailableButton: { opacity: 0.45 },
});

export default ProductDetailsScreen;
