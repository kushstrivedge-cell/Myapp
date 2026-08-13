import React, { createContext, ReactNode, useContext, useState } from 'react';

export type DeliveryAddress = {
  fullName: string;
  phone: string;
  pincode: string;
  city: string;
  state: string;
  addressLine: string;
};

export type ShippingMethod = 'standard' | 'express';
export type PaymentMethod = 'razorpay' | 'cod';

type CheckoutContextValue = {
  address: DeliveryAddress;
  shipping: ShippingMethod;
  payment: PaymentMethod;
  setAddress: (address: DeliveryAddress) => void;
  setShipping: (shipping: ShippingMethod) => void;
  setPayment: (payment: PaymentMethod) => void;
  resetCheckout: () => void;
};

const emptyAddress: DeliveryAddress = {
  fullName: '',
  phone: '',
  pincode: '',
  city: '',
  state: '',
  addressLine: '',
};

const CheckoutContext = createContext<CheckoutContextValue | undefined>(
  undefined,
);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState(emptyAddress);
  const [shipping, setShipping] = useState<ShippingMethod>('standard');
  const [payment, setPayment] = useState<PaymentMethod>('razorpay');

  const resetCheckout = () => {
    setAddress(emptyAddress);
    setShipping('standard');
    setPayment('razorpay');
  };

  return (
    <CheckoutContext.Provider
      value={{
        address,
        shipping,
        payment,
        setAddress,
        setShipping,
        setPayment,
        resetCheckout,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context)
    throw new Error('useCheckout must be used inside CheckoutProvider');
  return context;
}
