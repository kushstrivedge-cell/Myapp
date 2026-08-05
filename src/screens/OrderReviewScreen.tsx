import React from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import CheckoutProgress from '../components/checkout/CheckoutProgress';
import {useCart} from '../context/CartContext';
import {useCheckout} from '../context/CheckoutContext';
import {useOrders} from '../context/OrdersContext';
import {useNotifications} from '../context/NotificationsContext';
import {RootStackParamList} from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderReview'>;

function formatPrice(price: number) {
  return `₹${price.toLocaleString('en-IN')}`;
}

function OrderReviewScreen({navigation}: Props) {
  const {items, subtotal, discount, couponCode, clearCart} = useCart();
  const {address, shipping, payment, resetCheckout} = useCheckout();
  const {createOrder} = useOrders();
  const {addNotification} = useNotifications();
  const shippingCost = shipping === 'express' ? 149 : subtotal - discount >= 999 ? 0 : 99;
  const total = subtotal - discount + shippingCost;
  const paymentLabels = {upi: 'UPI', card: 'Credit or debit card', cod: 'Cash on delivery'};

  const placeOrder = () => {
    const order = createOrder({
      items: [...items], total, address: {...address}, shipping, payment,
    });
    addNotification('Order confirmed', `Order ${order.id} was placed successfully.`);
    clearCart();
    resetCheckout();
    navigation.replace('OrderSuccess', {orderId: order.id, total});
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <CheckoutProgress step={4} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>STEP 4 OF 4</Text>
        <Text style={styles.title}>Review your order</Text>
        <Text style={styles.subtitle}>Check everything once before placing the order.</Text>

        <View style={styles.card}>
          <View style={styles.cardHeading}><Text style={styles.cardTitle}>Delivery address</Text><Pressable onPress={() => navigation.navigate('Checkout')}><Text style={styles.edit}>Edit</Text></Pressable></View>
          <Text style={styles.strong}>{address.fullName}</Text>
          <Text style={styles.copy}>{address.addressLine}</Text>
          <Text style={styles.copy}>{address.city}, {address.state} {address.pincode}</Text>
          <Text style={styles.copy}>Phone: {address.phone}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeading}><Text style={styles.cardTitle}>Shipping & payment</Text><Pressable onPress={() => navigation.navigate('ShippingMethod')}><Text style={styles.edit}>Edit</Text></Pressable></View>
          <Text style={styles.strong}>{shipping === 'express' ? 'Express delivery' : 'Standard delivery'}</Text>
          <Text style={styles.copy}>{shipping === 'express' ? '1–2 business days' : '3–5 business days'}</Text>
          <View style={styles.miniDivider} />
          <Text style={styles.strong}>{paymentLabels[payment]}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Items ({items.reduce((sum, item) => sum + item.quantity, 0)})</Text>
          {items.map(item => (
            <View key={item.key} style={styles.item}>
              <View style={[styles.itemArt, {backgroundColor: item.product.color}]}><Text style={styles.itemLetter}>{item.product.label}</Text></View>
              <View style={styles.itemCopy}>
                <Text numberOfLines={2} style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.copy}>{item.colour} · {item.size} · Qty {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{formatPrice(item.product.price * item.quantity)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price details</Text>
          <View style={styles.priceRow}><Text style={styles.copy}>Subtotal</Text><Text style={styles.priceValue}>{formatPrice(subtotal)}</Text></View>
          {couponCode && <View style={styles.priceRow}><Text style={styles.saving}>{couponCode}</Text><Text style={styles.saving}>−{formatPrice(discount)}</Text></View>}
          <View style={styles.priceRow}><Text style={styles.copy}>Shipping</Text><Text style={shippingCost === 0 ? styles.saving : styles.priceValue}>{shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}</Text></View>
          <View style={styles.divider} />
          <View style={styles.priceRow}><Text style={styles.totalLabel}>Order total</Text><Text style={styles.total}>{formatPrice(total)}</Text></View>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <View><Text style={styles.footerCaption}>Payable total</Text><Text style={styles.footerTotal}>{formatPrice(total)}</Text></View>
        <Pressable disabled={items.length === 0} onPress={placeOrder} style={styles.button}><Text style={styles.buttonText}>Place order</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F5F6F8'}, content: {padding: 14, paddingBottom: 25},
  eyebrow: {color: '#D94F04', fontSize: 9, fontWeight: '900', letterSpacing: 1.3}, title: {color: '#101820', fontSize: 25, fontWeight: '900', marginTop: 6},
  subtitle: {color: '#76818A', fontSize: 11, marginTop: 5, marginBottom: 17}, card: {backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15, marginBottom: 10},
  cardHeading: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}, cardTitle: {color: '#101820', fontSize: 13, fontWeight: '900', marginBottom: 10},
  edit: {color: '#D94F04', fontSize: 9, fontWeight: '900', padding: 5}, strong: {color: '#35424B', fontSize: 11, fontWeight: '800', lineHeight: 18}, copy: {color: '#727E87', fontSize: 10, lineHeight: 17},
  miniDivider: {height: StyleSheet.hairlineWidth, backgroundColor: '#DDE1E4', marginVertical: 10}, item: {flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E0E4E7', paddingVertical: 11},
  itemArt: {width: 48, height: 54, borderRadius: 7, alignItems: 'center', justifyContent: 'center'}, itemLetter: {color: '#FFFFFF', fontSize: 21, fontWeight: '900'}, itemCopy: {flex: 1, paddingHorizontal: 9},
  itemName: {color: '#35424B', fontSize: 10, lineHeight: 14, fontWeight: '800'}, itemPrice: {color: '#101820', fontSize: 10, fontWeight: '900'},
  priceRow: {flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6}, priceValue: {color: '#3E4B54', fontSize: 10, fontWeight: '700'}, saving: {color: '#23835C', fontSize: 10, fontWeight: '800'},
  divider: {height: StyleSheet.hairlineWidth, backgroundColor: '#D7DCE0', marginVertical: 8}, totalLabel: {color: '#101820', fontSize: 13, fontWeight: '900'}, total: {color: '#101820', fontSize: 16, fontWeight: '900'},
  footer: {height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#C9D0D5', paddingHorizontal: 13},
  footerCaption: {color: '#7B858D', fontSize: 8}, footerTotal: {color: '#101820', fontSize: 17, fontWeight: '900'}, button: {height: 48, minWidth: 190, borderRadius: 9, backgroundColor: '#FFB000', alignItems: 'center', justifyContent: 'center'},
  buttonText: {color: '#101820', fontSize: 12, fontWeight: '900'},
});

export default OrderReviewScreen;
