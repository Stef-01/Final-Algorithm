import { ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

// Small motion kit on React Native's Animated (works on web and native, no extra bundle).
// Springs rather than linear tweens, short distances, and everything is skipped when the
// patient has asked their device to reduce motion.

const native = Platform.OS !== 'web';

// The last known setting, so screens mounted later start with it instead of animating first.
let known = false;

export function useReducedMotion() {
  const [reduced, setReduced] = useState(known);
  useEffect(() => {
    let alive = true;
    const set = (r: boolean) => {
      known = r;
      if (alive) setReduced(r);
    };
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(set)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', set);
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
  from = 'below',
  style,
}: {
  children: ReactNode;
  index?: number;
  delay?: number;
  distance?: number;
  /** Where it arrives from: below (lists, cards) or the right (the next match after a swipe). */
  from?: 'below' | 'right';
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
      style={[
        style,
        {
          opacity: v,
          transform: [
            from === 'right'
              ? { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }
              : { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A Pressable that gives a little under the finger, like a physical button. */
export function PressScale({
  children,
  style,
  containerStyle,
  scaleTo = 0.96,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Layout for the pressable itself (e.g. flex: 1 in a row); `style` is the visible part. */
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const s = useState(() => new Animated.Value(1))[0];
  const to = (toValue: number) => Animated.spring(s, { toValue, damping: 15, stiffness: 320, useNativeDriver: native }).start();
  return (
    <Pressable
      {...props}
      style={containerStyle}
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

/**
 * A chunky button that sits on a lip and pushes down into it when pressed, then springs back up
 * with a little overshoot: the tactile press from game-like apps, without the noise.
 */
export function PressDepth({
  children,
  style,
  containerStyle,
  lipColor = '#00000033',
  depth = 4,
  radius = 16,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  lipColor?: string;
  depth?: number;
  radius?: number;
}) {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(0))[0];
  const to = (toValue: number, bouncy = false) =>
    reduced
      ? v.setValue(toValue)
      : Animated.spring(v, { toValue, damping: bouncy ? 8 : 20, stiffness: bouncy ? 380 : 600, useNativeDriver: native }).start();
  return (
    <Pressable
      {...props}
      style={[{ paddingBottom: depth }, containerStyle]}
      onPressIn={(e) => {
        to(1);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(0, true);
        props.onPressOut?.(e);
      }}
    >
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: depth, borderRadius: radius, backgroundColor: props.disabled ? 'transparent' : lipColor }} />
      <Animated.View style={[{ borderRadius: radius }, style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, depth] }) }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/**
 * A one-off celebration: a ring and a spray of dots out from the centre, then gone. Put it behind
 * whatever just succeeded (a check, a heart). Changing `fire` replays it.
 */
export function Burst({ fire, size = 96, color = '#6B2D5C', count = 10 }: { fire: number; size?: number; color?: string; count?: number }) {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!fire || reduced) return;
    v.setValue(0);
    const a = Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: native });
    a.start();
    return () => a.stop();
  }, [fire, reduced, v]);
  if (!fire || reduced) return null;
  const fade = v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.8, 0] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: fade }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 0.6,
          height: size * 0.6,
          borderRadius: size,
          borderWidth: 3,
          borderColor: color,
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.7] }) }],
        }}
      />
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const r = size * (i % 2 ? 0.62 : 0.8);
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: i % 3 ? 7 : 10,
              height: i % 3 ? 7 : 10,
              borderRadius: 5,
              backgroundColor: color,
              transform: [
                { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * r] }) },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * r] }) },
                { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1.2, 0.4] }) },
              ],
            }}
          />
        );
      })}
    </Animated.View>
  );
}
