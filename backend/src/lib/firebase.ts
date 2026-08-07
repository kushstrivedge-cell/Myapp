import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { env } from '../config/env.js';

function app() {
  if (getApps()[0]) return getApps()[0]!;
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return initializeApp({
      credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)),
    });
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS)
    return initializeApp({ credential: applicationDefault() });
  return null;
}
export async function sendPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string> = {},
) {
  const firebase = app();
  if (!firebase || !tokens.length) return { sent: 0, disabled: !firebase };
  const result = await getMessaging(firebase).sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
  });
  return { sent: result.successCount, disabled: false };
}
