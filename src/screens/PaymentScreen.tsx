import React from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import CheckoutProgress from '../components/checkout/CheckoutProgress';
import {PaymentMethod, useCheckout} from '../context/CheckoutContext';
import {RootStackParamList} from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;
const methods: {id: PaymentMethod; title: string; detail: string}[] = [
  {id: 'razorpay', title: 'Pay online — Demo', detail: 'Razorpay Test Mode · UPI, cards, wallets and net banking'},
  {id: 'cod', title: 'Cash on delivery', detail: 'Available for eligible orders up to ₹5,000'},
];

export default function PaymentScreen({navigation}: Props) {
  const {payment, setPayment} = useCheckout();
  return <SafeAreaView edges={['bottom']} style={styles.safeArea}>
    <StatusBar barStyle="light-content" backgroundColor="#101820" />
    <CheckoutProgress step={3} />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>STEP 3 OF 4</Text>
      <Text style={styles.title}>How would you like to pay?</Text>
      <View style={styles.demo}><Text style={styles.demoTitle}>DEMO PAYMENT</Text><Text style={styles.demoCopy}>Razorpay Test Mode will open after review. No real money will be charged. Cartly never receives or stores your card number, CVV or UPI PIN.</Text></View>
      {methods.map(method => <Pressable key={method.id} onPress={() => setPayment(method.id)} style={[styles.method, payment === method.id && styles.selectedMethod]}>
        <View style={[styles.radio, payment === method.id && styles.selectedRadio]} /><View style={styles.methodCopy}><Text style={styles.methodTitle}>{method.title}</Text><Text style={styles.methodDetail}>{method.detail}</Text></View>
      </Pressable>)}
    </ScrollView>
    <View style={styles.footer}><Pressable onPress={() => navigation.navigate('OrderReview')} style={styles.button}><Text style={styles.buttonText}>Review your order →</Text></Pressable></View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea:{flex:1,backgroundColor:'#F5F6F8'},content:{padding:18,paddingBottom:28},eyebrow:{color:'#D94F04',fontSize:9,fontWeight:'900',letterSpacing:1.3},title:{color:'#101820',fontSize:25,lineHeight:31,fontWeight:'900',marginTop:6,marginBottom:16},demo:{backgroundColor:'#FFF4D6',borderColor:'#FFB000',borderWidth:1,borderRadius:11,padding:14,marginBottom:14},demoTitle:{fontSize:10,fontWeight:'900',color:'#8A5600'},demoCopy:{fontSize:10,lineHeight:16,color:'#5D5340',marginTop:5},method:{minHeight:76,flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',borderWidth:1,borderColor:'#D9DEE1',borderRadius:11,padding:14,marginBottom:9},selectedMethod:{borderColor:'#E85D04',backgroundColor:'#FFF8F4'},radio:{width:19,height:19,borderRadius:10,borderWidth:2,borderColor:'#B5BEC4',marginRight:12},selectedRadio:{borderWidth:6,borderColor:'#E85D04'},methodCopy:{flex:1},methodTitle:{color:'#26323B',fontSize:12,fontWeight:'900'},methodDetail:{color:'#7B858D',fontSize:9,lineHeight:14,marginTop:4},footer:{backgroundColor:'#FFF',borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#CCD3D7',padding:11},button:{height:49,borderRadius:9,backgroundColor:'#FFB000',alignItems:'center',justifyContent:'center'},buttonText:{color:'#101820',fontSize:12,fontWeight:'900'},
});
