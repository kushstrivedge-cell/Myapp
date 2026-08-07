import React, { useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Heart } from 'lucide-react-native';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
  large?: boolean;
};

export default function WishlistButton({
  label,
  selected,
  onPress,
  style,
  large = false,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.82,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        hitSlop={8}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          large && styles.largeButton,
          selected && styles.selectedButton,
          pressed && styles.pressed,
        ]}
      >
        <Heart
          color={selected ? '#D83B38' : '#53606A'}
          fill={selected ? '#D83B38' : 'transparent'}
          size={large ? 28 : 22}
          strokeWidth={2}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E1E5E8',
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#101820',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
  },
  largeButton: { width: 44, height: 44, borderRadius: 22 },
  selectedButton: { borderColor: '#F2B8B5', backgroundColor: '#FFF0EF' },
  pressed: { backgroundColor: '#FCE2E0' },
});
