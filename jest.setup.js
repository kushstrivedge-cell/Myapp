/* eslint-env jest */

jest.mock(
  '@react-native-community/netinfo',
  () => require('@react-native-community/netinfo/jest/netinfo-mock').default,
);

jest.mock('react-native-keychain', () => ({
  ACCESS_CONTROL: {},
  ACCESSIBLE: {},
  AUTHENTICATION_TYPE: {},
  SECURITY_LEVEL: {},
  SECURITY_RULES: {},
  STORAGE_TYPE: {},
  getGenericPassword: jest.fn().mockResolvedValue(false),
  setGenericPassword: jest.fn().mockResolvedValue(true),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn().mockResolvedValue('test-fcm-token-that-is-long-enough'),
  onTokenRefresh: jest.fn(() => jest.fn()),
  requestPermission: jest.fn().mockResolvedValue(1),
  setBackgroundMessageHandler: jest.fn(),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, iconName) => {
        const MockIcon = props =>
          React.createElement(View, {
            ...props,
            testID: `icon-${String(iconName)}`,
          });
        MockIcon.displayName = String(iconName);
        return MockIcon;
      },
    },
  );
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockSvg = props => React.createElement(View, props);
  return new Proxy(
    { __esModule: true, default: MockSvg },
    { get: (target, name) => target[name] ?? MockSvg },
  );
});
jest.mock('react-native-razorpay', () => ({
  __esModule: true,
  default: {open: jest.fn()},
}));
