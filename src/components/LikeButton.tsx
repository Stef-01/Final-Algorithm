import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';

import { colors } from '@/lib/theme';
import { Icon } from './Icon';
import { PressScale, useReducedMotion } from './motion';

// Save a clinician. Saved is unmistakable at a glance: a filled purple circle with a solid white
// heart, not an outline. Toggling gives a small springy pop.

const native = Platform.OS !== 'web';

export function LikeButton({
  liked,
  onPress,
  label,
  size = 50,
}: {
  liked: boolean;
  onPress: () => void;
  label: string;
  size?: number;
}) {
  const reduced = useReducedMotion();
  const pop = useState(() => new Animated.Value(1))[0];
  const ring = useState(() => new Animated.Value(1))[0];
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced) return;
    pop.setValue(liked ? 0.6 : 0.85);
    Animated.spring(pop, { toValue: 1, damping: 8, stiffness: 260, mass: 0.7, useNativeDriver: native }).start();
    // Saving also sends out a soft ring.
    if (liked) {
      ring.setValue(0);
      Animated.timing(ring, { toValue: 1, duration: 520, useNativeDriver: native }).start();
    }
  }, [liked, pop, ring, reduced]);

  return (
    <PressScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: liked }}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, liked && styles.on]}
      scaleTo={0.88}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          { width: size, height: size, borderRadius: size / 2 },
          {
            opacity: ring.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.5, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale: pop }] }}>
        {liked ? <Icon name="icHeartFilled" size={size * 0.48} color={colors.white} /> : <Icon name="icLike" size={size * 0.46} />}
      </Animated.View>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  on: { backgroundColor: colors.purple },
  ring: { position: 'absolute', borderWidth: 2, borderColor: colors.purple },
});
