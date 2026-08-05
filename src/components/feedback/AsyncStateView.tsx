import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  loading?: boolean;
  error?: string | null;
  loadingLabel?: string;
  onRetry?: () => void | Promise<void>;
};

export function AsyncStateView({
  loading = false,
  error,
  loadingLabel = 'Loading…',
  onRetry,
}: Props) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      {loading ? (
        <>
          <ActivityIndicator color="#D94F04" size="large" />
          <Text style={styles.copy}>{loadingLabel}</Text>
        </>
      ) : (
        <>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.copy}>{error}</Text>
          {onRetry && (
            <Pressable onPress={onRetry} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F8',
    padding: 28,
  },
  title: { color: '#101820', fontSize: 20, fontWeight: '900' },
  copy: {
    color: '#69757D',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  retry: {
    backgroundColor: '#FFB000',
    borderRadius: 8,
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  retryText: { color: '#101820', fontSize: 11, fontWeight: '900' },
});
