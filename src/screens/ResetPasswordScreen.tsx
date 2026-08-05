import React, { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
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
type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;
function ResetPasswordScreen({ navigation, route }: Props) {
  const { resetPassword } = useAuth();
  const [code, setCode] = useState('');
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
    const message = await resetPassword(route.params.email, code, password);
    if (message) {
      setError(message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    Alert.alert(
      'Password changed',
      'You can now sign in with your new password.',
      [{ text: 'Sign in', onPress: () => navigation.popTo('Login') }],
    );
  };
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>RESET PASSWORD</Text>
        <Text style={styles.title}>Create a new password</Text>
        <Text style={styles.copy}>
          Enter the code sent to {route.params.email}.
        </Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={text => setCode(text.replace(/\D/g, ''))}
          placeholder="6-digit reset code"
          placeholderTextColor="#929BA2"
          style={styles.input}
          value={code}
        />
        <TextInput
          onChangeText={setPassword}
          placeholder="New password (8+ characters)"
          placeholderTextColor="#929BA2"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <TextInput
          onChangeText={setConfirm}
          placeholder="Confirm new password"
          placeholderTextColor="#929BA2"
          secureTextEntry
          style={styles.input}
          value={confirm}
        />
        {error.length > 0 && <Text style={styles.error}>{error}</Text>}
        <AsyncButton
          label="Update password"
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
  eyebrow: {
    color: '#D94F04',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: { color: '#101820', fontSize: 27, fontWeight: '900', marginTop: 6 },
  copy: { color: '#77828A', fontSize: 10, marginTop: 6, marginBottom: 17 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D7DCE0',
    borderRadius: 9,
    color: '#101820',
    fontSize: 11,
    paddingHorizontal: 12,
    marginTop: 9,
  },
  error: { color: '#C43D2C', fontSize: 9, marginTop: 9 },
  button: {
    height: 49,
    borderRadius: 9,
    backgroundColor: '#FFB000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
});
export default ResetPasswordScreen;
