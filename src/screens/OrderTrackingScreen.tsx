import React, { useEffect, useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OrderRecord, OrderStatus, useOrders } from '../context/OrdersContext';
import { RootStackParamList } from '../navigation/navigationTypes';
import { AsyncStateView } from '../components/feedback/AsyncStateView';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderTracking'>;
type Step = {
  status: OrderStatus;
  title: string;
  pendingMessage: string;
};

const deliverySteps: Step[] = [
  {
    status: 'Confirmed',
    title: 'Order confirmed',
    pendingMessage: 'Waiting for order confirmation.',
  },
  {
    status: 'Processing',
    title: 'Preparing your order',
    pendingMessage: 'The seller will pack and prepare your items.',
  },
  {
    status: 'Shipped',
    title: 'Shipped',
    pendingMessage: 'Your package will be handed to the delivery partner.',
  },
  {
    status: 'Delivered',
    title: 'Delivered',
    pendingMessage: 'Your package will be delivered to your address.',
  },
];

const returnSteps: Step[] = [
  {
    status: 'Return requested',
    title: 'Return requested',
    pendingMessage: 'A return can be requested after delivery.',
  },
  {
    status: 'Returned',
    title: 'Return completed',
    pendingMessage: 'The return and refund will be completed after inspection.',
  },
];

