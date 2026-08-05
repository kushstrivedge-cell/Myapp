import React, { useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/navigationTypes';
import { AsyncButton } from '../components/feedback/AsyncButton';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOtp'>;
function VerifyOtpScreen({ navigation, route }: Props) {
  const { pendingRegistration, verifyRegistration, resendRegistrationOtp } =
    useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  const verify = async () => {
    setError('');
    setVerifying(true);
    const message = await verifyRegistration(otp);
    if (message) {
      setError(message);
      setVerifying(false);
      return;
    }
    setVerifying(false);
    if (route.params?.redirect === 'Checkout') navigation.replace('Checkout');
    else
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'Account' } }],
      });
  };
  const resend = async () => {
    setError('');
    setResending(true);
    const message = await resendRegistrationOtp();
    if (message) {
      setError(message);
      setResending(false);
      return;
    }
    setResending(false);
    setSeconds(30);
    Alert.alert(
      'Code resent',
      'Check your email or backend development console.',
    );
  };
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <View style={styles.content}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>✉</Text>
        </View>
        <Text style={styles.eyebrow}>VERIFY YOUR EMAIL</Text>
        <Text style={styles.title}>Enter the 6-digit code</Text>
        <Text style={styles.copy}>
          We sent a verification code to{' '}
          {pendingRegistration?.email ?? 'your email'}.
        </Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={text => {
            setOtp(text.replace(/\D/g, ''));
            setError('');
          }}
          placeholder="000000"
          placeholderTextColor="#AAB1B6"
          style={styles.input}
          value={otp}
        />
        {error.length > 0 && <Text style={styles.error}>{error}</Text>}
        <AsyncButton
          disabled={otp.length !== 6}
          label="Verify and continue"
          loading={verifying}
          onPress={verify}
          style={styles.button}
        />
        <Pressable disabled={seconds > 0 || resending} onPress={resend}>
          <Text style={[styles.resend, seconds > 0 && styles.resendDisabled]}>
            {resending
              ? 'Resending…'
              : seconds > 0
                ? `Resend code in ${seconds}s`
                : 'Resend code'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  icon: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: '#FFF0CE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconText: { color: '#A56700', fontSize: 27 },
  eyebrow: {
    color: '#D94F04',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: { color: '#101820', fontSize: 27, fontWeight: '900', marginTop: 7 },
  copy: {
    color: '#77828A',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 7,
  },
  input: {
    width: '100%',
    height: 58,
    borderWidth: 1,
    borderColor: '#D3D9DD',
    borderRadius: 10,
    color: '#101820',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 12,
    textAlign: 'center',
    marginTop: 24,
  },
  error: { color: '#C43D2C', fontSize: 9, marginTop: 9 },
  button: {
    width: '100%',
    height: 49,
    borderRadius: 9,
    backgroundColor: '#FFB000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  resend: { color: '#D94F04', fontSize: 10, fontWeight: '900', marginTop: 18 },
  resendDisabled: { color: '#8A949B' },
});
export default VerifyOtpScreen;
