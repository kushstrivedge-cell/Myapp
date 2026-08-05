import React, { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
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
type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;
function ForgotPasswordScreen({ navigation }: Props) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setError('');
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitting(true);
    const message = await requestPasswordReset(email);
    if (message) {
      setError(message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() });
  };
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <View style={styles.content}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>?</Text>
        </View>
        <Text style={styles.eyebrow}>ACCOUNT RECOVERY</Text>
        <Text style={styles.title}>Forgot your password?</Text>
        <Text style={styles.copy}>
          We’ll email a secure six-digit reset code if the account exists.
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#929BA2"
          style={styles.input}
          value={email}
        />
        {error.length > 0 && <Text style={styles.error}>{error}</Text>}
        <AsyncButton
          label="Send reset code"
          loading={submitting}
          onPress={submit}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFF0CE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 19,
  },
  iconText: { color: '#A56700', fontSize: 25, fontWeight: '900' },
  eyebrow: {
    color: '#D94F04',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: { color: '#101820', fontSize: 28, fontWeight: '900', marginTop: 7 },
  copy: {
    color: '#77828A',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 7,
    marginBottom: 18,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D7DCE0',
    borderRadius: 9,
    color: '#101820',
    fontSize: 12,
    paddingHorizontal: 12,
  },
  error: { color: '#C43D2C', fontSize: 9, marginTop: 9 },
  button: {
    height: 49,
    borderRadius: 9,
    backgroundColor: '#FFB000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 17,
  },
});
export default ForgotPasswordScreen;
