import { StyleSheet, Text, View } from 'react-native';

import type { FitLabel as Fit } from '@/features/match/types';
import { colors, fonts } from '@/lib/theme';

// Same pill as the old "Just Joined" badge. The words carry the meaning, not the colour (PRD §46).
export function FitLabel({ fit }: { fit: Fit }) {
  const tone =
    fit === 'Strong fit' ? styles.strong : fit === 'Good fit' ? styles.good : fit === 'Worth considering' ? styles.consider : styles.possible;
  return (
    <View style={[styles.pill, tone]} accessibilityLabel={fit}>
      <Text style={[styles.text, (fit === 'Worth considering' || fit === 'Possible fit') && styles.textDark]}>{fit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', maxWidth: '100%', borderRadius: 30, paddingHorizontal: 10, paddingVertical: 4 },
  strong: { backgroundColor: colors.purple },
  good: { backgroundColor: colors.black },
  consider: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  possible: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.chip },
  text: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },
  textDark: { color: colors.black },
});
