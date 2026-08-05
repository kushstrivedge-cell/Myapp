import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useState} from 'react';
import {Alert, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AsyncButton} from '../components/feedback/AsyncButton';
import {useAuth} from '../context/AuthContext';
import {RootStackParamList} from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

function ProfileScreen({navigation}: Props) {
  const {user, updateProfile, changePassword, deleteAccount} = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const saveProfile = async () => {
    setProfileError('');
    if (name.trim().length < 2 || (phone.length > 0 && !/^\d{10}$/.test(phone))) {
      setProfileError('Enter a valid name and 10-digit phone number.');
      return;
    }
    setSavingProfile(true);
    const message = await updateProfile({name: name.trim(), phone});
    setSavingProfile(false);
    if (message) setProfileError(message);
    else Alert.alert('Profile updated', 'Your changes were saved to your Cartly account.');
  };

  const submitPassword = async () => {
    setPasswordError('');
    if (newPassword.length < 8) {
      setPasswordError('New password must contain at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    const message = await changePassword(currentPassword, newPassword);
    setChangingPassword(false);
    if (message) {
      setPasswordError(message);
      return;
    }
    Alert.alert('Password changed', 'For security, sign in again with your new password.', [{
      text: 'Sign in',
      onPress: () => navigation.reset({index: 0, routes: [{name: 'Login'}]}),
    }]);
  };

  const deleteNow = async () => {
    setDeleting(true);
    setDeleteError('');
    const message = await deleteAccount(deletePassword);
    setDeleting(false);
    if (message) {
      setDeleteError(message);
      return;
    }
    navigation.reset({index: 0, routes: [{name: 'MainTabs', params: {screen: 'Home'}}]});
  };

  const confirmDeletion = () => {
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm account deletion.');
      return;
    }
    Alert.alert(
      'Permanently delete account?',
      'Your profile, addresses, sessions, reviews and order records will be deleted. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete permanently', style: 'destructive', onPress: () => {deleteNow().catch(() => undefined);}},
      ],
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#101820" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>PERSONAL INFORMATION</Text>
        <Text style={styles.title}>Profile & security</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile</Text>
          <Text style={styles.label}>Full name</Text>
          <TextInput onChangeText={setName} style={styles.input} value={name} />
          <Text style={styles.label}>Email</Text>
          <TextInput editable={false} style={[styles.input, styles.readOnly]} value={user?.email ?? ''} />
          <Text style={styles.helper}>Email changes require a separate verification flow and are currently disabled.</Text>
          <Text style={styles.label}>Phone</Text>
          <TextInput keyboardType="number-pad" maxLength={10} onChangeText={text => setPhone(text.replace(/\D/g, ''))} style={styles.input} value={phone} />
          {profileError.length > 0 && <Text style={styles.error}>{profileError}</Text>}
          <AsyncButton label="Save profile" loading={savingProfile} onPress={saveProfile} style={styles.button} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Change password</Text>
          <Text style={styles.helper}>Changing your password signs out every active Cartly session.</Text>
          <TextInput onChangeText={setCurrentPassword} placeholder="Current password" placeholderTextColor="#929BA2" secureTextEntry style={styles.input} value={currentPassword} />
          <TextInput onChangeText={setNewPassword} placeholder="New password (8+ characters)" placeholderTextColor="#929BA2" secureTextEntry style={styles.input} value={newPassword} />
          <TextInput onChangeText={setConfirmPassword} placeholder="Confirm new password" placeholderTextColor="#929BA2" secureTextEntry style={styles.input} value={confirmPassword} />
          {passwordError.length > 0 && <Text style={styles.error}>{passwordError}</Text>}
          <AsyncButton label="Change password" loading={changingPassword} onPress={submitPassword} style={styles.button} />
        </View>

        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.dangerTitle}>Delete account</Text>
          <Text style={styles.helper}>This permanently removes your customer data. Enter your password to confirm.</Text>
          <TextInput onChangeText={setDeletePassword} placeholder="Account password" placeholderTextColor="#929BA2" secureTextEntry style={styles.input} value={deletePassword} />
          {deleteError.length > 0 && <Text style={styles.error}>{deleteError}</Text>}
          <Pressable disabled={deleting} onPress={confirmDeletion} style={[styles.deleteButton, deleting && styles.disabled]}>
            <Text style={styles.deleteText}>{deleting ? 'Deleting account…' : 'Delete my account'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#F5F6F8'},
  content: {padding: 16, paddingBottom: 35},
  eyebrow: {color: '#D94F04', fontSize: 9, fontWeight: '900', letterSpacing: 1.3},
  title: {color: '#101820', fontSize: 27, fontWeight: '900', marginTop: 6, marginBottom: 15},
  card: {backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 13},
  cardTitle: {color: '#101820', fontSize: 17, fontWeight: '900', marginBottom: 4},
  label: {color: '#45515A', fontSize: 10, fontWeight: '800', marginTop: 12, marginBottom: 7},
  input: {height: 48, borderWidth: 1, borderColor: '#D7DCE0', borderRadius: 9, color: '#101820', fontSize: 12, paddingHorizontal: 12, marginTop: 9},
  readOnly: {backgroundColor: '#F0F2F4', color: '#7D878F', marginTop: 0},
  helper: {color: '#77828A', fontSize: 9, lineHeight: 15, marginTop: 7},
  error: {color: '#C43D2C', fontSize: 9, lineHeight: 14, marginTop: 10},
  button: {marginTop: 18},
  dangerCard: {borderWidth: 1, borderColor: '#F0C4BE'},
  dangerTitle: {color: '#A52A20', fontSize: 17, fontWeight: '900'},
  deleteButton: {height: 46, borderWidth: 1, borderColor: '#B93629', borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 16},
  deleteText: {color: '#B93629', fontSize: 11, fontWeight: '900'},
  disabled: {opacity: 0.5},
});

export default ProfileScreen;
