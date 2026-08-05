import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {StatusBar, StyleSheet, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {CartProvider} from './src/context/CartContext';
import {CheckoutProvider} from './src/context/CheckoutContext';
import {SearchProvider} from './src/context/SearchContext';
import {WishlistProvider} from './src/context/WishlistContext';
import {AuthProvider} from './src/context/AuthContext';
import {OrdersProvider} from './src/context/OrdersContext';
import {AddressBookProvider} from './src/context/AddressBookContext';
import {NotificationsProvider} from './src/context/NotificationsContext';
import RootNavigator from './src/navigation/RootNavigator';
import {NetworkProvider} from './src/context/NetworkContext';
import {ConnectivityBanner} from './src/components/feedback/ConnectivityBanner';
import {AsyncStateView} from './src/components/feedback/AsyncStateView';
import {useAuth} from './src/context/AuthContext';
import {CatalogueProvider} from './src/context/CatalogueContext';

function AppContent() {
  const {loading, retrySession, sessionError} = useAuth();

  if (loading) {
    return <AsyncStateView loading loadingLabel="Restoring your session…" />;
  }

  if (sessionError) {
    return <AsyncStateView error={sessionError} onRetry={retrySession} />;
  }

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <NetworkProvider>
        <View style={styles.app}>
          <ConnectivityBanner />
          <AuthProvider>
            <CatalogueProvider>
              <AddressBookProvider>
              <CartProvider>
                <CheckoutProvider>
                  <OrdersProvider>
                    <NotificationsProvider>
                      <SearchProvider>
                        <WishlistProvider>
                          <AppContent />
                        </WishlistProvider>
                      </SearchProvider>
                    </NotificationsProvider>
                  </OrdersProvider>
                </CheckoutProvider>
              </CartProvider>
              </AddressBookProvider>
            </CatalogueProvider>
          </AuthProvider>
        </View>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({app: {flex: 1}});

export default App;
