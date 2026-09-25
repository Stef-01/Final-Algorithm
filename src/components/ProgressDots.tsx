import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors } from '@/lib/theme';
import { useReducedMotion } from './motion';

// Where you are in a short run of cards, without words: the current dot stretches into a pill.
export function ProgressDots({ count, index, label }: { count: number; index: number; label: string }) {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 1, max: count, now: index + 1 }}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} on={i === index} done={i < index} />
      ))}
    </View>
  );
}

function Dot({ on, done }: { on: boolean; done: boolean }) {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(on ? 1 : 0))[0];
  useEffect(() => {
    if (reduced) return v.setValue(on ? 1 : 0);
    Animated.spring(v, { toValue: on ? 1 : 0, damping: 14, stiffness: 200, useNativeDriver: false }).start();
  }, [on, v, reduced]);
  const width = v.interpolate({ inputRange: [0, 1], outputRange: [6, 18] });
  return <Animated.View style={[styles.dot, { width }, (on || done) && styles.filled]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 20 },
  dot: { height: 6, borderRadius: 3, backgroundColor: colors.chip },
  filled: { backgroundColor: colors.black },
});