function OrderTrackingScreen({ route }: Props) {
  const { findOrder, loadOrder } = useOrders();
  const [order, setOrder] = useState<OrderRecord | undefined>(() =>
    findOrder(route.params.orderId),
  );
  const [error, setError] = useState('');

  const refresh = () => {
    setError('');
    return loadOrder(route.params.orderId)
      .then(setOrder)
      .catch(failure =>
        setError(
          failure instanceof Error
            ? failure.message
            : 'Could not load tracking.',
        ),
      );
  };

  useEffect(() => {
    refresh();
    // The order ID is the only value that should trigger a new request here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params.orderId]);

  const steps = useMemo(() => {
    if (!order) return [];
    if (order.status === 'Cancelled') {
      const reached = deliverySteps.filter(step =>
        order.timeline.some(event => event.status === step.status),
      );
      return [
        ...reached,
        {
          status: 'Cancelled' as const,
          title: 'Order cancelled',
          pendingMessage: 'This order was cancelled.',
        },
      ];
    }
    if (order.status === 'Return requested' || order.status === 'Returned')
      return [...deliverySteps, ...returnSteps];
    return deliverySteps;
  }, [order]);

  if (!order && !error)
    return <AsyncStateView loading loadingLabel="Loading tracking…" />;
  if (!order) return <AsyncStateView error={error} onRetry={refresh} />;

  const currentIndex = Math.max(
    0,
    steps.findIndex(step => step.status === order.status),
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>ORDER STATUS TIMELINE</Text>
        <Text style={styles.title}>{order.id}</Text>
        <View
          style={[
            styles.currentStatus,
            order.status === 'Cancelled' && styles.cancelledStatus,
          ]}
        >
          <Text
            style={[
              styles.currentLabel,
              order.status === 'Cancelled' && styles.cancelledStatusText,
            ]}
          >
            CURRENT STATUS
          </Text>
          <Text
            style={[
              styles.currentValue,
              order.status === 'Cancelled' && styles.cancelledStatusText,
            ]}
          >
            {order.status}
          </Text>
        </View>
        <Text style={styles.copy}>
          Live progress based on updates from the Cartly fulfilment system.
        </Text>

        {(order.carrier ||
          order.trackingNumber ||
          order.estimatedDeliveryAt) && (
          <View style={styles.shipmentCard}>
            <Text style={styles.shipmentTitle}>Shipment details</Text>
            {!!order.carrier && (
              <Text style={styles.shipmentCopy}>Carrier: {order.carrier}</Text>
            )}
            {!!order.trackingNumber && (
              <Text style={styles.trackingNumber}>
                Tracking ID: {order.trackingNumber}
              </Text>
            )}
            {!!order.estimatedDeliveryAt && order.status !== 'Delivered' && (
              <Text style={styles.shipmentCopy}>
                Expected by{' '}
                {new Date(order.estimatedDeliveryAt).toLocaleDateString(
                  'en-IN',
                )}
              </Text>
            )}
            {!!order.deliveredAt && (
              <Text style={styles.shipmentCopy}>
                Delivered {new Date(order.deliveredAt).toLocaleString('en-IN')}
              </Text>
            )}
          </View>
        )}
        {order.status === 'Cancelled' && order.cancellationReason && (
          <View style={styles.cancellationCard}>
            <Text style={styles.cancellationTitle}>Cancellation reason</Text>
            <Text style={styles.shipmentCopy}>{order.cancellationReason}</Text>
          </View>
        )}

        <View style={styles.card}>
          {steps.map((step, index) => {
            const event = [...order.timeline]
              .reverse()
              .find(value => value.status === step.status);
            const completed = index < currentIndex;
            const current = index === currentIndex;
            const upcoming = index > currentIndex;
            const cancelled = step.status === 'Cancelled';
            return (
              <View key={step.status} style={styles.step}>
                <View style={styles.markerColumn}>
                  <View
                    style={[
                      styles.dot,
                      completed && styles.completedDot,
                      current && styles.currentDot,
                      cancelled && styles.cancelledDot,
                    ]}
                  >
                    {completed ? (
                      <Text style={styles.check}>✓</Text>
                    ) : current ? (
                      <View style={styles.dotCentre} />
                    ) : null}
                  </View>
                  {index < steps.length - 1 && (
                    <View
                      style={[
                        styles.line,
                        index < currentIndex && styles.completedLine,
                      ]}
                    />
                  )}
                </View>
                <View style={styles.event}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        styles.stepTitle,
                        upcoming && styles.upcomingTitle,
                        current && styles.activeTitle,
                        cancelled && styles.cancelledTitle,
                      ]}
                    >
                      {step.title}
                    </Text>
                    {current && (
                      <Text
                        style={[
                          styles.nowBadge,
                          cancelled && styles.cancelledBadge,
                        ]}
                      >
                        CURRENT
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[styles.message, upcoming && styles.upcomingText]}
                  >
                    {event?.message ?? step.pendingMessage}
                  </Text>
                  {event ? (
                    <Text style={styles.date}>
                      {new Date(event.createdAt).toLocaleString('en-IN')}
                    </Text>
                  ) : upcoming ? (
                    <Text style={styles.awaiting}>UPCOMING</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6F8' },
  content: { padding: 18, paddingBottom: 35 },
  eyebrow: {
    color: '#D94F04',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  title: { color: '#101820', fontSize: 25, fontWeight: '900', marginTop: 5 },
  currentStatus: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5F5ED',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: 12,
  },
  currentLabel: { color: '#287A59', fontSize: 7, fontWeight: '900' },
  currentValue: {
    color: '#176644',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  cancelledStatus: { backgroundColor: '#FDE7E5' },
  cancelledStatusText: { color: '#B7352C' },
  copy: { color: '#78838B', fontSize: 10, marginTop: 10, marginBottom: 18 },
  shipmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  shipmentTitle: {
    color: '#26343D',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 7,
  },
  shipmentCopy: { color: '#65717A', fontSize: 9, lineHeight: 15, marginTop: 3 },
  trackingNumber: {
    color: '#176644',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
  },
  cancellationCard: {
    backgroundColor: '#FFF1EF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cancellationTitle: {
    color: '#B7352C',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
  },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18 },
  step: { minHeight: 94, flexDirection: 'row' },
  markerColumn: { width: 36, alignItems: 'center' },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C7CED3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedDot: { borderColor: '#23835C', backgroundColor: '#23835C' },
  currentDot: { borderColor: '#23835C', backgroundColor: '#E9F7F0' },
  cancelledDot: { borderColor: '#C43D2C', backgroundColor: '#FFF0EF' },
  dotCentre: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#23835C',
  },
  check: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', lineHeight: 14 },
  line: { width: 2, flex: 1, backgroundColor: '#DDE2E5' },
  completedLine: { backgroundColor: '#23835C' },
  event: { flex: 1, paddingBottom: 22 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  stepTitle: { color: '#34414A', fontSize: 12, fontWeight: '900' },
  activeTitle: { color: '#23835C' },
  cancelledTitle: { color: '#C43D2C' },
  upcomingTitle: { color: '#8B959C' },
  nowBadge: {
    color: '#176644',
    backgroundColor: '#E2F4EB',
    borderRadius: 4,
    fontSize: 7,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 8,
  },
  cancelledBadge: { color: '#A62E22', backgroundColor: '#FFE4E2' },
  message: { color: '#65717A', fontSize: 9, lineHeight: 15, marginTop: 5 },
  upcomingText: { color: '#9AA2A8' },
  date: { color: '#89949B', fontSize: 8, fontWeight: '700', marginTop: 6 },
  awaiting: { color: '#A4ACB1', fontSize: 7, fontWeight: '900', marginTop: 7 },
});

export default OrderTrackingScreen;
