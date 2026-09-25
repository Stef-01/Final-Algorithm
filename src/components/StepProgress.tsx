import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors } from '@/lib/theme';
import { useReducedMotion } from './motion';

// How far through the search you are, as a bar that fills with a spring. It starts from wherever the
// last screen left it, so moving forward looks like progress, not a reload.

let last = 0;

export function StepProgress({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(last))[0];
  useEffect(() => {
    last = value;
    if (reduced) return v.setValue(value);
    const a = Animated.spring(v, { toValue: value, damping: 14, stiffness: 120, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [value, reduced, v]);
  const width = v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <Animated.View style={[styles.fill, { width }]}>
        <View style={styles.shine} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flex: 1, height: 14, borderRadius: 7, backgroundColor: colors.background, overflow: 'hidden' },
  fill: { height: 14, borderRadius: 7, backgroundColor: colors.purple, minWidth: 14 },
  // The light stripe along the top that makes the bar read as a solid thing.
  shine: { position: 'absolute', top: 3, left: 7, right: 7, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
});
