import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';

type Props = {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function AsyncButton({
  label,
  loading = false,
  disabled = false,
  onPress,
  style,
  textStyle,
}: Props) {
  const unavailable = loading || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: unavailable }}
      disabled={unavailable}
      onPress={onPress}
      style={[styles.button, style, unavailable && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color="#101820" size="small" />
      ) : (
        <Text style={[styles.label, textStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 49,
    borderRadius: 9,
    backgroundColor: '#FFB000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.55 },
  label: { color: '#101820', fontSize: 12, fontWeight: '900' },
});
