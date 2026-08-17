import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';
import { useCart } from '../src/context/CartContext';
import { useWishlist } from '../src/context/WishlistContext';
import { useAddressBook } from '../src/context/AddressBookContext';
import { useAuth } from '../src/context/AuthContext';

const categories = [
  'Deals',
  'Mobiles',
  'Fashion',
  'Home',
  'Electronics',
  'Beauty',
];

type NavbarProps = {
  onSearch: (query: string) => void;
  onOpenCategories: () => void;
  onOpenAccount: () => void;
  onOpenAddresses: () => void;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onSelectCategory: (category: string) => void;
  searchSuggestions?: string[];
};

function Navbar({
  onSearch,
  onOpenCategories,
  onOpenAccount,
  onOpenAddresses,
  onOpenCart,
  onOpenWishlist,
  onSelectCategory,
  searchSuggestions = [],
}: NavbarProps) {
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const { addresses, loading: addressesLoading } = useAddressBook();
  const deliveryAddress =
    addresses.find(address => address.isDefault) ?? addresses[0];
  const deliveryLabel = addressesLoading
    ? 'Loading delivery address…'
    : !user
    ? 'Sign in to set delivery address'
    : deliveryAddress
    ? `${deliveryAddress.fullName} — ${deliveryAddress.addressLine}, ${deliveryAddress.city} ${deliveryAddress.pincode}`
    : 'Add a delivery address';

  const submitSearch = () => {
    const query = search.trim();
    if (query) {
      onSearch(query);
    }
  };
  const suggestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query || !searchFocused) return [];
    return [
      ...new Set(searchSuggestions.map(item => item.trim()).filter(Boolean)),
    ]
      .filter(item => item.toLowerCase().includes(query))
      .sort(
        (a, b) =>
          Number(!a.toLowerCase().startsWith(query)) -
          Number(!b.toLowerCase().startsWith(query)),
      )
      .slice(0, 6);
  }, [search, searchFocused, searchSuggestions]);
  const chooseSuggestion = (suggestion: string) => {
    setSearch(suggestion);
    setSearchFocused(false);
    onSearch(suggestion);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.navbar}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            hitSlop={10}
            onPress={onOpenCategories}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </Pressable>

          <View style={styles.brandWrap}>
            <Text style={styles.brand}>cartly</Text>
            <View style={styles.brandDot} />
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={onOpenAccount}
              style={({ pressed }) => [
                styles.accountButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.hello}>Hello, sign in</Text>
              <Text style={styles.account}>Account ▾</Text>
            </Pressable>

            <Pressable
              accessibilityLabel={`Wishlist with ${wishlistCount} items`}
              accessibilityRole="button"
              onPress={onOpenWishlist}
              style={({ pressed }) => [
                styles.smallAction,
                pressed && styles.pressed,
              ]}
            >
              <Heart
                color="#FFFFFF"
                fill={wishlistCount > 0 ? '#FFFFFF' : 'transparent'}
                size={23}
                strokeWidth={2}
              />
              {wishlistCount > 0 && (
                <View style={styles.smallBadge}>
                  <Text style={styles.smallBadgeText}>{wishlistCount}</Text>
                </View>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cart with ${itemCount} items`}
              onPress={onOpenCart}
              style={({ pressed }) => [
                styles.cartButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.cartIcon}>🛒</Text>
              {itemCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{itemCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityLabel={deliveryLabel}
          accessibilityRole="button"
          onPress={onOpenAddresses}
          style={({ pressed }) => [styles.location, pressed && styles.pressed]}
        >
          <Text style={styles.pin}>●</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            Deliver to{' '}
            <Text style={styles.locationStrong}>{deliveryLabel}</Text>
          </Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <View style={styles.searchBar}>
          <TextInput
            accessibilityLabel="Search products"
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
            onSubmitEditing={submitSearch}
            placeholder="Search Cartly"
            placeholderTextColor="#727B84"
            returnKeyType="search"
            style={styles.input}
            value={search}
          />
          {search.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
              onPress={() => setSearch('')}
            >
              <Text style={styles.clear}>×</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit search"
            onPress={submitSearch}
            style={({ pressed }) => [
              styles.searchButton,
              pressed && styles.searchPressed,
            ]}
          >
            <Text style={styles.searchIcon}>⌕</Text>
          </Pressable>
        </View>
        {suggestions.length > 0 && (
          <View style={styles.suggestionMenu}>
            {suggestions.map(suggestion => (
              <Pressable
                key={suggestion}
                onPress={() => chooseSuggestion(suggestion)}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  pressed && styles.suggestionPressed,
                ]}
              >
                <Text style={styles.suggestionSearch}>⌕</Text>
                <Text numberOfLines={1} style={styles.suggestionLabel}>
                  {suggestion}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.categoryContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categories}
      >
        {categories.map((category, index) => (
          <Pressable
            accessibilityRole="button"
            key={category}
            onPress={() => onSelectCategory(category)}
            style={({ pressed }) => [
              styles.category,
              pressed && styles.categoryPressed,
            ]}
          >
            <Text style={[styles.categoryText, index === 0 && styles.dealText]}>
              {category}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#101820' },
  navbar: {
    backgroundColor: '#101820',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  topRow: { height: 56, flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 38, height: 38, justifyContent: 'center' },
  menuIcon: { color: '#FFFFFF', fontSize: 25, lineHeight: 28 },
  brandWrap: { flexDirection: 'row', alignItems: 'flex-end' },
  brand: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -1,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFB000',
    marginBottom: 5,
    marginLeft: 2,
  },
  actions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' },
  accountButton: {
    alignItems: 'flex-end',
    marginRight: 13,
    paddingVertical: 5,
  },
  hello: { color: '#C9D0D6', fontSize: 9 },
  account: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  smallAction: {
    width: 34,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 3,
  },
  smallBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFB000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBadgeText: { color: '#101820', fontSize: 8, fontWeight: '900' },
  cartButton: {
    width: 38,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartIcon: { fontSize: 25 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFB000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#101820', fontSize: 10, fontWeight: '900' },
  location: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  pin: { color: '#FFB000', fontSize: 10, marginRight: 7 },
  locationText: { flex: 1, color: '#C9D0D6', fontSize: 12 },
  locationStrong: { color: '#FFFFFF', fontWeight: '700' },
  chevron: { color: '#FFFFFF', fontSize: 21 },
  searchBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    color: '#101820',
    fontSize: 15,
    paddingHorizontal: 15,
    paddingVertical: 0,
  },
  clear: { color: '#727B84', fontSize: 24, paddingHorizontal: 8 },
  searchButton: {
    width: 52,
    height: 48,
    backgroundColor: '#FFB000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchPressed: { backgroundColor: '#E99F00' },
  searchIcon: {
    color: '#101820',
    fontSize: 29,
    fontWeight: '700',
    transform: [{ rotate: '-20deg' }],
  },
  suggestionMenu: {
    marginTop: 5,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  suggestionRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E6E9',
  },
  suggestionPressed: { backgroundColor: '#F1F3F4' },
  suggestionSearch: { width: 24, color: '#66737C', fontSize: 18 },
  suggestionLabel: {
    flex: 1,
    color: '#25313A',
    fontSize: 13,
    fontWeight: '500',
  },
  categories: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDE1E5',
  },
  categoryContent: { paddingHorizontal: 9 },
  category: { height: 46, justifyContent: 'center', paddingHorizontal: 11 },
  categoryPressed: { backgroundColor: '#F0F2F4' },
  categoryText: { color: '#303942', fontSize: 14, fontWeight: '600' },
  dealText: { color: '#D94F04' },
  pressed: { opacity: 0.65 },
});

export default Navbar;
