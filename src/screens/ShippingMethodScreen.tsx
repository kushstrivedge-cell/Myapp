import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CheckoutProgress from '../components/checkout/CheckoutProgress';
import { ShippingMethod, useCheckout } from '../context/CheckoutContext';
import { RootStackParamList } from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'ShippingMethod'>;

function ShippingMethodScreen({ navigation }: Props) {
  const { shipping, setShipping } = useCheckout();

  const options: {
    id: ShippingMethod;
    title: string;
    detail: string;
    price: number;
  }[] = [
    {
      id: 'standard',
      title: 'Standard delivery',
      detail: 'Arrives in 3–5 business days',
      price: 0,
    },
    {
      id: 'express',
      title: 'Express delivery',
      detail: 'Arrives in 1–2 business days',
      price: 149,
    },
  ];

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <CheckoutProgress step={2} />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>STEP 2 OF 4</Text>
        <Text style={styles.title}>Choose your delivery speed</Text>
        <Text style={styles.subtitle}>
          You can review the final arrival estimate before placing your order.
        </Text>
        {options.map(option => {
          const selected = shipping === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => setShipping(option.id)}
              style={[styles.option, selected && styles.selectedOption]}
            >
              <View style={[styles.radio, selected && styles.selectedRadio]} />
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDetail}>{option.detail}</Text>
              </View>
              <Text
                style={[styles.optionPrice, option.price === 0 && styles.free]}
              >
                {option.price === 0 ? 'FREE' : `₹${option.price}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.footer}>
        <Pressable
          onPress={() => navigation.navigate('Payment')}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Continue to payment →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F6F8' },
  content: { flex: 1, padding: 18 },
  eyebrow: {
    color: '#D94F04',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  title: {
    color: '#101820',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
    marginTop: 6,
  },
  subtitle: {
    color: '#76818A',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
    marginBottom: 20,
  },
  option: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9DEE1',
    borderRadius: 12,
    padding: 15,
    marginBottom: 11,
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: '#E85D04',
    backgroundColor: '#FFF8F4',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#B5BEC4',
    marginRight: 12,
  },
  selectedRadio: { borderWidth: 6, borderColor: '#E85D04' },
  optionCopy: { flex: 1 },
  optionTitle: { color: '#26323B', fontSize: 13, fontWeight: '900' },
  optionDetail: { color: '#79848C', fontSize: 10, marginTop: 5 },
  optionPrice: { color: '#101820', fontSize: 12, fontWeight: '900' },
  free: { color: '#23835C' },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CCD3D7',
    padding: 11,
  },
  button: {
    height: 49,
    borderRadius: 9,
    backgroundColor: '#FFB000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#101820', fontSize: 12, fontWeight: '900' },
});

export default ShippingMethodScreen;
