import React, {createContext, ReactNode, useContext, useState} from 'react';
import {CartItem} from './CartContext';
import {DeliveryAddress, PaymentMethod, ShippingMethod} from './CheckoutContext';

export type OrderStatus = 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Return requested';

export type OrderRecord = {
  id: string;
  items: CartItem[];
  total: number;
  placedAt: string;
  status: OrderStatus;
  address: DeliveryAddress;
  shipping: ShippingMethod;
  payment: PaymentMethod;
  returnReason?: string;
};

type NewOrder = Omit<OrderRecord, 'id' | 'placedAt' | 'status'>;

type OrdersContextValue = {
  orders: OrderRecord[];
  createOrder: (order: NewOrder) => OrderRecord;
  findOrder: (orderId: string) => OrderRecord | undefined;
  requestReturn: (orderId: string, reason: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;
};

const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);

export function OrdersProvider({children}: {children: ReactNode}) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  const createOrder = (order: NewOrder) => {
    const record: OrderRecord = {
      ...order,
      id: `CRT${Date.now().toString().slice(-8)}`,
      placedAt: new Date().toISOString(),
      status: 'Confirmed',
    };
    setOrders(current => [record, ...current]);
    return record;
  };

  const requestReturn = (orderId: string, reason: string) => {
    setOrders(current => current.map(order =>
      order.id === orderId
        ? {...order, status: 'Return requested', returnReason: reason}
        : order,
    ));
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
        createOrder,
        findOrder: orderId => orders.find(order => order.id === orderId),
        requestReturn,
        cancelOrder: (orderId, reason) => setOrders(current => current.map(order => order.id === orderId ? {...order, status: 'Cancelled', returnReason: reason} : order)),
      }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) throw new Error('useOrders must be used inside OrdersProvider');
  return context;
}
