import * as Keychain from 'react-native-keychain';

export type AuthTokens = {accessToken: string; refreshToken: string};
const service = 'com.cartly.auth.tokens';

export async function saveTokens(tokens: AuthTokens) {
  await Keychain.setGenericPassword('cartly', JSON.stringify(tokens), {service});
}

export async function readTokens(): Promise<AuthTokens | null> {
  const credentials = await Keychain.getGenericPassword({service});
  if (!credentials) return null;
  try {return JSON.parse(credentials.password) as AuthTokens;} catch {return null;}
}

export async function clearTokens() {
  await Keychain.resetGenericPassword({service});
}
