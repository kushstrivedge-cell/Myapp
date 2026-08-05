import React, { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { AsyncButton } from '../components/feedback/AsyncButton';
import { RootStackParamList } from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

function LoginScreen({ navigation, route }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [hidden, setHidden] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError('');
    setSubmitting(true);
    const message = await login(email, password);
    if (message) {
      setError(message);
      setSubmitting(false);
      return;
    }
    if (route.params?.redirect === 'Checkout') {
      navigation.replace('Checkout');
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'Account' } }],
      });
    }
    setSubmitting(false);
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>WELCOME BACK</Text>
        <Text style={styles.title}>Sign in to Cartly</Text>
        <Text style={styles.copy}>
          Access orders, addresses and saved products.
        </Text>
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
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor="#929BA2"
            secureTextEntry={hidden}
            style={styles.passwordInput}
            value={password}
          />
          <Pressable onPress={() => setHidden(value => !value)}>
            <Text style={styles.show}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </Pressable>
        {error.length > 0 && <Text style={styles.error}>{error}</Text>}
        <AsyncButton
          label="Sign in"
          loading={submitting}
          onPress={submit}
          style={styles.primary}
        />
        <View style={styles.registerRow}>
          <Text style={styles.registerCopy}>New to Cartly?</Text>
          <Pressable
            onPress={() =>
              navigation.navigate('Register', {
                redirect: route.params?.redirect,
              })
            }
          >
            <Text style={styles.registerLink}>Create account</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  eyebrow: {
    color: '#D94F04',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: { color: '#101820', fontSize: 30, fontWeight: '900', marginTop: 7 },
  copy: { color: '#77828A', fontSize: 11, marginTop: 6, marginBottom: 22 },
  label: {
    color: '#45515A',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 7,
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
  passwordRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D7DCE0',
    borderRadius: 9,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    color: '#101820',
    fontSize: 12,
    paddingVertical: 0,
  },
  show: { color: '#D94F04', fontSize: 10, fontWeight: '900', padding: 6 },
  forgot: {
    color: '#D94F04',
    textAlign: 'right',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 11,
  },
  error: { color: '#C43D2C', fontSize: 9, lineHeight: 14, marginTop: 10 },
  primary: {
    height: 49,
    borderRadius: 9,
    backgroundColor: '#FFB000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 5,
  },
  registerCopy: { color: '#77828A', fontSize: 10 },
  registerLink: { color: '#D94F04', fontSize: 10, fontWeight: '900' },
});

export default LoginScreen;
