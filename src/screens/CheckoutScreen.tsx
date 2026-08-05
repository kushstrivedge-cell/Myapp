import React, {useEffect, useState} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import CheckoutProgress from '../components/checkout/CheckoutProgress';
import {DeliveryAddress, useCheckout} from '../context/CheckoutContext';
import {RootStackParamList} from '../navigation/navigationTypes';
import {useAddressBook} from '../context/AddressBookContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

function CheckoutScreen({navigation}: Props) {
  const checkout = useCheckout();
  const {addresses} = useAddressBook();
  const [form, setForm] = useState<DeliveryAddress>(checkout.address);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = addresses.find(address => address.isDefault);
    if (!saved || Object.values(form).some(value => value.trim())) return;
    setForm({
      fullName: saved.fullName,
      phone: saved.phone,
      pincode: saved.pincode,
      city: saved.city,
      state: saved.state,
      addressLine: saved.addressLine,
    });
  }, [addresses, form]);

  const updateField = (field: keyof DeliveryAddress, value: string) => {
    setForm(current => ({...current, [field]: value}));
    setError('');
  };

  const continueToShipping = () => {
    if (Object.values(form).some(value => !value.trim())) {
      setError('Complete every address field to continue.');
      return;
    }
    if (!/^\d{10}$/.test(form.phone) || !/^\d{6}$/.test(form.pincode)) {
      setError('Enter a valid 10-digit phone number and 6-digit pincode.');
      return;
    }
    checkout.setAddress(form);
    navigation.navigate('ShippingMethod');
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <CheckoutProgress step={1} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>STEP 1 OF 4</Text>
        <Text style={styles.title}>Where should we deliver?</Text>
        <Text style={styles.subtitle}>Enter a complete address for a smooth delivery.</Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput onChangeText={value => updateField('fullName', value)} placeholder="Name on the package" placeholderTextColor="#929BA2" style={styles.input} value={form.fullName} />
        <Text style={styles.label}>Phone number</Text>
        <TextInput keyboardType="number-pad" maxLength={10} onChangeText={value => updateField('phone', value.replace(/\D/g, ''))} placeholder="10-digit mobile number" placeholderTextColor="#929BA2" style={styles.input} value={form.phone} />
        <Text style={styles.label}>Address</Text>
        <TextInput multiline onChangeText={value => updateField('addressLine', value)} placeholder="House, street and locality" placeholderTextColor="#929BA2" style={[styles.input, styles.addressInput]} textAlignVertical="top" value={form.addressLine} />
        <View style={styles.doubleRow}>
          <View style={styles.half}>
            <Text style={styles.label}>Pincode</Text>
            <TextInput keyboardType="number-pad" maxLength={6} onChangeText={value => updateField('pincode', value.replace(/\D/g, ''))} placeholder="6 digits" placeholderTextColor="#929BA2" style={styles.input} value={form.pincode} />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>City</Text>
            <TextInput onChangeText={value => updateField('city', value)} placeholder="City" placeholderTextColor="#929BA2" style={styles.input} value={form.city} />
          </View>
        </View>
        <Text style={styles.label}>State</Text>
        <TextInput onChangeText={value => updateField('state', value)} placeholder="State" placeholderTextColor="#929BA2" style={styles.input} value={form.state} />
        {error.length > 0 && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable onPress={continueToShipping} style={({pressed}) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>Continue to shipping  →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F5F6F8'},
  content: {padding: 18, paddingBottom: 28},
  eyebrow: {color: '#D94F04', fontSize: 9, fontWeight: '900', letterSpacing: 1.3},
  title: {color: '#101820', fontSize: 25, fontWeight: '900', marginTop: 6},
  subtitle: {color: '#76818A', fontSize: 11, lineHeight: 17, marginTop: 5, marginBottom: 19},
  label: {color: '#45515A', fontSize: 10, fontWeight: '800', marginBottom: 7, marginTop: 12},
  input: {height: 47, borderWidth: 1, borderColor: '#D7DCE0', borderRadius: 9, backgroundColor: '#FFFFFF', color: '#101820', fontSize: 12, paddingHorizontal: 12, paddingVertical: 0},
  addressInput: {height: 78, paddingTop: 12},
  doubleRow: {flexDirection: 'row', justifyContent: 'space-between'},
  half: {width: '48%'},
  error: {color: '#C43D2C', fontSize: 10, fontWeight: '700', marginTop: 13},
  footer: {backgroundColor: '#FFFFFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#CCD3D7', padding: 11},
  button: {height: 49, borderRadius: 9, backgroundColor: '#FFB000', alignItems: 'center', justifyContent: 'center'},
  buttonText: {color: '#101820', fontSize: 12, fontWeight: '900'},
  pressed: {opacity: 0.7},
});

export default CheckoutScreen;
