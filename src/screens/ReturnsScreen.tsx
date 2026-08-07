import React, { useCallback, useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrders } from '../context/OrdersContext';
import { RootStackParamList } from '../navigation/navigationTypes';
import ReturnTimelineCard from '../components/returns/ReturnTimelineCard';
import {
  fulfilmentApi,
  ReturnEligibility,
  ReturnRequest,
} from '../services/fulfilmentApi';
type Props = NativeStackScreenProps<RootStackParamList, 'Returns'>;
const reasons = [
  'Damaged or defective',
  'Wrong item received',
  'No longer needed',
  'Other',
];
export default function ReturnsScreen({ navigation, route }: Props) {
  const { orders, requestReturn } = useOrders();
  const eligibleOrders = orders.filter(order => order.status === 'Delivered');
  const [orderId, setOrderId] = useState(
    route.params?.orderId ?? eligibleOrders[0]?.id ?? '',
  );
  const [reason, setReason] = useState('');
  const [eligibility, setEligibility] = useState<ReturnEligibility | null>(
    null,
  );
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [existingReturns, setExistingReturns] = useState<ReturnRequest[]>([]);
  const loadReturns = useCallback(
    () =>
      fulfilmentApi
        .returns()
        .then(setExistingReturns)
        .catch(() => undefined),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      loadReturns();
    }, [loadReturns]),
  );
  useEffect(() => {
    if (!orderId) return;
    fulfilmentApi
      .eligibility(orderId)
      .then(result => {
        setEligibility(result);
        setSelected({});
      })
      .catch(error =>
        Alert.alert(
          'Return eligibility',
          error instanceof Error
            ? error.message
            : 'Could not check eligibility.',
        ),
      );
  }, [orderId]);
  const submit = async () => {
    if (!eligibility || !reason)
      return Alert.alert('Select items and a reason.');
    const items = eligibility.items
      .filter(item => selected[item.id])
      .map(item => ({ orderItemId: item.id, quantity: item.quantity }));
    if (!items.length) return Alert.alert('Select at least one item.');
    const failure = await requestReturn(orderId, reason, items);
    if (failure) return Alert.alert('Return unavailable', failure);
    await loadReturns();
    Alert.alert(
      'Return requested',
      'Your selected items were submitted for admin review.',
      [
        {
          text: 'View order',
          onPress: () => navigation.replace('OrderDetails', { orderId }),
        },
      ],
    );
  };
  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>RETURNS CENTRE</Text>
        <Text style={styles.title}>Return items</Text>
        <Text style={styles.copy}>
          Delivered items are eligible for 30 days.
        </Text>
        {!!existingReturns.length && (
          <Text style={styles.heading}>Your return requests</Text>
        )}
        {existingReturns.map(item => (
          <ReturnTimelineCard
            item={item}
            key={item.id}
            onSchedulePickup={async () => {
              try {
                await fulfilmentApi.schedulePickup(
                  item.id,
                  new Date(Date.now() + 2 * 86_400_000).toISOString(),
                );
                await loadReturns();
                Alert.alert(
                  'Pickup scheduled',
                  'Pickup is scheduled for two days from now.',
                );
              } catch (error) {
                Alert.alert(
                  'Pickup unavailable',
                  error instanceof Error ? error.message : 'Try again.',
                );
              }
            }}
          />
        ))}
        <Text style={styles.heading}>Order</Text>
        {eligibleOrders.map(order => (
          <Pressable
            key={order.id}
            onPress={() => setOrderId(order.id)}
            style={[styles.option, orderId === order.id && styles.selected]}
          >
            <Text style={styles.text}>{order.id}</Text>
          </Pressable>
        ))}
        <Text style={styles.heading}>Select items</Text>
        {eligibility?.items.map(item => (
          <Pressable
            key={item.id}
            onPress={() =>
              setSelected(value => ({ ...value, [item.id]: !value[item.id] }))
            }
            style={[styles.option, selected[item.id] && styles.selected]}
          >
            <Text style={styles.text}>
              {selected[item.id] ? '✓ ' : ''}
              {item.productName} · Qty {item.quantity} · ₹{item.unitPrice}
            </Text>
          </Pressable>
        ))}
        <Text style={styles.heading}>Reason</Text>
        {reasons.map(item => (
          <Pressable
            key={item}
            onPress={() => setReason(item)}
            style={[styles.option, reason === item && styles.selected]}
          >
            <Text style={styles.text}>{item}</Text>
          </Pressable>
        ))}
        <Pressable onPress={submit} style={styles.button}>
          <Text style={styles.buttonText}>Submit selected items</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6F8' },
  content: { padding: 17, paddingBottom: 35 },
  eyebrow: { color: '#D94F04', fontSize: 9, fontWeight: '900' },
  title: { color: '#101820', fontSize: 27, fontWeight: '900', marginTop: 5 },
  copy: { color: '#78838B', fontSize: 10, marginTop: 5 },
  heading: {
    color: '#34414A',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 20,
    marginBottom: 8,
  },
  option: {
    minHeight: 49,
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D9DEE1',
    borderRadius: 9,
    padding: 12,
    marginBottom: 7,
  },
  selected: { borderColor: '#E85D04', backgroundColor: '#FFF7F2' },
  text: { color: '#43505A', fontSize: 10, fontWeight: '800' },
  button: {
    height: 49,
    backgroundColor: '#FFB000',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#101820', fontSize: 11, fontWeight: '900' },
});
