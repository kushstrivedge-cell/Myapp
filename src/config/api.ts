import {Platform} from 'react-native';

// During USB development, `adb reverse tcp:4000 tcp:4000` maps this
// localhost address on the Android phone to port 4000 on the computer.
export const API_BASE_URL = Platform.select({
  android: 'http://localhost:4000/api/v1',
  ios: 'http://localhost:4000/api/v1',
  default: 'http://localhost:4000/api/v1',
});
