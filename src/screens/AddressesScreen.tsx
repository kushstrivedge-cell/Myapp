import React, {useState} from 'react';
import {Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AsyncButton} from '../components/feedback/AsyncButton';
import {AsyncStateView} from '../components/feedback/AsyncStateView';
import {SavedAddress, useAddressBook} from '../context/AddressBookContext';
import {DeliveryAddress} from '../context/CheckoutContext';

const empty: DeliveryAddress = {fullName: '', phone: '', pincode: '', city: '', state: '', addressLine: ''};
const fields: {key: keyof DeliveryAddress; placeholder: string}[] = [
  {key: 'fullName', placeholder: 'Full name'},
  {key: 'phone', placeholder: 'Phone'},
  {key: 'addressLine', placeholder: 'House, street and locality'},
  {key: 'city', placeholder: 'City'},
  {key: 'state', placeholder: 'State'},
  {key: 'pincode', placeholder: 'Pincode'},
];

function addressForm(address: SavedAddress): DeliveryAddress {
  return {
    fullName: address.fullName,
    phone: address.phone,
    addressLine: address.addressLine,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
  };
}

function AddressesScreen() {
  const {addresses, error: loadError, loading, makeDefault, removeAddress, retry, saveAddress} = useAddressBook();
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [form, setForm] = useState<DeliveryAddress>(empty);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyAddress, setBusyAddress] = useState('');

  const open = (address?: SavedAddress) => {
    setEditing(address ?? null);
    setForm(address ? addressForm(address) : empty);
    setShowForm(true);
    setError('');
  };

  const save = async () => {
    setError('');
    if (Object.values(form).some(value => !value.trim()) || !/^\d{10}$/.test(form.phone) || !/^\d{6}$/.test(form.pincode)) {
      setError('Complete all fields with a valid phone and pincode.');
      return;
    }
    setSaving(true);
    try {
      await saveAddress(form, editing?.id);
      setShowForm(false);
      setEditing(null);
      setForm(empty);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save address.');
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: string) => {
    setBusyAddress(id);
    try {
      await makeDefault(id);
    } catch (requestError) {
      Alert.alert('Could not update address', requestError instanceof Error ? requestError.message : 'Try again.');
    } finally {
      setBusyAddress('');
    }
  };

  const remove = async (id: string) => {
    setBusyAddress(id);
    try {
      await removeAddress(id);
    } catch (requestError) {
      Alert.alert('Could not delete address', requestError instanceof Error ? requestError.message : 'Try again.');
    } finally {
      setBusyAddress('');
    }
  };

  if (loading && addresses.length === 0) return <AsyncStateView loading loadingLabel="Loading addresses…" />;
  if (loadError && addresses.length === 0) return <AsyncStateView error={loadError} onRetry={retry} />;

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}>
          <View><Text style={styles.eyebrow}>ADDRESS BOOK</Text><Text style={styles.title}>Saved addresses</Text></View>
          <Pressable onPress={() => open()}><Text style={styles.add}>+ Add new</Text></Pressable>
        </View>

        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>{editing ? 'Edit address' : 'New address'}</Text>
            {fields.map(field => (
              <TextInput
                key={field.key}
                keyboardType={field.key === 'phone' || field.key === 'pincode' ? 'number-pad' : 'default'}
                maxLength={field.key === 'phone' ? 10 : field.key === 'pincode' ? 6 : undefined}
                onChangeText={text => setForm(current => ({...current, [field.key]: field.key === 'phone' || field.key === 'pincode' ? text.replace(/\D/g, '') : text}))}
                placeholder={field.placeholder}
                placeholderTextColor="#929BA2"
                style={styles.input}
                value={form[field.key]}
              />
            ))}
            {error.length > 0 && <Text style={styles.error}>{error}</Text>}
            <View style={styles.formActions}>
              <Pressable disabled={saving} onPress={() => setShowForm(false)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              <AsyncButton label="Save address" loading={saving} onPress={save} style={styles.save} textStyle={styles.saveText} />
            </View>
          </View>
        )}

        {addresses.length === 0 && !showForm ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>No saved addresses</Text><Text style={styles.emptyCopy}>Add an address for faster checkout.</Text></View>
        ) : addresses.map(address => (
          <View key={address.id} style={styles.card}>
            <View style={styles.cardHeading}><Text style={styles.name}>{address.fullName}</Text>{address.isDefault && <Text style={styles.defaultBadge}>DEFAULT</Text>}</View>
            <Text style={styles.copy}>{address.addressLine}</Text>
            <Text style={styles.copy}>{address.city}, {address.state} {address.pincode}</Text>
            <Text style={styles.copy}>Phone: {address.phone}</Text>
            <View style={styles.actions}>
              <Pressable disabled={busyAddress === address.id} onPress={() => open(address)}><Text style={styles.actionText}>Edit</Text></Pressable>
              {!address.isDefault && <Pressable disabled={busyAddress === address.id} onPress={() => {setDefault(address.id).catch(() => undefined);}}><Text style={styles.actionText}>{busyAddress === address.id ? 'Updating…' : 'Make default'}</Text></Pressable>}
              <Pressable disabled={busyAddress === address.id} onPress={() => Alert.alert('Delete address?', 'This address will be removed from your account.', [{text: 'Cancel'}, {text: 'Delete', style: 'destructive', onPress: () => {remove(address.id).catch(() => undefined);}}])}><Text style={styles.delete}>Delete</Text></Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F5F6F8'}, content: {padding: 14},
  heading: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', margin: 4, marginBottom: 16},
  eyebrow: {color: '#D94F04', fontSize: 9, fontWeight: '900', letterSpacing: 1.3}, title: {color: '#101820', fontSize: 24, fontWeight: '900', marginTop: 4}, add: {color: '#D94F04', fontSize: 10, fontWeight: '900'},
  form: {backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 12}, formTitle: {color: '#101820', fontSize: 16, fontWeight: '900', marginBottom: 7},
  input: {height: 44, borderWidth: 1, borderColor: '#D8DDE0', borderRadius: 8, color: '#101820', fontSize: 10, paddingHorizontal: 10, marginTop: 8}, error: {color: '#C43D2C', fontSize: 8, marginTop: 8},
  formActions: {flexDirection: 'row', gap: 8, marginTop: 12}, cancel: {flex: 1, height: 42, borderWidth: 1, borderColor: '#101820', borderRadius: 8, alignItems: 'center', justifyContent: 'center'}, cancelText: {fontSize: 10, fontWeight: '900'}, save: {flex: 1, height: 42, marginTop: 0}, saveText: {fontSize: 10},
  card: {backgroundColor: '#FFFFFF', borderRadius: 12, padding: 15, marginBottom: 10}, cardHeading: {flexDirection: 'row', alignItems: 'center'}, name: {color: '#29363F', fontSize: 12, fontWeight: '900'}, defaultBadge: {color: '#23835C', backgroundColor: '#E2F4EB', borderRadius: 4, fontSize: 7, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 3, marginLeft: 8}, copy: {color: '#707C85', fontSize: 10, lineHeight: 17},
  actions: {flexDirection: 'row', gap: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDE1E4', marginTop: 12, paddingTop: 11}, actionText: {color: '#D94F04', fontSize: 9, fontWeight: '800'}, delete: {color: '#C43D2C', fontSize: 9, fontWeight: '800'},
  empty: {alignItems: 'center', paddingTop: 100}, emptyTitle: {color: '#34414A', fontSize: 17, fontWeight: '900'}, emptyCopy: {color: '#7E8991', fontSize: 10, marginTop: 5},
});

export default AddressesScreen;
