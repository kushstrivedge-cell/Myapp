/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

setBackgroundMessageHandler(getMessaging(), async () => undefined);

AppRegistry.registerComponent(appName, () => App);
