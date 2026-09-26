import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { getClinician } from '@/data/clinicians';
import { useRecent } from '@/features/match/recent';
import { useSession } from '@/features/match/session';
import { deckOf } from '@/features/match/sessionCore';
import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { Appear, PressScale } from './motion';

// Home's "pick up where you left off": your current matches, and the faces you last opened. Shows
// nothing at all until there's something to come back to.
export function PickUp() {
  const { state } = useSession();
  const recent = useRecent()
    .map((id) => getClinician(id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .slice(0, 5);
  const n = deckOf(state).length;
  if (!n && !recent.length) return null;
  return (
    <Appear style={styles.row}>
      {n ? (
        <PressScale onPress={() => router.push('/matches')} accessibilityRole="button" accessibilityLabel={`Back to your ${n} matches`} style={styles.pill} scaleTo={0.95}>
          <Text style={styles.pillText}>Your matches · {n}</Text>
          <Icon name="icRightArrow" size={12} color={colors.black} />
        </PressScale>
      ) : null}
      <View style={styles.faces}>
        {recent.map((c, i) => (
          <PressScale
            key={c.id}
            onPress={() => router.push(`/clinician/${c.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}, recently viewed`}
            style={[styles.face, i > 0 && styles.overlap]}
            scaleTo={0.9}
          >
            <Image source={c.photo} style={styles.photo} contentFit="cover" accessibilityLabel="" />
          </PressScale>
        ))}
      </View>
    </Appear>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.background },
  pillText: { fontFamily: fonts.bold, fontSize: 14, color: colors.black },
  faces: { flexDirection: 'row', marginLeft: 'auto' },
  face: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.white, overflow: 'hidden' },
  overlap: { marginLeft: -12 },
  photo: { width: '100%', height: '100%' },
});
