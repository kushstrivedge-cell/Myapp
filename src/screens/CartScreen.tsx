import React, { useState } from 'react';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartItem, useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import {
  AppTabParamList,
  RootStackParamList,
} from '../navigation/navigationTypes';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, 'Cart'>,
  NativeStackScreenProps<RootStackParamList>
>;

function formatPrice(price: number) {
  return `₹${price.toLocaleString('en-IN')}`;
}

function CartScreen({ navigation }: Props) {
  const { user } = useAuth();
  const rootNavigation =
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const {
    items,
    itemCount,
    subtotal,
    couponCode,
    discount,
    tax,
    applyCoupon,
    removeCoupon,
    updateQuantity,
    removeItem,
    clearCart,
    shipping: delivery,
    total,
  } = useCart();
  const [couponInput, setCouponInput] = useState(couponCode ?? '');
  const [couponMessage, setCouponMessage] = useState('');

  const couponApplied = Boolean(couponCode);

  const submitCoupon = async () => {
    if (!(await applyCoupon(couponInput))) {
      setCouponMessage('SAVE10 applied — you saved 10%.');
      return;
    }
    setCouponMessage('Coupon not recognised. Try SAVE10.');
  };

  const confirmRemoval = (item: CartItem) => {
    Alert.alert('Remove item?', item.product.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeItem(item.key),
      },
    ]);
  };

  if (items.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.emptyHeader}>
          <Text style={styles.headerEyebrow}>YOUR BAG</Text>
          <Text style={styles.headerTitle}>Shopping cart</Text>
        </View>
        <View style={styles.empty}>
          <View style={styles.emptyBag}>
            <Text style={styles.emptyBagText}>0</Text>
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyCopy}>
            Products you add will be waiting for you here.
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Categories')}
            style={styles.shopButton}
          >
            <Text style={styles.shopText}>Start shopping</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>YOUR BAG</Text>
          <Text style={styles.headerTitle}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text>
        </View>
        <Pressable
          onPress={() =>
            Alert.alert('Clear cart?', 'This will remove every item.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: clearCart },
            ])
          }
        >
          <Text style={styles.clearCart}>Clear cart</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={items}
        keyExtractor={item => item.key}
        ListFooterComponent={
          <View>
            <View style={styles.couponCard}>
              <Text style={styles.cardTitle}>Have a coupon?</Text>
              <View style={styles.couponRow}>
                <TextInput
                  autoCapitalize="characters"
                  editable={!couponApplied}
                  onChangeText={text => {
                    setCouponInput(text);
                    setCouponMessage('');
                  }}
                  placeholder="Enter coupon code"
                  placeholderTextColor="#8B949B"
                  style={styles.couponInput}
                  value={couponInput}
                />
                <Pressable
                  onPress={
                    couponApplied
                      ? () => {
                          removeCoupon();
                          setCouponInput('');
                          setCouponMessage('Coupon removed.');
                        }
                      : submitCoupon
                  }
                  style={styles.couponButton}
                >
                  <Text style={styles.couponButtonText}>
                    {couponApplied ? 'Remove' : 'Apply'}
                  </Text>
                </Pressable>
              </View>
              {couponMessage.length > 0 && (
                <Text
                  style={[
                    styles.couponMessage,
                    !couponApplied &&
                      couponInput.length > 0 &&
                      styles.couponError,
                  ]}
                >
                  {couponMessage}
                </Text>
              )}
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Price summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
              </View>
              {couponApplied && (
                <View style={styles.summaryRow}>
                  <Text style={styles.discountLabel}>Coupon discount</Text>
                  <Text style={styles.discountLabel}>
                    −{formatPrice(discount)}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery</Text>
                <Text
                  style={
                    delivery === 0 ? styles.discountLabel : styles.summaryValue
                  }
                >
                  {delivery === 0 ? 'FREE' : formatPrice(delivery)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST (18%)</Text>
                <Text style={styles.summaryValue}>{formatPrice(tax)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Order total</Text>
                <Text style={styles.totalValue}>{formatPrice(total)}</Text>
              </View>
              <Text style={styles.taxNote}>
                Inclusive of all applicable taxes
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              rootNavigation?.navigate('ProductDetails', {
                productId: item.product.id,
              })
            }
            style={styles.itemCard}
          >
            {item.product.imageUrl ? (
              <Image
                accessibilityLabel={item.product.name}
                resizeMode="cover"
                source={{ uri: item.product.imageUrl }}
                style={styles.itemImage}
              />
            ) : (
              <View
                style={[
                  styles.itemArt,
                  { backgroundColor: item.product.color },
                ]}
              >
                <Text style={styles.itemLetter}>{item.product.label}</Text>
              </View>
            )}
            <View style={styles.itemInfo}>
              <Text numberOfLines={2} style={styles.itemName}>
                {item.product.name}
              </Text>
              <Text style={styles.variant}>
                {item.colour} · {item.size}
              </Text>
              <Text style={styles.inStock}>In stock</Text>
              <Text style={styles.itemPrice}>
                {formatPrice(item.product.price)}
              </Text>
              <View style={styles.itemActions}>
                <View style={styles.quantityControl}>
                  <Pressable
                    accessibilityLabel="Decrease quantity"
                    onPress={event => {
                      event.stopPropagation();
                      updateQuantity(item.key, item.quantity - 1);
                    }}
                    style={styles.quantityButton}
                  >
                    <Text style={styles.quantitySymbol}>−</Text>
                  </Pressable>
                  <Text style={styles.quantity}>{item.quantity}</Text>
                  <Pressable
                    accessibilityLabel="Increase quantity"
                    onPress={event => {
                      event.stopPropagation();
                      updateQuantity(item.key, item.quantity + 1);
                    }}
                    style={styles.quantityButton}
                  >
                    <Text style={styles.quantitySymbol}>+</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={event => {
                    event.stopPropagation();
                    confirmRemoval(item);
                  }}
                >
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.checkoutBar}>
        <View>
          <Text style={styles.checkoutCaption}>Total</Text>
          <Text style={styles.checkoutTotal}>{formatPrice(total)}</Text>
        </View>
        <Pressable
          onPress={() => {
            if (user) rootNavigation?.navigate('Checkout');
            else rootNavigation?.navigate('Login', { redirect: 'Checkout' });
          }}
          style={({ pressed }) => [
            styles.checkoutButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.checkoutText}>Proceed to checkout →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6F7' },
  header: {
    height: 85,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 17,
  },
  emptyHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 17,
    paddingVertical: 20,
  },
  headerEyebrow: {
    color: '#D94F04',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  headerTitle: { color: '#101820', fontSize: 25, fontWeight: '900' },
  clearCart: { color: '#C43D2C', fontSize: 11, fontWeight: '800', padding: 8 },
  listContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 24 },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    padding: 11,
    marginBottom: 10,
  },
  itemArt: {
    width: 105,
    height: 122,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImage: {
    width: 105,
    height: 122,
    borderRadius: 10,
    backgroundColor: '#EEF1F3',
  },
  itemLetter: { color: '#FFFFFF', fontSize: 45, fontWeight: '900' },
  itemInfo: { flex: 1, paddingLeft: 12 },
  itemName: {
    color: '#26323B',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  variant: { color: '#7B858D', fontSize: 9, marginTop: 5 },
  inStock: { color: '#23835C', fontSize: 9, fontWeight: '800', marginTop: 4 },
  itemPrice: {
    color: '#101820',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 7,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 9,
  },
  quantityControl: {
    height: 31,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D3D9DD',
    borderRadius: 7,
  },
  quantityButton: {
    width: 30,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantitySymbol: { color: '#27343D', fontSize: 16, fontWeight: '800' },
  quantity: {
    width: 25,
    color: '#101820',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '900',
  },
  removeText: { color: '#C43D2C', fontSize: 9, fontWeight: '800', padding: 7 },
  couponCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    padding: 15,
    marginTop: 4,
  },
  cardTitle: {
    color: '#101820',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 12,
  },
  couponRow: {
    height: 42,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D7DCE0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  couponInput: {
    flex: 1,
    color: '#101820',
    fontSize: 11,
    paddingHorizontal: 11,
    paddingVertical: 0,
  },
  couponButton: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1E9',
  },
  couponButtonText: { color: '#D94F04', fontSize: 10, fontWeight: '900' },
  couponMessage: {
    color: '#23835C',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 8,
  },
  couponError: { color: '#C43D2C' },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    padding: 15,
    marginTop: 11,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 7,
  },
  summaryLabel: { color: '#66727B', fontSize: 11 },
  summaryValue: { color: '#3A4650', fontSize: 11, fontWeight: '700' },
  discountLabel: { color: '#23835C', fontSize: 11, fontWeight: '800' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D5DADF',
    marginVertical: 8,
  },
  totalLabel: { color: '#101820', fontSize: 14, fontWeight: '900' },
  totalValue: { color: '#101820', fontSize: 17, fontWeight: '900' },
  taxNote: { color: '#8A949C', fontSize: 8, textAlign: 'right' },
  checkoutBar: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CAD1D5',
    paddingHorizontal: 13,
  },
  checkoutCaption: { color: '#7B858D', fontSize: 9 },
  checkoutTotal: { color: '#101820', fontSize: 17, fontWeight: '900' },
  checkoutButton: {
    height: 48,
    minWidth: 220,
    borderRadius: 9,
    backgroundColor: '#FFB000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  checkoutText: { color: '#101820', fontSize: 11, fontWeight: '900' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyBag: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: '#FFF0CE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBagText: { color: '#D98B00', fontSize: 40, fontWeight: '900' },
  emptyTitle: {
    color: '#101820',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 21,
  },
  emptyCopy: {
    color: '#75818A',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  shopButton: {
    backgroundColor: '#101820',
    borderRadius: 9,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 20,
  },
  shopText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  pressed: { opacity: 0.7 },
});

export default CartScreen;
