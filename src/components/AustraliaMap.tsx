import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { AREAS_NEAR, type AreaId } from '@/features/match/filters';
import { tap } from '@/lib/haptics';
import { colors, fonts } from '@/lib/theme';
import { Pulse, useReducedMotion } from './motion';

// A tappable map of Australia: one pin per area WATL knows. A simplified coastline (longitude,
// latitude), projected flat; good enough to find your city, not for navigation.

const W = 113; // west edge (longitude)
const E = 154.5;
const N = -10;
const S = -44;
const WIDTH = E - W;
const HEIGHT = N - S;

const MAINLAND: [number, number][] = [
  [129, -14.9], [130.1, -13], [131, -12.2], [132.6, -11.5], [134, -12], [135.9, -12.2], [136.9, -12.3], [136, -13.3],
  [135.5, -14.9], [137.8, -16.3], [139.3, -17.4], [140.8, -17.4], [141.6, -15], [141.6, -12.6], [142.5, -10.7],
  [143.5, -12.8], [143.6, -14.2], [145.3, -15], [145.4, -16.9], [146.3, -18.9], [148.8, -20.3], [150.2, -22.4],
  [151, -23.5], [153, -25.2], [153.6, -28.2], [153.1, -30.4], [152.5, -32.4], [151.2, -33.9], [150.2, -35.7],
  [149.9, -37.5], [147.7, -37.9], [146.3, -39.1], [144.9, -37.9], [143.5, -38.8], [141.6, -38.3], [140, -37.5],
  [139.6, -36.2], [138.1, -35.6], [138.5, -34.3], [137.8, -32.6], [137.4, -34], [136, -35], [135.2, -34.5],
  [134.2, -32.8], [131.2, -31.5], [128.9, -31.7], [126, -32.3], [123.6, -33.9], [119.9, -34], [117.9, -35.1],
  [115, -34.3], [115.7, -33.3], [115.7, -31.6], [114.9, -29.1], [113.4, -26.2], [113.8, -24.4], [113.6, -22],
  [114.6, -21.8], [116.7, -20.6], [118.8, -20.3], [121, -19.5], [122.3, -17.5], [123.6, -16.2], [125.2, -14.5],
  [126.9, -13.8], [128.1, -15],
];
const TASMANIA: [number, number][] = [
  [144.6, -40.7], [146.6, -41.1], [148.3, -40.9], [148.3, -42.1], [147.9, -43.2], [146.6, -43.6], [145.3, -42.2], [144.7, -41.2],
];

const x = (lng: number) => ((lng - W) / WIDTH) * 100;
const y = (lat: number) => ((N - lat) / HEIGHT) * 100;
const path = (pts: [number, number][]) => `M${pts.map(([lng, lat]) => `${x(lng).toFixed(2)},${y(lat).toFixed(2)}`).join('L')}Z`;
const D = path(MAINLAND) + path(TASMANIA);

export function AustraliaMap({ value, onChange }: { value: AreaId | null; onChange: (id: AreaId) => void }) {
  return (
    <View style={styles.wrap}>
      <Svg viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Path d={D} fill={colors.white} stroke={colors.line} strokeWidth={0.4} strokeLinejoin="round" />
      </Svg>
      {AREAS_NEAR.map((a) => (
        <Pin key={a.id} label={a.label} left={x(a.origin.lng)} top={y(a.origin.lat)} on={value === a.id} onPress={() => onChange(a.id)} />
      ))}
    </View>
  );
}

function Pin({ label, left, top, on, onPress }: { label: string; left: number; top: number; on: boolean; onPress: () => void }) {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(on ? 1 : 0))[0];
  useEffect(() => {
    if (reduced) return v.setValue(on ? 1 : 0);
    Animated.spring(v, { toValue: on ? 1 : 0, damping: 9, stiffness: 260, mass: 0.8, useNativeDriver: false }).start();
  }, [on, reduced, v]);
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.pin, { left: `${left}%`, top: `${top}%` }]}
    >
      <Pulse size={26} active={on} color={colors.purple} />
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: v.interpolate({ inputRange: [0, 1], outputRange: [colors.black, colors.purple] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.tag,
          {
            opacity: v, // the name shows on the chosen pin; the chips below list them all
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
          },
        ]}
      >
        <Text style={styles.tagText} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // A degree of longitude is ~0.9 of a degree of latitude this far south.
  wrap: { width: '100%', aspectRatio: (WIDTH / HEIGHT) * 0.9, marginTop: 8 },
  pin: { position: 'absolute', width: 44, height: 44, marginLeft: -22, marginTop: -22, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.white },
  tag: { position: 'absolute', top: 32, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: colors.purple },
  tagText: { fontFamily: fonts.bold, fontSize: 12, color: colors.white },
});
