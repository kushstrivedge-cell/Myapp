import React, { useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrders } from '../context/OrdersContext';
import { RootStackParamList } from '../navigation/navigationTypes';
type Props = NativeStackScreenProps<RootStackParamList, 'Cancellation'>;
const reasons = [
  'Ordered by mistake',
  'Need to change address',
  'Found a better price',
  'Other',
];
export default function CancellationScreen({ navigation, route }: Props) {
  const { orders, cancelOrder } = useOrders();
  const eligible = orders.filter(
    order => order.status === 'Confirmed' || order.status === 'Processing',
  );
  const [orderId, setOrderId] = useState(route.params?.orderId ?? '');
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedOrder = eligible.find(
    order => order.id === orderId || order.databaseId === orderId,
  );
  const cancellableItems =
    selectedOrder?.items.filter(
      item => item.quantity > (item.cancelledQuantity ?? 0),
    ) ?? [];
  useEffect(() => {
    setSelected(
      Object.fromEntries(cancellableItems.map(item => [item.key, true])),
    );
    // Reset the selected products whenever the chosen order changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);
  const submit = async () => {
    if (!orderId || !reason) {
      Alert.alert('Select an order and reason.');
      return;
    }
    const items = cancellableItems
      .filter(item => selected[item.key])
      .map(item => ({
        orderItemId: item.key,
        quantity: item.quantity - (item.cancelledQuantity ?? 0),
      }));
    if (!items.length) {
      Alert.alert('Select at least one item to cancel.');
      return;
    }
    const failure = await cancelOrder(orderId, reason, items);
    if (failure) {
      Alert.alert('Cannot cancel order', failure);
      return;
    }
    Alert.alert(
      items.length === cancellableItems.length
        ? 'Order cancelled'
        : 'Items cancelled',
      'Inventory was restored and the eligible refund was started.',
      [
        {
          text: 'Done',
          onPress: () => navigation.replace('OrderDetails', { orderId }),
        },
      ],
    );
  };
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>CANCELLATION</Text>
        <Text style={styles.title}>Cancel an order</Text>
        <Text style={styles.copy}>
          Confirmed and processing orders are eligible until shipment.
        </Text>
        <Text style={styles.heading}>Eligible order</Text>
        {eligible.map(order => (
          <Pressable
            key={order.id}
            onPress={() => setOrderId(order.id)}
            style={[styles.option, orderId === order.id && styles.selected]}
          >
            <Text style={styles.optionText}>
              {order.id} · ₹{order.total.toLocaleString('en-IN')}
            </Text>
          </Pressable>
        ))}
        {!eligible.length && (
          <Text style={styles.copy}>No orders are currently eligible.</Text>
        )}
        {!!selectedOrder && (
          <>
            <Text style={styles.heading}>Select items to cancel</Text>
            {cancellableItems.map(item => (
              <Pressable
                key={item.key}
                onPress={() =>
                  setSelected(value => ({
                    ...value,
                    [item.key]: !value[item.key],
                  }))
                }
                style={[
                  styles.itemOption,
                  selected[item.key] && styles.selected,
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    selected[item.key] && styles.checkedBox,
                  ]}
                >
                  {selected[item.key] && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <View style={styles.itemCopy}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  <Text style={styles.itemMeta}>
                    Qty {item.quantity - (item.cancelledQuantity ?? 0)} · ₹
                    {item.product.price.toLocaleString('en-IN')}
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        )}
        <Text style={styles.heading}>Reason</Text>
        {reasons.map(item => (
          <Pressable
            key={item}
            onPress={() => setReason(item)}
            style={[styles.option, reason === item && styles.selected]}
          >
            <Text style={styles.optionText}>{item}</Text>
          </Pressable>
        ))}
        {!!eligible.length && (
          <Pressable onPress={submit} style={styles.button}>
            <Text style={styles.buttonText}>Confirm cancellation</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6F8' },
  content: { padding: 18 },
  eyebrow: {
    color: '#D94F04',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  title: { color: '#101820', fontSize: 26, fontWeight: '900', marginTop: 5 },
  copy: { color: '#78838B', fontSize: 10, marginTop: 5 },
  heading: {
    color: '#34414A',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 21,
    marginBottom: 8,
  },
  option: {
    height: 49,
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D9DEE1',
    borderRadius: 9,
    paddingHorizontal: 13,
    marginBottom: 7,
  },
  selected: { borderColor: '#E85D04', backgroundColor: '#FFF7F2' },
  optionText: { color: '#43505A', fontSize: 10, fontWeight: '800' },
  itemOption: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9DEE1',
    borderRadius: 9,
    padding: 11,
    marginBottom: 7,
  },
  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#AEB7BD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: { borderColor: '#23835C', backgroundColor: '#23835C' },
  checkmark: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  itemCopy: { flex: 1, marginLeft: 10 },
  itemName: { color: '#2F3D46', fontSize: 10, fontWeight: '900' },
  itemMeta: { color: '#77838B', fontSize: 9, marginTop: 4 },
  button: {
    height: 49,
    backgroundColor: '#C43D2C',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
});
