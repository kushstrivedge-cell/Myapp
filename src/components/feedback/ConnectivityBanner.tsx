import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNetwork } from '../../context/NetworkContext';

export function ConnectivityBanner() {
  const { isConnected, isChecking, refresh } = useNetwork();
  if (isChecking || isConnected) return null;

  return (
    <View accessibilityLiveRegion="assertive" style={styles.banner}>
      <Text style={styles.copy}>
        You’re offline. Some actions are unavailable.
      </Text>
      <Pressable onPress={refresh}>
        <Text style={styles.retry}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: '#A52A20',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 38,
    paddingHorizontal: 14,
  },
  copy: { color: '#FFFFFF', flex: 1, fontSize: 10, fontWeight: '700' },
  retry: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 5,
    textDecorationLine: 'underline',
  },
});
