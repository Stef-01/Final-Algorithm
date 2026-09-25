import { StyleSheet, Text, View } from 'react-native';

import type { FitLabel as Fit } from '@/features/match/types';
import { colors, fonts } from '@/lib/theme';

// Same pill as the old "Just Joined" badge. The words carry the meaning, not the colour (PRD §46).
export function FitLabel({ fit }: { fit: Fit }) {
  const tone = fit === 'Strong fit' ? styles.strong : fit === 'Good fit' ? styles.good : styles.consider;
  return (
    <View style={[styles.pill, tone]} accessibilityLabel={fit}>
      <Text style={[styles.text, fit === 'Worth considering' && styles.textDark]}>{fit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderRadius: 30, paddingHorizontal: 10, paddingVertical: 4 },
  strong: { backgroundColor: colors.purple },
  good: { backgroundColor: colors.black },
  consider: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  text: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },
  textDark: { color: colors.black },
});
