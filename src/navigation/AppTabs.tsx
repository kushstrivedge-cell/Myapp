import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {StyleSheet, Text} from 'react-native';
import AccountScreen from '../screens/AccountScreen';
import CartScreen from '../screens/CartScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import HomeScreen from '../screens/HomeScreen';
import {useCart} from '../context/CartContext';
import {AppTabParamList} from './navigationTypes';

const Tab = createBottomTabNavigator<AppTabParamList>();

type TabIconProps = {color: string; focused: boolean};

const createTabIcon = (symbol: string) => {
  return function TabIcon({color, focused}: TabIconProps) {
    return (
      <Text
        style={[
          styles.icon,
          {color, borderColor: color},
          focused && styles.activeIcon,
        ]}>
        {symbol}
      </Text>
    );
  };
};

const HomeIcon = createTabIcon('H');
const CategoriesIcon = createTabIcon('C');
const CartIcon = createTabIcon('B');
const AccountIcon = createTabIcon('A');

function AppTabs() {
  const {itemCount} = useCart();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#D94F04',
        tabBarInactiveTintColor: '#68737C',
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
      }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{tabBarIcon: HomeIcon}} />
      <Tab.Screen name="Categories" component={CategoriesScreen} options={{tabBarIcon: CategoriesIcon}} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: CartIcon,
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tab.Screen name="Account" component={AccountScreen} options={{tabBarIcon: AccountIcon}} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {height: 66, paddingTop: 7, paddingBottom: 8, borderTopColor: '#E1E5E8'},
  label: {fontSize: 10, fontWeight: '700'},
  icon: {width: 27, height: 27, borderRadius: 8, borderWidth: 1, textAlign: 'center', textAlignVertical: 'center', fontSize: 12, fontWeight: '900'},
  activeIcon: {backgroundColor: '#FFF0E8'},
  badge: {backgroundColor: '#FFB000', color: '#101820', fontSize: 9, fontWeight: '900'},
});

export default AppTabs;
