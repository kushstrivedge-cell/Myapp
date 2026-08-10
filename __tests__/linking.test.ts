import { getStateFromPath } from '@react-navigation/native';
import { linking } from '../src/navigation/linking';

test('maps an order email link to the order tracking screen', () => {
  const state = getStateFromPath('orders/order-123/track', linking.config);
  const route = state?.routes[0];

  expect(route?.name).toBe('OrderTracking');
  expect(route?.params).toEqual({ orderId: 'order-123' });
});
