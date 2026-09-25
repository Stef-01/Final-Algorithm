import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Clinician, Match } from '@/features/match/types';
import { colors, fonts } from '@/lib/theme';
import { placeLine } from './ClinicianCards';
import { FitLabel } from './FitLabel';

// One clinician in the ranked "See all" list: photo, name, fit label, and the top reason (or areas).
export function MatchRow({ clinician: c, match, rank, onPress }: { clinician: Clinician; match: Match; rank: number; onPress: () => void }) {
  const top = match.reasons[0];
  const summary = top ? top.evidence : c.experiencedWith.slice(0, 3).join(' · ') || c.practiceStyle.slice(0, 2).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${rank}. ${c.name}, ${match.fit}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Image source={c.photo} style={styles.photo} contentFit="cover" accessibilityLabel="" accessibilityIgnoresInvertColors />
      <View style={styles.text}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {c.name}
          </Text>
          <FitLabel fit={match.fit} />
        </View>
        <Text style={styles.place} numberOfLines={1}>
          {placeLine(c)}
        </Text>
        {summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {summary}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  pressed: { backgroundColor: colors.background },
  photo: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.chip },
  text: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.black },
  place: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  summary: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.black },
});
