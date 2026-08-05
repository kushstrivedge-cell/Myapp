import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import CheckoutScreen from '../screens/CheckoutScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import PaymentScreen from '../screens/PaymentScreen';
import ShippingMethodScreen from '../screens/ShippingMethodScreen';
import OrderReviewScreen from '../screens/OrderReviewScreen';
import OrderSuccessScreen from '../screens/OrderSuccessScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import WishlistScreen from '../screens/WishlistScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AddressesScreen from '../screens/AddressesScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import ReturnsScreen from '../screens/ReturnsScreen';
import VerifyOtpScreen from '../screens/VerifyOtpScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import CancellationScreen from '../screens/CancellationScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import LegalScreen from '../screens/LegalScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import AppTabs from './AppTabs';
import {RootStackParamList} from './navigationTypes';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: '#101820'},
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {fontWeight: '800'},
        contentStyle: {backgroundColor: '#F5F6F8'},
      }}>
      <Stack.Screen name="MainTabs" component={AppTabs} options={{headerShown: false}} />
      <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} options={{title: 'Product details'}} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} options={{title: 'Search results'}} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} options={{title: 'Your wishlist'}} />
      <Stack.Screen name="Login" component={LoginScreen} options={{title: 'Sign in'}} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{title: 'Create account'}} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} options={{title: 'Verify email'}} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{title: 'Reset password'}} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{title: 'New password'}} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{title: 'Profile'}} />
      <Stack.Screen name="Addresses" component={AddressesScreen} options={{title: 'Addresses'}} />
      <Stack.Screen name="Orders" component={OrdersScreen} options={{title: 'Orders'}} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} options={{title: 'Order details'}} />
      <Stack.Screen name="Returns" component={ReturnsScreen} options={{title: 'Returns & refunds'}} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{title: 'Track order'}} />
      <Stack.Screen name="Cancellation" component={CancellationScreen} options={{title: 'Cancel order'}} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{title: 'Help & support'}} />
      <Stack.Screen name="Legal" component={LegalScreen} options={({route}) => ({title: route.params.document === 'privacy' ? 'Privacy policy' : 'Terms of use'})} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{title: 'Checkout'}} />
      <Stack.Screen name="ShippingMethod" component={ShippingMethodScreen} options={{title: 'Shipping'}} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{title: 'Payment'}} />
      <Stack.Screen name="OrderReview" component={OrderReviewScreen} options={{title: 'Review order'}} />
      <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{headerShown: false, gestureEnabled: false}} />
    </Stack.Navigator>
  );
}

export default RootNavigator;
