import React from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {RootStackParamList} from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderSuccess'>;

function OrderSuccessScreen({navigation, route}: Props) {
  const goHome = () => navigation.reset({index: 0, routes: [{name: 'MainTabs', params: {screen: 'Home'}}]});

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.content}>
        <View style={styles.checkCircle}><Text style={styles.check}>✓</Text></View>
        <Text style={styles.eyebrow}>ORDER CONFIRMED</Text>
        <Text style={styles.title}>Thank you for shopping with Cartly!</Text>
        <Text style={styles.copy}>We’ve received your order and will send tracking information when it ships.</Text>
        <View style={styles.orderCard}>
          <View><Text style={styles.label}>Order number</Text><Text style={styles.value}>{route.params.orderId}</Text></View>
          <View style={styles.divider} />
          <View><Text style={styles.label}>Order total</Text><Text style={styles.total}>₹{route.params.total.toLocaleString('en-IN')}</Text></View>
        </View>
        <Pressable onPress={goHome} style={styles.button}><Text style={styles.buttonText}>Continue shopping</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#FFFFFF'}, content: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28},
  checkCircle: {width: 88, height: 88, borderRadius: 44, backgroundColor: '#DFF4EA', alignItems: 'center', justifyContent: 'center', marginBottom: 22}, check: {color: '#23835C', fontSize: 43, fontWeight: '900'},
  eyebrow: {color: '#23835C', fontSize: 10, fontWeight: '900', letterSpacing: 1.4}, title: {color: '#101820', fontSize: 27, lineHeight: 34, fontWeight: '900', textAlign: 'center', marginTop: 8},
  copy: {color: '#748089', fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 9}, orderCard: {width: '100%', flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F5F6F8', borderRadius: 12, padding: 17, marginTop: 27},
  divider: {width: StyleSheet.hairlineWidth, backgroundColor: '#CBD1D5'}, label: {color: '#7B858D', fontSize: 8, marginBottom: 5}, value: {color: '#34414A', fontSize: 12, fontWeight: '900'}, total: {color: '#101820', fontSize: 14, fontWeight: '900'},
  button: {height: 49, width: '100%', borderRadius: 9, backgroundColor: '#FFB000', alignItems: 'center', justifyContent: 'center', marginTop: 25}, buttonText: {color: '#101820', fontSize: 12, fontWeight: '900'},
});

export default OrderSuccessScreen;
