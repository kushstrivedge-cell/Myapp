import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrders } from '../context/OrdersContext';
import { RootStackParamList } from '../navigation/navigationTypes';
import PlaceholderScreen from './PlaceholderScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetails'>;
function OrderDetailsScreen({ navigation, route }: Props) {
  const { findOrder } = useOrders();
  const order = findOrder(route.params.orderId);
  if (!order)
    return (
      <PlaceholderScreen
        eyebrow="NOT FOUND"
        title="Order unavailable"
        description="We could not find this order."
      />
    );
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>ORDER {order.id}</Text>
        <Text style={styles.title}>{order.status}</Text>
        <Text style={styles.date}>
          Placed on {new Date(order.placedAt).toLocaleDateString('en-IN')}
        </Text>
        <Pressable
          onPress={() =>
            navigation.navigate('OrderTracking', { orderId: order.id })
          }
          style={styles.trackButton}
        >
          <Text style={styles.trackButtonText}>Track this order ›</Text>
        </Pressable>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Products</Text>
          {order.items.map(item => (
            <View key={item.key} style={styles.item}>
              {item.product.imageUrl ? (
                <Image
                  accessibilityLabel={item.product.name}
                  resizeMode="cover"
                  source={{ uri: item.product.imageUrl }}
                  style={styles.productImage}
                />
              ) : (
                <View
                  style={[styles.art, { backgroundColor: item.product.color }]}
                >
                  <Text style={styles.letter}>{item.product.label}</Text>
                </View>
              )}
              <View style={styles.itemCopy}>
                <Text style={styles.name}>{item.product.name}</Text>
                <Text style={styles.copy}>
                  {item.colour} · {item.size} · Qty {item.quantity}
                </Text>
                {!!item.cancelledQuantity && (
                  <Text style={styles.cancelledItem}>
                    {item.cancelledQuantity} cancelled · Refund ₹
                    {(item.refundedAmount ?? 0).toLocaleString('en-IN')}
                  </Text>
                )}
              </View>
              <Text style={styles.price}>
                ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivered to</Text>
          <Text style={styles.name}>{order.address.fullName}</Text>
          <Text style={styles.copy}>
            {order.address.addressLine}, {order.address.city},{' '}
            {order.address.state} {order.address.pincode}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment summary</Text>
          <Text style={styles.copy}>
            {order.payment.toUpperCase()} · {order.shipping} shipping
          </Text>
          <Text style={styles.paymentStatus}>
            Payment: {order.paymentStatus.replaceAll('_', ' ')}
          </Text>
          <Text style={styles.orderTotal}>
            ₹{order.total.toLocaleString('en-IN')}
          </Text>
          {order.status === 'Cancelled' && (
            <Text style={styles.refund}>
              Refund status: processing to original payment method
            </Text>
          )}
          {order.status === 'Return requested' && (
            <Text style={styles.refund}>
              Your return request is waiting for review.
            </Text>
          )}
          {order.status === 'Returned' && (
            <Text style={styles.refund}>
              Return completed and the refund was processed.
            </Text>
          )}
        </View>
        {(order.status === 'Confirmed' || order.status === 'Processing') && (
          <Pressable
            onPress={() =>
              navigation.navigate('Cancellation', { orderId: order.id })
            }
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel order</Text>
          </Pressable>
        )}
        {order.status === 'Delivered' && (
          <Pressable
            onPress={() =>
              navigation.navigate('Returns', { orderId: order.id })
            }
            style={styles.returnButton}
          >
            <Text style={styles.returnText}>Return or replace items</Text>
          </Pressable>
        )}
        {(order.status === 'Return requested' ||
          order.status === 'Returned') && (
          <Pressable
            onPress={() =>
              navigation.navigate('Returns', { orderId: order.id })
            }
            style={styles.returnButton}
          >
            <Text style={styles.returnText}>View return progress</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6F8' },
  content: { padding: 14, paddingBottom: 30 },
  eyebrow: {
    color: '#D94F04',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: { color: '#101820', fontSize: 25, fontWeight: '900', marginTop: 5 },
  date: { color: '#7B858D', fontSize: 9, marginTop: 4, marginBottom: 14 },
  trackButton: {
    height: 45,
    borderRadius: 9,
    backgroundColor: '#E5F4ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  trackButtonText: { color: '#23835C', fontSize: 10, fontWeight: '900' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  cardTitle: {
    color: '#101820',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DFE3E6',
    paddingVertical: 10,
  },
  art: {
    width: 45,
    height: 50,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  productImage: {
    width: 45,
    height: 50,
    borderRadius: 7,
    backgroundColor: '#EEF1F3',
  },
  itemCopy: { flex: 1, paddingHorizontal: 9 },
  name: { color: '#34414A', fontSize: 10, fontWeight: '900' },
  copy: { color: '#78838B', fontSize: 9, lineHeight: 15, marginTop: 4 },
  price: { color: '#101820', fontSize: 9, fontWeight: '900' },
  cancelledItem: {
    color: '#B7352C',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
  },
  orderTotal: {
    color: '#101820',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 10,
  },
  paymentStatus: {
    color: '#59666F',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 7,
  },
  refund: { color: '#23835C', fontSize: 9, fontWeight: '800', marginTop: 8 },
  cancelButton: {
    height: 47,
    backgroundColor: '#C43D2C',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cancelText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  returnButton: {
    height: 47,
    borderWidth: 1,
    borderColor: '#C43D2C',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnText: { color: '#C43D2C', fontSize: 10, fontWeight: '900' },
});
export default OrderDetailsScreen;
