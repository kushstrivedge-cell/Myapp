module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|@react-native-community|react-native-safe-area-context|react-native-screens|react-native-svg|lucide-react-native)/)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/backend/',
    '<rootDir>/admin/',
    '<rootDir>/android/',
    '<rootDir>/ios/',
  ],
};
