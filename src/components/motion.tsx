import { ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

// Small motion kit on React Native's Animated (works on web and native, no extra bundle).
// Springs rather than linear tweens, short distances, and everything is skipped when the
// patient has asked their device to reduce motion.

const native = Platform.OS !== 'web';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((r) => alive && setReduced(r))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub?.remove();
    };
  }, []);
  return reduced;
}

/** Fades and rises into place on mount. `index` staggers siblings (a list of cards). */
export function Appear({
  children,
  index = 0,
  delay = 0,
  distance = 14,
  style,
}: {
  children: ReactNode;
  index?: number;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduced) {
      v.setValue(1);
      return;
    }
    const a = Animated.spring(v, { toValue: 1, delay: delay + Math.min(index, 6) * 70, damping: 18, stiffness: 160, mass: 0.9, useNativeDriver: native });
    a.start();
    return () => a.stop();
  }, [v, reduced, index, delay]);
  return (
    <Animated.View
      style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

/** A Pressable that gives a little under the finger, like a physical button. */
export function PressScale({
  children,
  style,
  scaleTo = 0.96,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & { children: ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const s = useState(() => new Animated.Value(1))[0];
  const to = (toValue: number) => Animated.spring(s, { toValue, damping: 15, stiffness: 320, useNativeDriver: native }).start();
  return (
    <Pressable
      {...props}
      onPressIn={(e) => {
        to(scaleTo);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        props.onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** A soft ring that breathes outwards, to draw the eye once without nagging. */
export function Pulse({ size, active, color = '#000' }: { size: number; active: boolean; color?: string }) {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!active || reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: native }),
        Animated.delay(600),
      ]),
      { iterations: 3 },
    );
    v.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [v, active, reduced]);
  if (!active || reduced) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
      }}
    />
  );
}
