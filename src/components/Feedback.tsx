import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { Appear, Burst, PressDepth } from './motion';

// In-app validation (PRD §49), in the card style: the 1–5 credibility question. (Per-match thumbs come
// from swiping: right is yes, left is no.)

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
        <Appear style={styles.done}>
          <View style={styles.doneMark}>
            <Burst fire={1} size={110} />
            <View style={styles.doneCheck}>
              <Icon name="icCheck" size={22} color={colors.white} />
            </View>
          </View>
          <Text style={styles.thanksLarge}>Thanks for telling us.</Text>
        </Appear>
      ) : (
        <>
          <Text style={styles.cardTitle}>How well do these clinicians seem to fit what you told us?</Text>
          <View style={styles.scale}>
            {SCALE.map(([n, label]) => (
              <PressDepth
                key={n}
                onPress={() => onRate(n)}
                accessibilityRole="button"
                accessibilityLabel={`${n} out of 5, ${label}`}
                radius={24}
                lipColor={colors.line}
                style={styles.point}
              >
                <Text style={styles.pointNumber}>{n}</Text>
              </PressDepth>
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

const styles = StyleSheet.create({
  row: { marginHorizontal: 12, marginTop: 16, alignItems: 'center', gap: 10 },
  question: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  choices: { flexDirection: 'row', gap: 10 },
  chip: { backgroundColor: colors.chip, borderRadius: 150, paddingVertical: 12, paddingHorizontal: 20, minHeight: 44 },
  chipText: { fontFamily: fonts.medium, fontSize: 16, color: colors.black },
  thanks: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, paddingVertical: 12 },
  done: { alignItems: 'center', gap: 14, paddingVertical: 6 },
  doneMark: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  doneCheck: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  card: { marginHorizontal: 12, marginTop: 20, borderRadius: 16, backgroundColor: colors.white, padding: 20 },
  cardTitle: { fontFamily: fonts.serifSemiBold, fontSize: 22, lineHeight: 26, color: colors.black, textAlign: 'center' },
  scale: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, justifyContent: 'space-between', marginTop: 18 }, // wraps at large text sizes
  point: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointNumber: { fontFamily: fonts.bold, fontSize: 18, color: colors.black },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  endLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  thanksLarge: { fontFamily: fonts.serifSemiBold, fontSize: 22, color: colors.black, textAlign: 'center' },
});
