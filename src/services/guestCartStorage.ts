import * as Keychain from 'react-native-keychain';

const service = 'cartly.guest-cart';

export async function readGuestCartToken() {
  const stored = await Keychain.getGenericPassword({ service });
  return stored ? stored.password : null;
}

export async function saveGuestCartToken(token: string) {
  await Keychain.setGenericPassword('guest', token, { service });
}

export async function clearGuestCartToken() {
  await Keychain.resetGenericPassword({ service });
}
