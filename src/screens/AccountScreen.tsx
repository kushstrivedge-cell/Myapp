import React from 'react';
import {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAuth} from '../context/AuthContext';
import {useOrders} from '../context/OrdersContext';
import {useWishlist} from '../context/WishlistContext';
import {useNotifications} from '../context/NotificationsContext';
import {AppTabParamList, RootStackParamList} from '../navigation/navigationTypes';

type Props = BottomTabScreenProps<AppTabParamList, 'Account'>;

function AccountScreen({navigation}: Props) {
  const {user, logout} = useAuth(); const {orders} = useOrders(); const {count} = useWishlist();
  const {unreadCount} = useNotifications();
  const root = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  if (!user) return <SafeAreaView edges={['top']} style={styles.safeArea}><StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" /><View style={styles.guest}><View style={styles.avatar}><Text style={styles.avatarText}>?</Text></View><Text style={styles.guestTitle}>Your Cartly account</Text><Text style={styles.guestCopy}>Sign in to view orders, manage addresses and keep your wishlist available.</Text><Pressable onPress={() => root?.navigate('Login')} style={styles.primary}><Text style={styles.primaryText}>Sign in</Text></Pressable><Pressable onPress={() => root?.navigate('Register')} style={styles.secondary}><Text style={styles.secondaryText}>Create account</Text></Pressable></View></SafeAreaView>;

  const links: {title: string; detail: string; route: keyof RootStackParamList}[] = [
    {title: 'Your orders', detail: `${orders.length} orders`, route: 'Orders'}, {title: 'Wishlist', detail: `${count} saved products`, route: 'Wishlist'},
    {title: 'Profile', detail: 'Name, email and phone', route: 'Profile'}, {title: 'Addresses', detail: 'Delivery address book', route: 'Addresses'},
    {title: 'Returns & refunds', detail: 'Request and track returns', route: 'Returns'},
    {title: 'Notifications', detail: `${unreadCount} unread messages`, route: 'Notifications'},
    {title: 'Help & support', detail: 'FAQs and customer care', route: 'HelpSupport'},
  ];
  return <SafeAreaView edges={['top']} style={styles.safeArea}><StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" /><ScrollView><View style={styles.header}><View style={styles.userAvatar}><Text style={styles.userLetter}>{user.name[0].toUpperCase()}</Text></View><View><Text style={styles.welcome}>WELCOME BACK</Text><Text style={styles.name}>{user.name}</Text><Text style={styles.email}>{user.email}</Text></View></View><View style={styles.links}>{links.map(link => <Pressable key={link.title} onPress={() => root?.navigate(link.route as never)} style={styles.link}><View><Text style={styles.linkTitle}>{link.title}</Text><Text style={styles.linkDetail}>{link.detail}</Text></View><Text style={styles.arrow}>›</Text></Pressable>)}<View style={styles.legalRow}><Pressable onPress={() => root?.navigate('Legal', {document: 'privacy'})}><Text style={styles.legalText}>Privacy policy</Text></Pressable><Text style={styles.legalDot}>•</Text><Pressable onPress={() => root?.navigate('Legal', {document: 'terms'})}><Text style={styles.legalText}>Terms of use</Text></Pressable></View><Pressable onPress={() => Alert.alert('Sign out?', 'You can sign in again anytime.', [{text: 'Cancel', style: 'cancel'}, {text: 'Sign out', style: 'destructive', onPress: logout}])} style={styles.logout}><Text style={styles.logoutText}>Sign out</Text></Pressable></View></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({safeArea: {flex: 1, backgroundColor: '#F5F6F8'}, guest: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28}, avatar: {width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFF0CE', alignItems: 'center', justifyContent: 'center'}, avatarText: {color: '#A56700', fontSize: 37, fontWeight: '900'}, guestTitle: {color: '#101820', fontSize: 24, fontWeight: '900', marginTop: 20}, guestCopy: {color: '#748089', fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 7}, primary: {width: '100%', height: 48, backgroundColor: '#FFB000', borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 23}, primaryText: {color: '#101820', fontSize: 12, fontWeight: '900'}, secondary: {width: '100%', height: 48, borderWidth: 1, borderColor: '#101820', borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 9}, secondaryText: {color: '#101820', fontSize: 11, fontWeight: '900'}, header: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20}, userAvatar: {width: 58, height: 58, borderRadius: 29, backgroundColor: '#101820', alignItems: 'center', justifyContent: 'center', marginRight: 13}, userLetter: {color: '#FFB000', fontSize: 23, fontWeight: '900'}, welcome: {color: '#D94F04', fontSize: 8, fontWeight: '900', letterSpacing: 1.2}, name: {color: '#101820', fontSize: 20, fontWeight: '900', marginTop: 3}, email: {color: '#7B858D', fontSize: 9, marginTop: 2}, links: {padding: 13}, link: {height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 11, paddingHorizontal: 15, marginBottom: 8}, linkTitle: {color: '#2E3B44', fontSize: 12, fontWeight: '900'}, linkDetail: {color: '#818B92', fontSize: 9, marginTop: 4}, arrow: {color: '#89939A', fontSize: 23}, legalRow: {flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12}, legalText: {color: '#68747D', fontSize: 9, fontWeight: '700'}, legalDot: {color: '#9CA4AA'}, logout: {height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 7}, logoutText: {color: '#C43D2C', fontSize: 11, fontWeight: '900'}});

export default AccountScreen;
