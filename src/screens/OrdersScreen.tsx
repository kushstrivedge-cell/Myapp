import React, { useCallback } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrders } from '../context/OrdersContext';
import { RootStackParamList } from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'Orders'>;
function OrdersScreen({ navigation }: Props) {
  const { orders, retry } = useOrders();
  useFocusEffect(
    useCallback(() => {
      retry().catch(() => undefined);
    }, [retry]),
  );
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <FlatList
        contentContainerStyle={styles.content}
        data={orders}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>PURCHASE HISTORY</Text>
            <Text style={styles.title}>Your orders</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.copy}>
              Completed purchases will appear here.
            </Text>
            <Pressable
              onPress={() =>
                navigation.navigate('MainTabs', { screen: 'Categories' })
              }
              style={styles.shop}
            >
              <Text style={styles.shopText}>Start shopping</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate('OrderDetails', { orderId: item.id })
            }
            style={styles.card}
          >
            <View style={styles.row}>
              <Text style={styles.id}>{item.id}</Text>
              <Text
                style={[
                  styles.status,
                  item.status === 'Cancelled' && styles.cancelledStatus,
                  item.status === 'Return requested' && styles.returnStatus,
                ]}
              >
                {item.status}
              </Text>
            </View>
            <Text style={styles.copy}>
              Placed {new Date(item.placedAt).toLocaleDateString('en-IN')} ·{' '}
              {item.items.length} products
            </Text>
            <View style={styles.row}>
              <Text style={styles.total}>
                ₹{item.total.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.view}>View details ›</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6F8' },
  content: { padding: 14, flexGrow: 1 },
  heading: { padding: 4, marginBottom: 14 },
  eyebrow: {
    color: '#D94F04',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  title: { color: '#101820', fontSize: 25, fontWeight: '900', marginTop: 5 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  id: { color: '#34414A', fontSize: 11, fontWeight: '900' },
  status: {
    color: '#23835C',
    backgroundColor: '#E2F4EB',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 8,
    fontWeight: '900',
  },
  cancelledStatus: { color: '#B7352C', backgroundColor: '#FDE7E5' },
  returnStatus: { color: '#8B5B00', backgroundColor: '#FFF1D6' },
  copy: { color: '#7B858D', fontSize: 10, marginTop: 9 },
  total: { color: '#101820', fontSize: 16, fontWeight: '900', marginTop: 13 },
  view: { color: '#D94F04', fontSize: 9, fontWeight: '800', marginTop: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#101820', fontSize: 20, fontWeight: '900' },
  shop: {
    backgroundColor: '#101820',
    borderRadius: 8,
    paddingHorizontal: 17,
    paddingVertical: 12,
    marginTop: 17,
  },
  shopText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
});
export default OrdersScreen;
