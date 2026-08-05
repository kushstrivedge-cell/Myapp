import React, { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { AsyncButton } from '../components/feedback/AsyncButton';
import { RootStackParamList } from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

function RegisterScreen({ navigation, route }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const message = await register({ name, email, phone }, password);
    if (message) {
      setError(message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    navigation.navigate('VerifyOtp', { redirect: route.params?.redirect });
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>JOIN CARTLY</Text>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.copy}>
          One account for orders, returns and saved products.
        </Text>
        <Text style={styles.label}>Full name</Text>
        <TextInput
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#929BA2"
          style={styles.input}
          value={name}
        />
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#929BA2"
          style={styles.input}
          value={email}
        />
        <Text style={styles.label}>Phone</Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={10}
          onChangeText={text => setPhone(text.replace(/\D/g, ''))}
          placeholder="10-digit mobile number"
          placeholderTextColor="#929BA2"
          style={styles.input}
          value={phone}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          placeholderTextColor="#929BA2"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          onChangeText={setConfirm}
          placeholder="Repeat password"
          placeholderTextColor="#929BA2"
          secureTextEntry
          style={styles.input}
          value={confirm}
        />
        {error.length > 0 && <Text style={styles.error}>{error}</Text>}
        <AsyncButton
          label="Create account"
          loading={submitting}
          onPress={submit}
          style={styles.primary}
        />
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.signIn}>Already registered? Sign in</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 24, paddingBottom: 35 },
  eyebrow: {
    color: '#D94F04',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: { color: '#101820', fontSize: 28, fontWeight: '900', marginTop: 6 },
  copy: { color: '#77828A', fontSize: 11, marginTop: 6, marginBottom: 15 },
  label: {
    color: '#45515A',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 11,
    marginBottom: 7,
  },
  input: {
    height: 47,
    borderWidth: 1,
    borderColor: '#D7DCE0',
    borderRadius: 9,
    color: '#101820',
    fontSize: 12,
    paddingHorizontal: 12,
  },
  error: { color: '#C43D2C', fontSize: 9, marginTop: 11 },
  primary: {
    height: 49,
    borderRadius: 9,
    backgroundColor: '#FFB000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  signIn: {
    color: '#D94F04',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 18,
  },
});

export default RegisterScreen;
