import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supportApi, SupportContacts } from '../services/supportApi';
import { useAuth } from '../context/AuthContext';
const faqs = [
  {
    q: 'Where is my order?',
    a: 'Open Account → Orders → Order Details → Track order.',
  },
  {
    q: 'How do returns work?',
    a: 'Delivered items are eligible for 30 days and require admin approval.',
  },
  {
    q: 'When will I receive a refund?',
    a: 'Refund status appears with the return after items are received.',
  },
];
export default function HelpSupportScreen() {
  const { user } = useAuth();
  const [open, setOpen] = useState('');
  const [message, setMessage] = useState('');
  const [contacts, setContacts] = useState<SupportContacts | null>(null);
  useEffect(() => {
    supportApi
      .contacts()
      .then(setContacts)
      .catch(() => undefined);
  }, []);
  const openUrl = async (url?: string) => {
    if (!url) return Alert.alert('Contact unavailable');
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert('Cannot open this action.');
  };
  const submit = async () => {
    if (!user)
      return Alert.alert(
        'Sign in required',
        'Sign in to create a tracked support ticket.',
      );
    try {
      const ticket = await supportApi.create(
        'Mobile app support request',
        message,
      );
      setMessage('');
      Alert.alert('Request received', `Your reference is ${ticket.number}.`);
    } catch (error) {
      Alert.alert(
        'Could not submit',
        error instanceof Error ? error.message : 'Try again.',
      );
    }
  };
  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>CUSTOMER CARE</Text>
        <Text style={styles.title}>How can we help?</Text>
        <Text style={styles.copy}>
          Find an answer or create a tracked support ticket.
        </Text>
        <Text style={styles.heading}>Frequently asked questions</Text>
        {faqs.map(item => (
          <Pressable
            key={item.q}
            onPress={() => setOpen(open === item.q ? '' : item.q)}
            style={styles.card}
          >
            <Text style={styles.question}>
              {item.q} {open === item.q ? '−' : '+'}
            </Text>
            {open === item.q && <Text style={styles.copy}>{item.a}</Text>}
          </Pressable>
        ))}
        <Text style={styles.heading}>Contact support</Text>
        <View style={styles.row}>
          <Pressable
            onPress={() => openUrl(contacts?.chatUrl)}
            style={styles.contact}
          >
            <Text style={styles.contactText}>Live chat</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              openUrl(
                contacts
                  ? `mailto:${contacts.email}?subject=Cartly support`
                  : '',
              )
            }
            style={styles.contact}
          >
            <Text style={styles.contactText}>Email</Text>
          </Pressable>
          <Pressable
            onPress={() => openUrl(contacts ? `tel:${contacts.phone}` : '')}
            style={styles.contact}
          >
            <Text style={styles.contactText}>Call</Text>
          </Pressable>
        </View>
        <Text style={styles.heading}>Support request</Text>
        <TextInput
          multiline
          value={message}
          onChangeText={setMessage}
          placeholder="Describe how we can help"
          placeholderTextColor="#919AA1"
          style={styles.input}
          textAlignVertical="top"
        />
        <Pressable
          disabled={message.trim().length < 10}
          onPress={submit}
          style={[styles.button, message.trim().length < 10 && styles.disabled]}
        >
          <Text style={styles.buttonText}>Submit request</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6F8' },
  content: { padding: 17, paddingBottom: 35 },
  eyebrow: { color: '#D94F04', fontSize: 9, fontWeight: '900' },
  title: { color: '#101820', fontSize: 27, fontWeight: '900', marginTop: 5 },
  copy: { color: '#78838B', fontSize: 10, lineHeight: 16, marginTop: 5 },
  heading: {
    color: '#34414A',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 22,
    marginBottom: 9,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 9,
    padding: 13,
    marginBottom: 7,
  },
  question: { color: '#35424B', fontSize: 10, fontWeight: '900' },
  row: { flexDirection: 'row', gap: 7 },
  contact: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: '#D6DCE0',
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: { color: '#D94F04', fontSize: 9, fontWeight: '900' },
  input: {
    height: 100,
    borderWidth: 1,
    borderColor: '#D6DCE0',
    borderRadius: 9,
    backgroundColor: '#FFF',
    color: '#101820',
    fontSize: 10,
    padding: 11,
  },
  button: {
    height: 48,
    borderRadius: 9,
    backgroundColor: '#FFB000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 11,
  },
  disabled: { opacity: 0.45 },
  buttonText: { color: '#101820', fontSize: 11, fontWeight: '900' },
});
