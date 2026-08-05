import {NavigatorScreenParams} from '@react-navigation/native';

export type AppTabParamList = {
  Home: undefined;
  Categories: {category?: string} | undefined;
  Cart: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<AppTabParamList> | undefined;
  ProductDetails: {productId: string};
  SearchResults: {query?: string};
  Wishlist: undefined;
  Login: {redirect?: 'Account' | 'Checkout'} | undefined;
  Register: {redirect?: 'Account' | 'Checkout'} | undefined;
  VerifyOtp: {redirect?: 'Account' | 'Checkout'} | undefined;
  ForgotPassword: undefined;
  ResetPassword: {email: string};
  Profile: undefined;
  Addresses: undefined;
  Orders: undefined;
  OrderDetails: {orderId: string};
  Returns: {orderId?: string} | undefined;
  OrderTracking: {orderId: string};
  Cancellation: {orderId?: string} | undefined;
  Notifications: undefined;
  HelpSupport: undefined;
  Legal: {document: 'privacy' | 'terms'};
  Checkout: undefined;
  ShippingMethod: undefined;
  Payment: undefined;
  OrderReview: undefined;
  OrderSuccess: {orderId: string; total: number};
};
