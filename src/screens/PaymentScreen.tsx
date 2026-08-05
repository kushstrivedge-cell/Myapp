import React, {useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import CheckoutProgress from '../components/checkout/CheckoutProgress';
import {PaymentMethod, useCheckout} from '../context/CheckoutContext';
import {RootStackParamList} from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

const methods: {id: PaymentMethod; title: string; detail: string}[] = [
  {id: 'upi', title: 'UPI', detail: 'Pay using any UPI app'},
  {id: 'card', title: 'Credit or debit card', detail: 'Visa, Mastercard and RuPay'},
  {id: 'cod', title: 'Cash on delivery', detail: 'Pay when your order arrives'},
];

function PaymentScreen({navigation}: Props) {
  const {payment, setPayment} = useCheckout();
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState('');

  const continueToReview = () => {
    if (payment === 'upi' && !/^[\w.-]+@[\w.-]+$/.test(upiId)) {
      setError('Enter a valid UPI ID, for example name@bank.'); return;
    }
    if (payment === 'card' && (cardNumber.length !== 16 || expiry.length < 4 || cvv.length !== 3)) {
      setError('Enter valid card details to continue.'); return;
    }
    navigation.navigate('OrderReview');
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <CheckoutProgress step={3} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>STEP 3 OF 4</Text>
        <Text style={styles.title}>How would you like to pay?</Text>
        <Text style={styles.subtitle}>Your payment details are protected during checkout.</Text>
        {methods.map(method => (
          <Pressable key={method.id} onPress={() => {setPayment(method.id); setError('');}} style={[styles.method, payment === method.id && styles.selectedMethod]}>
            <View style={[styles.radio, payment === method.id && styles.selectedRadio]} />
            <View><Text style={styles.methodTitle}>{method.title}</Text><Text style={styles.methodDetail}>{method.detail}</Text></View>
          </Pressable>
        ))}
        {payment === 'upi' && (
          <View style={styles.detailsCard}>
            <Text style={styles.label}>UPI ID</Text>
            <TextInput autoCapitalize="none" onChangeText={setUpiId} placeholder="name@bank" placeholderTextColor="#919AA1" style={styles.input} value={upiId} />
          </View>
        )}
        {payment === 'card' && (
          <View style={styles.detailsCard}>
            <Text style={styles.label}>Card number</Text>
            <TextInput keyboardType="number-pad" maxLength={16} onChangeText={text => setCardNumber(text.replace(/\D/g, ''))} placeholder="16-digit card number" placeholderTextColor="#919AA1" style={styles.input} value={cardNumber} />
            <View style={styles.doubleRow}>
              <TextInput keyboardType="number-pad" maxLength={5} onChangeText={setExpiry} placeholder="MM/YY" placeholderTextColor="#919AA1" style={[styles.input, styles.half]} value={expiry} />
              <TextInput keyboardType="number-pad" maxLength={3} onChangeText={text => setCvv(text.replace(/\D/g, ''))} placeholder="CVV" placeholderTextColor="#919AA1" secureTextEntry style={[styles.input, styles.half]} value={cvv} />
            </View>
          </View>
        )}
        {error.length > 0 && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={styles.footer}><Pressable onPress={continueToReview} style={styles.button}><Text style={styles.buttonText}>Review your order  →</Text></Pressable></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F5F6F8'}, content: {padding: 18, paddingBottom: 28},
  eyebrow: {color: '#D94F04', fontSize: 9, fontWeight: '900', letterSpacing: 1.3}, title: {color: '#101820', fontSize: 25, lineHeight: 31, fontWeight: '900', marginTop: 6},
  subtitle: {color: '#76818A', fontSize: 11, marginTop: 6, marginBottom: 19},
  method: {minHeight: 70, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D9DEE1', borderRadius: 11, padding: 14, marginBottom: 9},
  selectedMethod: {borderColor: '#E85D04', backgroundColor: '#FFF8F4'}, radio: {width: 19, height: 19, borderRadius: 10, borderWidth: 2, borderColor: '#B5BEC4', marginRight: 12},
  selectedRadio: {borderWidth: 6, borderColor: '#E85D04'}, methodTitle: {color: '#26323B', fontSize: 12, fontWeight: '900'}, methodDetail: {color: '#7B858D', fontSize: 9, marginTop: 4},
  detailsCard: {backgroundColor: '#FFFFFF', borderRadius: 11, padding: 14, marginTop: 5}, label: {color: '#45515A', fontSize: 9, fontWeight: '800', marginBottom: 7},
  input: {height: 44, borderWidth: 1, borderColor: '#D7DCE0', borderRadius: 8, color: '#101820', fontSize: 11, paddingHorizontal: 11, paddingVertical: 0, marginBottom: 10},
  doubleRow: {flexDirection: 'row', justifyContent: 'space-between'}, half: {width: '48%'}, error: {color: '#C43D2C', fontSize: 10, fontWeight: '700', marginTop: 10},
  footer: {backgroundColor: '#FFFFFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#CCD3D7', padding: 11}, button: {height: 49, borderRadius: 9, backgroundColor: '#FFB000', alignItems: 'center', justifyContent: 'center'},
  buttonText: {color: '#101820', fontSize: 12, fontWeight: '900'},
});

export default PaymentScreen;
