import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';

// In-app validation (PRD §49), in the card style: a per-match thumbs row and the 1–5 credibility question.

export function MatchFeedback({ value, onChoose }: { value?: 'up' | 'down'; onChoose: (dir: 'up' | 'down') => void }) {
  return (
    <View style={styles.row}>
      {value ? (
        <Text style={styles.thanks}>Thanks, that helps improve matching.</Text>
      ) : (
        <>
          <Text style={styles.question}>Does this match feel right for you?</Text>
          <View style={styles.choices}>
            <Chip label="Yes" onPress={() => onChoose('up')} />
            <Chip label="Not really" onPress={() => onChoose('down')} />
          </View>
        </>
      )}
    </View>
  );
}

const SCALE: [number, string][] = [
  [1, 'Not at all'],
  [2, 'A little'],
  [3, 'Somewhat'],
  [4, 'Well'],
  [5, 'Very well'],
];

export function RatingCard({ value, onRate }: { value?: number; onRate: (n: number) => void }) {
  return (
    <View style={styles.card}>
      {value ? (
        <Text style={styles.thanksLarge}>Thanks for telling us.</Text>
      ) : (
        <>
          <Text style={styles.cardTitle}>How well do these clinicians seem to fit what you told us?</Text>
          <View style={styles.scale}>
            {SCALE.map(([n, label]) => (
              <Pressable
                key={n}
                onPress={() => onRate(n)}
                accessibilityRole="button"
                accessibilityLabel={`${n} out of 5, ${label}`}
                style={({ pressed }) => [styles.point, pressed && styles.pressed]}
              >
                <Text style={styles.pointNumber}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.ends}>
            <Text style={styles.endLabel}>Not at all</Text>
            <Text style={styles.endLabel}>Very well</Text>
          </View>
        </>
      )}
    </View>
  );
}

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
      <Text style={styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { marginHorizontal: 12, marginTop: 16, alignItems: 'center', gap: 10 },
  question: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  choices: { flexDirection: 'row', gap: 10 },
  chip: { backgroundColor: colors.chip, borderRadius: 150, paddingVertical: 12, paddingHorizontal: 20, minHeight: 44 },
  chipText: { fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  pressed: { backgroundColor: colors.line },
  thanks: { fontFamily: fonts.regular, fontSize: 14, color: colors.line, paddingVertical: 12 },
  card: { marginHorizontal: 12, marginTop: 20, borderRadius: 10, backgroundColor: colors.white, padding: 20 },
  cardTitle: { fontFamily: fonts.serifSemiBold, fontSize: 20, lineHeight: 26, color: colors.black, textAlign: 'center' },
  scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  point: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointNumber: { fontFamily: fonts.bold, fontSize: 17, color: colors.black },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  endLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.line },
  thanksLarge: { fontFamily: fonts.serifSemiBold, fontSize: 20, color: colors.black, textAlign: 'center' },
});
